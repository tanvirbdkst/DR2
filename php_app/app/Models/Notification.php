<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

class Notification
{
    public static function create(int $userId, string $title, string $message, string $type = 'appointment'): bool
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("
                INSERT INTO notifications (user_id, title, message, type, is_read)
                VALUES (?, ?, ?, ?, 0)
            ");
            return $stmt->execute([$userId, $title, $message, $type]);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public static function getForUser(int $userId, int $limit = 20): array
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("
                SELECT * FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC LIMIT ?
            ");
            $stmt->bindValue(1, $userId, PDO::PARAM_INT);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll();
        } catch (\Throwable $e) {
            return [];
        }
    }

    public static function markAllAsRead(int $userId): bool
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
            return $stmt->execute([$userId]);
        } catch (\Throwable $e) {
            return false;
        }
    }
}
