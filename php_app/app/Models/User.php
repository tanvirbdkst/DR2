<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

class User
{
    public static function findByEmail(string $email): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findById(int $id): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(array $data): int
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO users (name, email, phone, password_hash, role, status, avatar_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $data['email'],
            $data['phone'],
            password_hash($data['password'], PASSWORD_BCRYPT),
            $data['role'] ?? 'patient',
            $data['status'] ?? 'active',
            $data['avatar_url'] ?? null,
        ]);
        return (int)$db->lastInsertId();
    }

    public static function getPatientProfile(int $userId): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.avatar_url, u.created_at,
                   p.blood_group, p.date_of_birth, p.gender, p.address, p.emergency_contact
            FROM users u
            LEFT JOIN patients p ON p.user_id = u.id
            WHERE u.id = ? LIMIT 1
        ");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function updatePatientProfile(int $userId, array $data): bool
    {
        $db = Database::getConnection();
        try {
            $db->beginTransaction();

            $stmt1 = $db->prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?");
            $stmt1->execute([$data['name'], $data['phone'], $userId]);

            // Check if row in patients exists
            $stmtCheck = $db->prepare("SELECT id FROM patients WHERE user_id = ?");
            $stmtCheck->execute([$userId]);
            $exists = $stmtCheck->fetchColumn();

            if ($exists) {
                $stmt2 = $db->prepare("
                    UPDATE patients 
                    SET blood_group = ?, date_of_birth = ?, gender = ?, address = ?, emergency_contact = ?
                    WHERE user_id = ?
                ");
                $stmt2->execute([
                    $data['blood_group'] ?? null,
                    !empty($data['date_of_birth']) ? $data['date_of_birth'] : null,
                    $data['gender'] ?? null,
                    $data['address'] ?? null,
                    $data['emergency_contact'] ?? null,
                    $userId
                ]);
            } else {
                $stmt2 = $db->prepare("
                    INSERT INTO patients (user_id, blood_group, date_of_birth, gender, address, emergency_contact)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt2->execute([
                    $userId,
                    $data['blood_group'] ?? null,
                    !empty($data['date_of_birth']) ? $data['date_of_birth'] : null,
                    $data['gender'] ?? null,
                    $data['address'] ?? null,
                    $data['emergency_contact'] ?? null,
                ]);
            }

            $db->commit();
            return true;
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("Failed to update patient profile: " . $e->getMessage());
            return false;
        }
    }

    public static function updatePassword(int $userId, string $newPassword): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        return $stmt->execute([password_hash($newPassword, PASSWORD_BCRYPT), $userId]);
    }

    public static function getAllPatients(?string $search = null, ?string $status = null): array
    {
        $db = Database::getConnection();
        $sql = "
            SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
                   p.blood_group, p.gender, p.address,
                   (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = u.id) as total_appointments
            FROM users u
            LEFT JOIN patients p ON p.user_id = u.id
            WHERE u.role = 'patient'
        ";
        $params = [];

        if ($search) {
            $sql .= " AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)";
            $term = "%{$search}%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        if ($status && in_array($status, ['active', 'suspended'])) {
            $sql .= " AND u.status = ?";
            $params[] = $status;
        }

        $sql .= " ORDER BY u.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function updateStatus(int $userId, string $status): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET status = ? WHERE id = ?");
        return $stmt->execute([$status, $userId]);
    }

    public static function logActivity(?int $userId, string $action, string $details = '', ?string $ip = null): void
    {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $action, $details, $ip ?? $_SERVER['REMOTE_ADDR'] ?? null]);
        } catch (\Throwable $e) {
            error_log("Failed to log activity: " . $e->getMessage());
        }
    }
}
