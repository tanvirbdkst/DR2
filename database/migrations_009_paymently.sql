-- ============================================================================
-- Migration 009: Paymently Payment Gateway Integration & Transaction Logging
-- Compatible with MySQL 8.0+ / MariaDB 10.5+ / cPanel phpMyAdmin
-- Base URL: https://daktarserial.paymently.io/api
-- Booking Fee: BDT 10.00
-- ============================================================================

-- 1. Ensure appointments table has required payment & transaction tracking columns
-- Note: Stored procedure handles column existence safely across all MySQL/MariaDB engines
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

-- 2. Create payments table for Paymently checkout sessions and server verification
CREATE TABLE IF NOT EXISTS payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_id VARCHAR(50) NOT NULL,
    transaction_ref VARCHAR(100) NOT NULL UNIQUE,
    payment_gateway VARCHAR(50) NOT NULL DEFAULT 'paymently',
    gateway_invoice_id VARCHAR(100) NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    status ENUM('pending', 'completed', 'failed', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50) NULL,
    sender_number VARCHAR(50) NULL,
    gateway_transaction_id VARCHAR(100) NULL,
    payment_url TEXT NULL,
    metadata JSON NULL,
    raw_response LONGTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pmt_appt (appointment_id),
    INDEX idx_pmt_tx (transaction_ref),
    INDEX idx_pmt_invoice (gateway_invoice_id),
    INDEX idx_pmt_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Log migration execution
INSERT INTO settings (setting_key, setting_value) 
VALUES ('migration_009_paymently_applied', NOW())
ON DUPLICATE KEY UPDATE setting_value = NOW();
