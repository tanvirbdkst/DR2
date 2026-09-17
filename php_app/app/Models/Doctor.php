<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

class Doctor
{
    public static function findByUserId(int $userId): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url, u.status as user_status,
                   s.name as specialty_name, s.name_bn as specialty_name_bn
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE d.user_id = ? LIMIT 1
        ");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findById(int $id): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url, u.status as user_status,
                   s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE d.id = ? LIMIT 1
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function getApprovedDoctors(array $filters = []): array
    {
        $db = Database::getConnection();
        $sql = "
            SELECT d.id, d.title, d.bmdc_number, d.qualification, d.experience_years, d.bio, d.consultation_fee,
                   u.name, u.email, u.phone, u.avatar_url,
                   s.id as specialty_id, s.name as specialty_name, s.name_bn as specialty_name_bn,
                   GROUP_CONCAT(DISTINCT CONCAT(c.name, ' (', c.area, ', ', c.city, ')') SEPARATOR ', ') as chambers_summary,
                   GROUP_CONCAT(DISTINCT c.city SEPARATOR ', ') as cities,
                   GROUP_CONCAT(DISTINCT ds.day_of_week SEPARATOR ', ') as available_days,
                   COALESCE(AVG(r.rating), 5.0) as average_rating,
                   COUNT(DISTINCT r.id) as total_reviews
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            LEFT JOIN chambers c ON c.doctor_id = d.id
            LEFT JOIN doctor_schedules ds ON ds.doctor_id = d.id AND ds.is_active = 1
            LEFT JOIN reviews r ON r.doctor_id = d.id AND r.is_approved = 1
            WHERE d.approval_status = 'approved' AND u.status = 'active'
        ";
        $params = [];

        if (!empty($filters['search'])) {
            $sql .= " AND (u.name LIKE ? OR d.qualification LIKE ? OR d.bio LIKE ? OR s.name LIKE ? OR s.name_bn LIKE ?)";
            $term = "%" . trim($filters['search']) . "%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        if (!empty($filters['specialty']) && $filters['specialty'] !== 'all') {
            $sql .= " AND (s.slug = ? OR s.id = ?)";
            $params[] = $filters['specialty'];
            $params[] = (int)$filters['specialty'];
        }

        if (!empty($filters['location'])) {
            $sql .= " AND (c.city LIKE ? OR c.area LIKE ? OR c.address LIKE ?)";
            $loc = "%" . trim($filters['location']) . "%";
            $params[] = $loc;
            $params[] = $loc;
            $params[] = $loc;
        }

        $sql .= " GROUP BY d.id, u.id, s.id ORDER BY d.experience_years DESC, d.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function updateProfile(int $doctorId, array $data): bool
    {
        $db = Database::getConnection();
        try {
            $db->beginTransaction();

            $stmtDoc = $db->prepare("
                UPDATE doctors
                SET title = ?, specialty_id = ?, qualification = ?, experience_years = ?, bio = ?, consultation_fee = ?
                WHERE id = ?
            ");
            $stmtDoc->execute([
                $data['title'] ?? 'Dr.',
                !empty($data['specialty_id']) ? (int)$data['specialty_id'] : null,
                $data['qualification'] ?? '',
                (int)($data['experience_years'] ?? 0),
                $data['bio'] ?? '',
                (float)($data['consultation_fee'] ?? 500.00),
                $doctorId
            ]);

            // Update user's name & phone if provided
            if (isset($data['user_id'])) {
                $stmtUser = $db->prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?");
                $stmtUser->execute([$data['name'], $data['phone'], $data['user_id']]);
            }

            $db->commit();
            return true;
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("Failed to update doctor profile: " . $e->getMessage());
            return false;
        }
    }

    public static function getChambers(int $doctorId): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT c.*, COALESCE(dc.consultation_fee, d.consultation_fee) as consultation_fee, dc.follow_up_fee,
                   h.name as hospital_name
            FROM chambers c
            JOIN doctors d ON c.doctor_id = d.id
            LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
            LEFT JOIN hospitals h ON c.hospital_id = h.id
            WHERE c.doctor_id = ?
            ORDER BY c.created_at ASC
        ");
        $stmt->execute([$doctorId]);
        return $stmt->fetchAll();
    }

    public static function getChamberById(int $chamberId, ?int $doctorId = null): ?array
    {
        $db = Database::getConnection();
        $sql = "SELECT c.*, COALESCE(dc.consultation_fee, d.consultation_fee) as consultation_fee, dc.follow_up_fee 
                FROM chambers c
                JOIN doctors d ON c.doctor_id = d.id
                LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
                WHERE c.id = ?";
        $params = [$chamberId];
        if ($doctorId !== null) {
            $sql .= " AND c.doctor_id = ?";
            $params[] = $doctorId;
        }
        $sql .= " LIMIT 1";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public static function createChamber(array $data): int
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO chambers (doctor_id, hospital_id, name, address, city, area, phone, map_location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['doctor_id'],
            !empty($data['hospital_id']) ? (int)$data['hospital_id'] : null,
            $data['name'],
            $data['address'],
            $data['city'] ?? 'Dhaka',
            $data['area'],
            $data['phone'] ?? null,
            $data['map_location'] ?? null,
        ]);
        $chamberId = (int)$db->lastInsertId();

        // Also record in doctor_chambers for custom fee
        $stmtFee = $db->prepare("
            INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE consultation_fee = VALUES(consultation_fee), follow_up_fee = VALUES(follow_up_fee)
        ");
        $stmtFee->execute([
            $data['doctor_id'],
            $chamberId,
            (float)($data['consultation_fee'] ?? 500.00),
            (float)($data['follow_up_fee'] ?? 300.00)
        ]);

        return $chamberId;
    }

    public static function updateChamber(int $chamberId, int $doctorId, array $data): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE chambers
            SET name = ?, address = ?, city = ?, area = ?, phone = ?, hospital_id = ?
            WHERE id = ? AND doctor_id = ?
        ");
        $ok = $stmt->execute([
            $data['name'],
            $data['address'],
            $data['city'] ?? 'Dhaka',
            $data['area'],
            $data['phone'] ?? null,
            !empty($data['hospital_id']) ? (int)$data['hospital_id'] : null,
            $chamberId,
            $doctorId
        ]);

        if ($ok && isset($data['consultation_fee'])) {
            $stmtFee = $db->prepare("
                INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE consultation_fee = VALUES(consultation_fee), follow_up_fee = VALUES(follow_up_fee)
            ");
            $stmtFee->execute([
                $doctorId,
                $chamberId,
                (float)$data['consultation_fee'],
                (float)($data['follow_up_fee'] ?? 300.00)
            ]);
        }

        return $ok;
    }

    public static function deleteChamber(int $chamberId, int $doctorId): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM chambers WHERE id = ? AND doctor_id = ?");
        return $stmt->execute([$chamberId, $doctorId]);
    }

    public static function getSchedules(int $doctorId, ?int $chamberId = null): array
    {
        $db = Database::getConnection();
        $sql = "
            SELECT s.*, c.name as chamber_name, c.area as chamber_area
            FROM doctor_schedules s
            JOIN chambers c ON s.chamber_id = c.id
            WHERE s.doctor_id = ? AND s.is_active = 1
        ";
        $params = [$doctorId];

        if ($chamberId !== null) {
            $sql .= " AND s.chamber_id = ?";
            $params[] = $chamberId;
        }

        $sql .= " ORDER BY FIELD(s.day_of_week, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), s.start_time ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function createSchedule(array $data): int
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO doctor_schedules (doctor_id, chamber_id, day_of_week, start_time, end_time, max_serials, slot_duration_minutes, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([
            $data['doctor_id'],
            $data['chamber_id'],
            $data['day_of_week'],
            $data['start_time'],
            $data['end_time'],
            (int)$data['max_serials'],
            (int)($data['slot_duration_minutes'] ?? 10)
        ]);
        return (int)$db->lastInsertId();
    }

    public static function deleteSchedule(int $scheduleId, int $doctorId): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM doctor_schedules WHERE id = ? AND doctor_id = ?");
        return $stmt->execute([$scheduleId, $doctorId]);
    }

    public static function getDoctorPatients(int $doctorId, ?string $search = null): array
    {
        $db = Database::getConnection();
        $sql = "
            SELECT a.patient_phone, a.patient_name, a.patient_gender, a.patient_age,
                   MAX(a.schedule_date) as last_visit_date,
                   COUNT(a.id) as total_visits,
                   MAX(a.id) as last_appointment_id,
                   GROUP_CONCAT(DISTINCT a.problem_description SEPARATOR ' | ') as problems_summary
            FROM appointments a
            WHERE a.doctor_id = ?
        ";
        $params = [$doctorId];

        if ($search) {
            $sql .= " AND (a.patient_name LIKE ? OR a.patient_phone LIKE ?)";
            $term = "%{$search}%";
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= " GROUP BY a.patient_phone, a.patient_name, a.patient_gender, a.patient_age ORDER BY last_visit_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function getAllDoctorsForAdmin(string $statusFilter = 'all'): array
    {
        $db = Database::getConnection();
        $sql = "
            SELECT d.*, u.name, u.email, u.phone, u.status as user_status, u.created_at as registered_at,
                   s.name as specialty_name, s.name_bn as specialty_name_bn,
                   (SELECT COUNT(*) FROM chambers c WHERE c.doctor_id = d.id) as chamber_count,
                   (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id) as total_appointments
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
        ";
        $params = [];

        if ($statusFilter !== 'all') {
            $sql .= " WHERE d.approval_status = ?";
            $params[] = $statusFilter;
        }

        $sql .= " ORDER BY d.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function updateApprovalStatus(int $doctorId, string $status, ?string $reason = null): bool
    {
        $db = Database::getConnection();
        $approvedAt = ($status === 'approved') ? date('Y-m-d H:i:s') : null;
        $stmt = $db->prepare("
            UPDATE doctors
            SET approval_status = ?, rejection_reason = ?, approved_at = ?
            WHERE id = ?
        ");
        return $stmt->execute([$status, $reason, $approvedAt, $doctorId]);
    }

    public static function getDoctorReviews(int $doctorId): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT r.*, u.name as patient_name
            FROM reviews r
            JOIN users u ON r.patient_id = u.id
            WHERE r.doctor_id = ? AND r.is_approved = 1
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([$doctorId]);
        return $stmt->fetchAll();
    }
}
