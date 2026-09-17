<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

class Setting
{
    public static function get(string $key, ?string $default = null): ?string
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1");
            $stmt->execute([$key]);
            $val = $stmt->fetchColumn();
            return $val !== false ? (string)$val : $default;
        } catch (\Throwable $e) {
            return $default;
        }
    }

    public static function getAll(): array
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
            return $stmt->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    public static function set(string $key, string $value): bool
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP
            ");
            return $stmt->execute([$key, $value]);
        } catch (\Throwable $e) {
            return false;
        }
    }
}
