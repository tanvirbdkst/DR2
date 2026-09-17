<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use Exception;
use PDO;

class Appointment
{
    /**
     * Concurrency-safe atomic appointment booking with double-booking prevention
     */
    public static function book(array $data): array
    {
        $db = Database::getConnection();

        $doctorId = (int)$data['doctor_id'];
        $chamberId = (int)$data['chamber_id'];
        $scheduleDate = $data['schedule_date'];
        $serialNumber = (int)$data['serial_number'];
        $patientName = trim($data['patient_name']);
        $patientPhone = trim($data['patient_phone']);
        $patientAge = (int)($data['patient_age'] ?? 25);
        $patientGender = $data['patient_gender'] ?? 'male';
        $problem = $data['problem_description'] ?? '';
        $patientUserId = !empty($data['patient_user_id']) ? (int)$data['patient_user_id'] : null;

        // 1. Validate Doctor
        $docStmt = $db->prepare("
            SELECT d.*, u.name as doctor_name
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            WHERE d.id = ? AND d.approval_status = 'approved'
        ");
        $docStmt->execute([$doctorId]);
        $doctor = $docStmt->fetch();
        if (!$doctor) {
            throw new Exception("Doctor not found or not approved for bookings.");
        }

        // 2. Validate Chamber
        $chamStmt = $db->prepare("SELECT * FROM chambers WHERE id = ? AND doctor_id = ?");
        $chamStmt->execute([$chamberId, $doctorId]);
        $chamber = $chamStmt->fetch();
        if (!$chamber) {
            throw new Exception("Invalid chamber selected for this doctor.");
        }

        // 3. Validate Day of week and active schedule
        $timestamp = strtotime($scheduleDate);
        if (!$timestamp) {
            throw new Exception("Invalid schedule date provided.");
        }
        $dayOfWeek = date('l', $timestamp);

        $schedStmt = $db->prepare("
            SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
            FROM doctor_schedules s
            JOIN doctors d ON s.doctor_id = d.id
            LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
            WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
        ");
        $schedStmt->execute([$doctorId, $chamberId, $dayOfWeek]);
        $schedule = $schedStmt->fetch();
        if (!$schedule) {
            throw new Exception("No consultation schedule found for {$dayOfWeek} at {$chamber['name']}.");
        }

        if ($serialNumber < 1 || $serialNumber > $schedule['max_serials']) {
            throw new Exception("Serial number must be between 1 and {$schedule['max_serials']}.");
        }

        // Calculate appointment time
        [$startH, $startM] = explode(':', $schedule['start_time']);
        $slotDuration = (int)($schedule['slot_duration_minutes'] ?: 10);
        $totalMinutes = ((int)$startH * 60 + (int)$startM) + ($serialNumber - 1) * $slotDuration;
        $slotHour24 = (int)floor($totalMinutes / 60) % 24;
        $slotMin = $totalMinutes % 60;
        $ampm = $slotHour24 >= 12 ? 'PM' : 'AM';
        $slotHour12 = $slotHour24 % 12 ?: 12;
        $appointmentTime = sprintf('%02d:%02d %s', $slotHour12, $slotMin, $ampm);

        $cleanDate = str_replace('-', '', $scheduleDate);
        $serialPad = str_pad((string)$serialNumber, 5, '0', STR_PAD_LEFT);
        $appointmentId = "DS-{$cleanDate}-{$serialPad}";

        // Concurrency-Safe Transaction
        $db->beginTransaction();
        try {
            // Check if active appointment already has this slot
            $lockStmt = $db->prepare("
                SELECT id FROM appointments
                WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status != 'cancelled'
                FOR UPDATE
            ");
            $lockStmt->execute([$doctorId, $chamberId, $scheduleDate, $serialNumber]);
            if ($lockStmt->fetch()) {
                throw new Exception("This serial slot (#{$serialNumber}) has just been taken by another patient. Please pick an available serial.");
            }

            // Lock or create entry in serials table
            $serLockStmt = $db->prepare("
                SELECT id FROM serials
                WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
                FOR UPDATE
            ");
            $serLockStmt->execute([$doctorId, $chamberId, $scheduleDate, $serialNumber]);
            $existingSerial = $serLockStmt->fetch();

            if ($existingSerial) {
                $updSerStmt = $db->prepare("UPDATE serials SET status = 'booked' WHERE id = ?");
                $updSerStmt->execute([$existingSerial['id']]);
            } else {
                $insSerStmt = $db->prepare("
                    INSERT INTO serials (schedule_id, doctor_id, chamber_id, schedule_date, serial_number, status)
                    VALUES (?, ?, ?, ?, ?, 'booked')
                ");
                $insSerStmt->execute([$schedule['id'], $doctorId, $chamberId, $scheduleDate, $serialNumber]);
            }

            // Check if appointment ID already exists, if so append random suffix
            $checkIdStmt = $db->prepare("SELECT id FROM appointments WHERE appointment_id = ?");
            $checkIdStmt->execute([$appointmentId]);
            if ($checkIdStmt->fetch()) {
                $appointmentId .= '-' . mt_rand(100, 999);
            }

            // Insert confirmed appointment
            $fee = (float)$schedule['fee'];
            $insApptStmt = $db->prepare("
                INSERT INTO appointments (
                    appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
                    schedule_date, serial_number, appointment_time,
                    patient_name, patient_phone, patient_age, patient_gender,
                    problem_description, fee, payment_status, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'confirmed')
            ");
            $insApptStmt->execute([
                $appointmentId,
                $patientUserId,
                $doctorId,
                $chamberId,
                $schedule['id'],
                $scheduleDate,
                $serialNumber,
                $appointmentTime,
                $patientName,
                $patientPhone,
                $patientAge,
                $patientGender,
                $problem,
                $fee,
            ]);
            $insertedId = (int)$db->lastInsertId();

            $db->commit();

            return [
                'id' => $insertedId,
                'appointment_id' => $appointmentId,
                'serial_number' => $serialNumber,
                'schedule_date' => $scheduleDate,
                'appointment_time' => $appointmentTime,
                'fee' => $fee,
                'doctor_name' => $doctor['doctor_name'],
                'chamber_name' => $chamber['name'],
                'chamber_address' => $chamber['address'],
                'patient_name' => $patientName,
            ];
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    public static function findById(int $id): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT a.*, d.title as doctor_title, u.name as doctor_name, u.phone as doctor_phone, u.email as doctor_email,
                   d.qualification as doctor_qualification, d.bmdc_number,
                   s.name as specialty_name, s.name_bn as specialty_name_bn,
                   c.name as chamber_name, c.address as chamber_address, c.area as chamber_area, c.city as chamber_city, c.phone as chamber_phone
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            JOIN chambers c ON a.chamber_id = c.id
            WHERE a.id = ? LIMIT 1
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findByAppointmentId(string $appointmentId): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT a.*, d.title as doctor_title, u.name as doctor_name, u.phone as doctor_phone,
                   d.qualification as doctor_qualification, d.bmdc_number,
                   s.name as specialty_name, s.name_bn as specialty_name_bn,
                   c.name as chamber_name, c.address as chamber_address, c.area as chamber_area, c.city as chamber_city
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            JOIN chambers c ON a.chamber_id = c.id
            WHERE a.appointment_id = ? LIMIT 1
        ");
        $stmt->execute([$appointmentId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function getPatientAppointments(int $patientUserId): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT a.*, d.title as doctor_title, u.name as doctor_name, u.phone as doctor_phone,
                   s.name as specialty_name, s.name_bn as specialty_name_bn,
                   c.name as chamber_name, c.address as chamber_address, c.area as chamber_area, c.city as chamber_city,
                   r.rating as patient_rating, r.review_text as patient_review
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            JOIN chambers c ON a.chamber_id = c.id
            LEFT JOIN reviews r ON r.appointment_id = a.id
            WHERE a.patient_id = ?
            ORDER BY a.schedule_date DESC, a.serial_number ASC
        ");
        $stmt->execute([$patientUserId]);
        return $stmt->fetchAll();
    }

    public static function getDoctorAppointments(int $doctorId, ?string $date = null, ?string $status = null, ?int $chamberId = null): array
    {
        $db = Database::getConnection();
        $sql = "
            SELECT a.*, c.name as chamber_name, c.address as chamber_address, c.area as chamber_area
            FROM appointments a
            JOIN chambers c ON a.chamber_id = c.id
            WHERE a.doctor_id = ?
        ";
        $params = [$doctorId];

        if ($date === 'today') {
            $sql .= " AND a.schedule_date = CURDATE()";
        } elseif (!empty($date) && $date !== 'all') {
            $sql .= " AND a.schedule_date = ?";
            $params[] = $date;
        }

        if (!empty($status) && $status !== 'all') {
            $sql .= " AND a.status = ?";
            $params[] = $status;
        }

        if (!empty($chamberId)) {
            $sql .= " AND a.chamber_id = ?";
            $params[] = $chamberId;
        }

        $sql .= " ORDER BY a.schedule_date ASC, a.serial_number ASC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function updateStatus(int $appointmentId, string $status, ?string $notes = null): bool
    {
        $validStatuses = ['confirmed', 'waiting', 'called', 'in_consultation', 'completed', 'cancelled', 'no_show'];
        if (!in_array($status, $validStatuses, true)) {
            return false;
        }

        $db = Database::getConnection();
        try {
            $db->beginTransaction();

            $stmt = $db->prepare("SELECT * FROM appointments WHERE id = ? FOR UPDATE");
            $stmt->execute([$appointmentId]);
            $appt = $stmt->fetch();
            if (!$appt) {
                $db->rollBack();
                return false;
            }

            if ($notes !== null) {
                $upd = $db->prepare("UPDATE appointments SET status = ?, doctor_notes = ? WHERE id = ?");
                $upd->execute([$status, $notes, $appointmentId]);
            } else {
                $upd = $db->prepare("UPDATE appointments SET status = ? WHERE id = ?");
                $upd->execute([$status, $appointmentId]);
            }

            // If cancelled, release serial slot
            if ($status === 'cancelled') {
                $relStmt = $db->prepare("
                    UPDATE serials SET status = 'available'
                    WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
                ");
                $relStmt->execute([$appt['doctor_id'], $appt['chamber_id'], $appt['schedule_date'], $appt['serial_number']]);
            }

            $db->commit();
            return true;
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("Failed to update appointment status: " . $e->getMessage());
            return false;
        }
    }

    public static function cancelByPatient(int $appointmentId, int $patientUserId, ?string $reason = null): bool
    {
        $db = Database::getConnection();
        try {
            $db->beginTransaction();

            $stmt = $db->prepare("SELECT * FROM appointments WHERE id = ? AND patient_id = ? FOR UPDATE");
            $stmt->execute([$appointmentId, $patientUserId]);
            $appt = $stmt->fetch();
            if (!$appt || in_array($appt['status'], ['completed', 'cancelled'], true)) {
                $db->rollBack();
                return false;
            }

            $cancelStmt = $db->prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?");
            $cancelStmt->execute([$appointmentId]);

            // Release serial slot in serials table
            $relStmt = $db->prepare("
                UPDATE serials SET status = 'available'
                WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
            ");
            $relStmt->execute([$appt['doctor_id'], $appt['chamber_id'], $appt['schedule_date'], $appt['serial_number']]);

            $db->commit();
            return true;
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("Failed to cancel appointment: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Call Next Patient Queue Logic
     * Moves current 'in_consultation' or 'called' to 'completed' (if requested),
     * and picks the earliest waiting/confirmed serial and marks it 'called'.
     */
    public static function callNextPatient(int $doctorId, int $chamberId, string $date): ?array
    {
        $db = Database::getConnection();
        try {
            $db->beginTransaction();

            // Find any currently called and move to in_consultation
            $calledStmt = $db->prepare("
                SELECT id FROM appointments
                WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status = 'called'
                ORDER BY serial_number ASC LIMIT 1
                FOR UPDATE
            ");
            $calledStmt->execute([$doctorId, $chamberId, $date]);
            $called = $calledStmt->fetch();

            if ($called) {
                // Advance currently called to in_consultation
                $db->prepare("UPDATE appointments SET status = 'in_consultation' WHERE id = ?")->execute([$called['id']]);
                
                $db->commit();
                return self::findById((int)$called['id']);
            }

            // Next, find first waiting or confirmed patient
            $nextStmt = $db->prepare("
                SELECT id, serial_number, patient_name, patient_phone FROM appointments
                WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status IN ('waiting', 'confirmed')
                ORDER BY serial_number ASC LIMIT 1
                FOR UPDATE
            ");
            $nextStmt->execute([$doctorId, $chamberId, $date]);
            $next = $nextStmt->fetch();

            if (!$next) {
                $db->rollBack();
                return null; // No one left in queue
            }

            // Set to 'called'
            $db->prepare("UPDATE appointments SET status = 'called' WHERE id = ?")->execute([$next['id']]);

            $db->commit();
            return self::findById((int)$next['id']);
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("callNextPatient error: " . $e->getMessage());
            return null;
        }
    }

    public static function getQueueStatus(int $doctorId, int $chamberId, string $date, ?int $mySerial = null): array
    {
        $db = Database::getConnection();

        // Currently in consultation
        $servingStmt = $db->prepare("
            SELECT serial_number, patient_name, status FROM appointments
            WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status = 'in_consultation'
            ORDER BY serial_number DESC LIMIT 1
        ");
        $servingStmt->execute([$doctorId, $chamberId, $date]);
        $serving = $servingStmt->fetch();

        // Currently called (ready at door)
        $calledStmt = $db->prepare("
            SELECT serial_number, patient_name FROM appointments
            WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status = 'called'
            ORDER BY serial_number ASC LIMIT 1
        ");
        $calledStmt->execute([$doctorId, $chamberId, $date]);
        $called = $calledStmt->fetch();

        // Next in line waiting
        $nextStmt = $db->prepare("
            SELECT serial_number, patient_name FROM appointments
            WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status IN ('waiting', 'confirmed')
            ORDER BY serial_number ASC LIMIT 1
        ");
        $nextStmt->execute([$doctorId, $chamberId, $date]);
        $next = $nextStmt->fetch();

        // List of all waiting serials
        $waitingStmt = $db->prepare("
            SELECT serial_number FROM appointments
            WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status IN ('waiting', 'confirmed', 'called')
            ORDER BY serial_number ASC
        ");
        $waitingStmt->execute([$doctorId, $chamberId, $date]);
        $waitingList = $waitingStmt->fetchAll(PDO::FETCH_COLUMN);

        $aheadCount = 0;
        if ($mySerial !== null) {
            $aheadStmt = $db->prepare("
                SELECT COUNT(*) FROM appointments
                WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ?
                  AND serial_number < ?
                  AND status IN ('confirmed', 'waiting', 'called', 'in_consultation')
            ");
            $aheadStmt->execute([$doctorId, $chamberId, $date, $mySerial]);
            $aheadCount = (int)$aheadStmt->fetchColumn();
        }

        // Summary counts
        $countsStmt = $db->prepare("
            SELECT status, COUNT(*) as cnt FROM appointments
            WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ?
            GROUP BY status
        ");
        $countsStmt->execute([$doctorId, $chamberId, $date]);
        $statusCounts = $countsStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        return [
            'now_serving' => $serving ? (int)$serving['serial_number'] : null,
            'serving_patient' => $serving ? $serving['patient_name'] : null,
            'called_serial' => $called ? (int)$called['serial_number'] : null,
            'next_in_line' => $next ? (int)$next['serial_number'] : null,
            'waiting_serials' => array_map('intval', $waitingList),
            'ahead_of_me' => $aheadCount,
            'waiting_count' => (int)($statusCounts['waiting'] ?? 0),
            'in_consultation_count' => (int)($statusCounts['in_consultation'] ?? 0),
            'completed_count' => (int)($statusCounts['completed'] ?? 0),
            'total_today' => array_sum($statusCounts),
        ];
    }

    public static function getAllAppointmentsForAdmin(array $filters = []): array
    {
        $db = Database::getConnection();
        $sql = "
            SELECT a.*, d.title as doctor_title, u.name as doctor_name,
                   c.name as chamber_name, c.area as chamber_area, c.city as chamber_city
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            JOIN chambers c ON a.chamber_id = c.id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($filters['date'])) {
            $sql .= " AND a.schedule_date = ?";
            $params[] = $filters['date'];
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $sql .= " AND a.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['doctor_id']) && $filters['doctor_id'] !== 'all') {
            $sql .= " AND a.doctor_id = ?";
            $params[] = (int)$filters['doctor_id'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (a.patient_name LIKE ? OR a.patient_phone LIKE ? OR a.appointment_id LIKE ?)";
            $term = "%" . trim($filters['search']) . "%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= " ORDER BY a.schedule_date DESC, a.serial_number ASC LIMIT 200";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
