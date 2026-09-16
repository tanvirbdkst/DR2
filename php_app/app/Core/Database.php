<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $config = require __DIR__ . '/../../config/config.php';
            $db = $config['db'];

            $dsn = "mysql:host={$db['host']};port={$db['port']};dbname={$db['database']};charset={$db['charset']}";

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            try {
                self::$instance = new PDO($dsn, $db['username'], $db['password'], $options);
                self::ensureSchema(self::$instance);
            } catch (PDOException $e) {
                error_log("Database connection failed: " . $e->getMessage());
                throw new \Exception(
                    "Database connection failed for user '{$db['username']}' on database '{$db['database']}'. MySQL Message: " . $e->getMessage(),
                    (int)$e->getCode(),
                    $e
                );
            }
        }

        return self::$instance;
    }

    /**
     * Self-healing schema check to automatically create missing tables like reviews, settings, etc.
     */
    public static function ensureSchema(PDO $pdo): void
    {
        static $checked = false;
        if ($checked) {
            return;
        }
        $checked = true;

        try {
            // Check if essential table reviews exists
            $tableCheck = $pdo->query("SHOW TABLES LIKE 'reviews'")->fetch();
            if (!$tableCheck) {
                // 1. First run the complete schema SQL file if available
                $sqlFile = __DIR__ . '/../../database/complete_daktar_serial.sql';
                if (file_exists($sqlFile)) {
                    $rawSql = file_get_contents($sqlFile);
                    if (!empty($rawSql)) {
                        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
                        // Split into discrete queries to support all MySQL drivers
                        $statements = preg_split('/;\s*[\r\n]+/', $rawSql);
                        foreach ($statements as $stmt) {
                            $cleanStmt = trim($stmt);
                            if (!empty($cleanStmt) && !str_starts_with($cleanStmt, '--') && !str_starts_with($cleanStmt, '/*')) {
                                try {
                                    $pdo->exec($cleanStmt);
                                } catch (\Throwable $e) {
                                    // Ignore duplicate key or minor notices during batch import
                                }
                            }
                        }
                        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
                    }
                }

                // 2. Direct guarantee: Always ensure reviews table is created
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS reviews (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        appointment_id INT UNSIGNED NOT NULL UNIQUE,
                        doctor_id INT UNSIGNED NOT NULL,
                        patient_id INT UNSIGNED NOT NULL,
                        rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
                        review_text TEXT NULL,
                        is_approved TINYINT(1) NOT NULL DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_reviews_doctor (doctor_id, is_approved)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");

                // 3. Ensure other secondary tables are created
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS settings (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        setting_key VARCHAR(100) NOT NULL UNIQUE,
                        setting_value TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");

                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS notifications (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        user_id INT UNSIGNED NOT NULL,
                        title VARCHAR(150) NOT NULL,
                        message TEXT NOT NULL,
                        type VARCHAR(50) NOT NULL DEFAULT 'appointment',
                        is_read TINYINT(1) NOT NULL DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_notifications_user (user_id, is_read)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");

                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS payments (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        appointment_id INT UNSIGNED NOT NULL,
                        transaction_id VARCHAR(100) NULL UNIQUE,
                        method ENUM('cash_at_chamber', 'online_payment', 'bkash', 'nagad', 'card') NOT NULL DEFAULT 'cash_at_chamber',
                        amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                        status ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid',
                        gateway_response TEXT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_payments_status (status)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
            }
        } catch (\Throwable $e) {
            // Never break application if inspection throws non-fatal warning
            error_log("ensureSchema note: " . $e->getMessage());
        }
    }
}
