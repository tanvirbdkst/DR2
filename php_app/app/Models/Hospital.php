<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

class Hospital
{
    public static function getAll(): array
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->query("
                SELECT h.*, COUNT(DISTINCT c.doctor_id) as doctor_count
                FROM hospitals h
                LEFT JOIN chambers c ON c.hospital_id = h.id
                GROUP BY h.id
                ORDER BY h.name ASC
            ");
            return $stmt->fetchAll();
        } catch (\Throwable $e) {
            return [];
        }
    }

    public static function findById(int $id): ?array
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("SELECT * FROM hospitals WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $res = $stmt->fetch();
            return $res ?: null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public static function create(array $data): int
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO hospitals (name, address, city, area, phone, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $data['address'],
            $data['city'] ?? 'Dhaka',
            $data['area'],
            $data['phone'] ?? null,
            $data['description'] ?? null,
            $data['image_url'] ?? null,
        ]);
        return (int)$db->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE hospitals
            SET name = ?, address = ?, city = ?, area = ?, phone = ?, description = ?
            WHERE id = ?
        ");
        return $stmt->execute([
            $data['name'],
            $data['address'],
            $data['city'] ?? 'Dhaka',
            $data['area'],
            $data['phone'] ?? null,
            $data['description'] ?? null,
            $id
        ]);
    }

    public static function delete(int $id): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM hospitals WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
