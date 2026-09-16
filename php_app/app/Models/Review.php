<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

class Review
{
    public static function create(array $data): bool
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("
                INSERT INTO reviews (appointment_id, doctor_id, patient_id, rating, review_text, is_approved)
                VALUES (?, ?, ?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text), updated_at = CURRENT_TIMESTAMP
            ");
            return $stmt->execute([
                $data['appointment_id'],
                $data['doctor_id'],
                $data['patient_id'],
                (int)$data['rating'],
                $data['review_text'] ?? null,
            ]);
        } catch (\Throwable $e) {
            error_log("Failed to submit review: " . $e->getMessage());
            return false;
        }
    }

    public static function getAllForAdmin(): array
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->query("
                SELECT r.*, u_doc.name as doctor_name, u_pat.name as patient_name, u_pat.phone as patient_phone,
                       a.appointment_id as appointment_code
                FROM reviews r
                JOIN doctors d ON r.doctor_id = d.id
                JOIN users u_doc ON d.user_id = u_doc.id
                JOIN users u_pat ON r.patient_id = u_pat.id
                JOIN appointments a ON r.appointment_id = a.id
                ORDER BY r.created_at DESC
            ");
            return $stmt->fetchAll();
        } catch (\Throwable $e) {
            return [];
        }
    }

    public static function toggleApproval(int $id, int $status): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE reviews SET is_approved = ? WHERE id = ?");
        return $stmt->execute([$status, $id]);
    }

    public static function delete(int $id): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM reviews WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public static function getRecentApproved(int $limit = 6): array
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("
                SELECT r.*, u.name as patient_name, d.title as doctor_title, u_doc.name as doctor_name,
                       s.name_bn as specialty_bn, s.name as specialty_name
                FROM reviews r
                JOIN users u ON r.patient_id = u.id
                JOIN doctors d ON r.doctor_id = d.id
                JOIN users u_doc ON d.user_id = u_doc.id
                LEFT JOIN specialties s ON d.specialty_id = s.id
                WHERE r.is_approved = 1 AND r.review_text IS NOT NULL AND r.review_text != ''
                ORDER BY r.created_at DESC LIMIT ?
            ");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll();
        } catch (\Throwable $e) {
            return [];
        }
    }
}
