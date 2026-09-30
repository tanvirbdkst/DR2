-- Migration 004: Compounder / Chamber Staff role
-- Adds the restricted 'compounder' user role, the compounders relation table,
-- and appointment booking-source tracking. Safe and idempotent: preserves all existing data.

-- 1. Extend users.role enum to include 'compounder'
ALTER TABLE users
    MODIFY COLUMN role ENUM('patient', 'doctor', 'admin', 'compounder') NOT NULL DEFAULT 'patient';

-- 2. Add users.doctor_id (the single doctor a compounder is bound to) if not exists
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "doctor_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN doctor_id INT UNSIGNED NULL AFTER status, ADD INDEX idx_users_doctor (doctor_id);"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Add users.last_login_at if not exists
SET @columnname = "last_login_at";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER doctor_id;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 4. Compounder relation table (one account -> exactly one doctor)
CREATE TABLE IF NOT EXISTS compounders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    doctor_id INT UNSIGNED NOT NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_compounders_doctor (doctor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Add appointments.booking_source if not exists
SET @tablename = "appointments";
SET @columnname = "booking_source";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE appointments ADD COLUMN booking_source ENUM('online', 'compounder', 'admin', 'walk_in') NOT NULL DEFAULT 'online' AFTER payment_status;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 6. Add appointments.created_by if not exists
SET @columnname = "created_by";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE appointments ADD COLUMN created_by INT UNSIGNED NULL AFTER booking_source;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 7. Allow patient age to be optional (manual bookings may not capture it)
ALTER TABLE appointments MODIFY COLUMN patient_age INT UNSIGNED NULL;
