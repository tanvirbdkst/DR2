-- ====================================================================
-- Daktar Serial: Payment Gateway Management System Database Migration
-- Safe, additive, idempotent migration for MySQL 5.7+ / MariaDB / cPanel
-- ====================================================================

-- 1. Ensure 'payment_gateways' configuration table exists
CREATE TABLE IF NOT EXISTS `payment_gateways` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `logo_url` TEXT NULL,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `is_sandbox` TINYINT(1) NOT NULL DEFAULT 1,
  `config_encrypted` LONGTEXT NULL,
  `supported_methods` TEXT NULL,
  `surcharge_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `surcharge_fixed` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `sort_order` INT NOT NULL DEFAULT 0,
  `last_tested_at` DATETIME NULL,
  `last_test_status` VARCHAR(20) NULL DEFAULT 'untested',
  `last_test_message` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Ensure 'gateway_audit_logs' table exists
CREATE TABLE IF NOT EXISTS `gateway_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gateway_id` VARCHAR(64) NOT NULL,
  `admin_id` INT NULL,
  `admin_email` VARCHAR(191) NULL,
  `action` VARCHAR(64) NOT NULL,
  `changes` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_gal_gateway` (`gateway_id`),
  INDEX `idx_gal_admin` (`admin_id`),
  INDEX `idx_gal_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add additive columns to 'payments' table if missing (safe idempotent procedure)
DROP PROCEDURE IF EXISTS `AddPaymentColumnIfMissing`;

DELIMITER $$
CREATE PROCEDURE `AddPaymentColumnIfMissing`(
    IN target_column VARCHAR(64),
    IN column_type VARCHAR(128)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'payments'
          AND COLUMN_NAME = target_column
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `payments` ADD COLUMN `', target_column, '` ', column_type);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$
DELIMITER ;

CALL `AddPaymentColumnIfMissing`('gateway_id', 'VARCHAR(64) NULL');
CALL `AddPaymentColumnIfMissing`('booking_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 10.00');
CALL `AddPaymentColumnIfMissing`('consultation_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
CALL `AddPaymentColumnIfMissing`('surcharge_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
CALL `AddPaymentColumnIfMissing`('verified_at', 'DATETIME NULL');
CALL `AddPaymentColumnIfMissing`('verified_by', 'VARCHAR(100) NULL');

DROP PROCEDURE IF EXISTS `AddPaymentColumnIfMissing`;

-- 4. Seed supported gateways if not already present
INSERT IGNORE INTO `payment_gateways` (`id`, `name`, `description`, `logo_url`, `is_enabled`, `is_sandbox`, `supported_methods`, `surcharge_percentage`, `surcharge_fixed`, `sort_order`)
VALUES
  ('paymently', 'Paymently Gateway', 'Integrated multi-channel gateway (bKash, Nagad, Rocket, Cards, Internet Banking)', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80', 1, 1, '["bkash","nagad","rocket","card","bank"]', 0.00, 0.00, 1),
  ('bkash', 'bKash Direct Merchant Checkout', 'Official bKash Tokenized Merchant API for automated checkout & instant refunds', 'https://images.unsplash.com/photo-1556742049-0a67e557224f?w=100&auto=format&fit=crop&q=80', 0, 1, '["bkash"]', 0.00, 0.00, 2),
  ('nagad', 'Nagad Direct Merchant Checkout', 'Nagad PGW direct checkout with public/private key cryptographic verification', 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=100&auto=format&fit=crop&q=80', 0, 1, '["nagad"]', 0.00, 0.00, 3),
  ('rocket', 'DBBL Rocket Merchant', 'Dutch-Bangla Bank Rocket direct payment interface', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100&auto=format&fit=crop&q=80', 0, 1, '["rocket"]', 0.00, 0.00, 4),
  ('upay', 'Upay (UCB Fintech) Merchant', 'United Commercial Bank Upay automated mobile payment gateway', 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=100&auto=format&fit=crop&q=80', 0, 1, '["upay"]', 0.00, 0.00, 5),
  ('sslcommerz', 'SSLCommerz Payment Gateway', 'National payment gateway aggregator for all Bangladeshi cards and MFS accounts', 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=100&auto=format&fit=crop&q=80', 0, 1, '["bkash","nagad","rocket","upay","visa","mastercard"]', 0.00, 0.00, 6);
