-- ============================================================================
-- Migration 009: Paymently Payment Integration & Production Schema Alignment
-- Compatible with MySQL 8.0+ / MariaDB 10.5+ / cPanel phpMyAdmin (pixeswpo_dr)
-- Base URL: https://daktarserial.paymently.io/api
-- Booking Fee: BDT 10.00
-- ============================================================================

-- 1. Ensure appointments table has required payment & transaction tracking columns
DROP PROCEDURE IF EXISTS upgrade_appointments_paymently;
DELIMITER //
CREATE PROCEDURE upgrade_appointments_paymently()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'booking_fee'
    ) THEN
        ALTER TABLE appointments ADD COLUMN booking_fee DECIMAL(10, 2) NOT NULL DEFAULT 10.00 AFTER fee;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'transaction_ref'
    ) THEN
        ALTER TABLE appointments ADD COLUMN transaction_ref VARCHAR(100) NULL AFTER booking_fee;
        ALTER TABLE appointments ADD INDEX idx_appointments_tx_ref (transaction_ref);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'payment_method'
    ) THEN
        ALTER TABLE appointments ADD COLUMN payment_method VARCHAR(50) NULL AFTER transaction_ref;
    END IF;
END //
DELIMITER ;

CALL upgrade_appointments_paymently();
DROP PROCEDURE IF EXISTS upgrade_appointments_paymently;

-- 2. Ensure payments table exists with confirmed production schema (pixeswpo_dr)
-- Uses: appointment_id INT UNSIGNED, transaction_id VARCHAR(100), method, amount, status, gateway_response
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
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    INDEX idx_payments_status (status),
    INDEX idx_payments_tx (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Log migration execution
INSERT INTO settings (setting_key, setting_value) 
VALUES ('migration_009_paymently_applied', NOW())
ON DUPLICATE KEY UPDATE setting_value = NOW();
