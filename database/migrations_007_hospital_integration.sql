-- ============================================================================
-- Migration 007: Hospital Integration & Synchronization System
-- Compatible with MySQL 8.0+ / MariaDB 10.5+
-- ============================================================================

-- 1. Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hospital_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150) NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    address TEXT NULL,
    website_url VARCHAR(255) NULL,
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    integration_status ENUM('connected', 'disconnected', 'error', 'pending') NOT NULL DEFAULT 'pending',
    api_status ENUM('active', 'revoked', 'pending') NOT NULL DEFAULT 'pending',
    webhook_url VARCHAR(500) NULL,
    webhook_secret VARCHAR(255) NULL,
    total_hospital_serials INT UNSIGNED NOT NULL DEFAULT 100,
    online_quota INT UNSIGNED NOT NULL DEFAULT 20,
    notes TEXT NULL,
    last_sync_at DATETIME NULL,
    last_api_request_at DATETIME NULL,
    last_webhook_at DATETIME NULL,
    last_error_message TEXT NULL,
    successful_syncs_count INT UNSIGNED NOT NULL DEFAULT 0,
    failed_syncs_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hospitals_code (hospital_code),
    INDEX idx_hospitals_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Hospital API Credentials
CREATE TABLE IF NOT EXISTS hospital_api_credentials (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hospital_id INT UNSIGNED NOT NULL,
    api_key VARCHAR(100) NOT NULL UNIQUE,
    api_secret_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
    last_used_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    INDEX idx_hosp_cred_key (api_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Hospital Doctors / Chambers mapping
CREATE TABLE IF NOT EXISTS hospital_doctors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hospital_id INT UNSIGNED NOT NULL,
    doctor_id INT UNSIGNED NOT NULL,
    chamber_id INT UNSIGNED NOT NULL,
    total_serials INT UNSIGNED NOT NULL DEFAULT 100,
    online_quota INT UNSIGNED NOT NULL DEFAULT 20,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hospital_doc_chamber (hospital_id, doctor_id, chamber_id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE CASCADE,
    INDEX idx_hosp_docs_doctor (doctor_id),
    INDEX idx_hosp_docs_chamber (chamber_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Hospital External Bookings (Idempotency & External ID mapping)
CREATE TABLE IF NOT EXISTS hospital_external_bookings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hospital_id INT UNSIGNED NOT NULL,
    external_booking_id VARCHAR(100) NOT NULL,
    appointment_id VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(100) NULL,
    doctor_id INT UNSIGNED NOT NULL,
    chamber_id INT UNSIGNED NOT NULL,
    schedule_date DATE NOT NULL,
    serial_number INT UNSIGNED NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'BOOKED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hosp_ext_booking (hospital_id, external_booking_id),
    INDEX idx_hosp_ext_appt (appointment_id),
    INDEX idx_hosp_ext_idem (hospital_id, idempotency_key),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Hospital Sync Logs
CREATE TABLE IF NOT EXISTS hospital_sync_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hospital_id INT UNSIGNED NOT NULL,
    direction ENUM('daktar_to_hospital', 'hospital_to_daktar') NOT NULL,
    event VARCHAR(100) NOT NULL,
    doctor_id INT UNSIGNED NULL,
    chamber_id INT UNSIGNED NULL,
    schedule_date DATE NULL,
    serial_number INT UNSIGNED NULL,
    booking_id VARCHAR(100) NULL,
    external_booking_id VARCHAR(100) NULL,
    status ENUM('success', 'failed', 'pending') NOT NULL DEFAULT 'pending',
    http_status INT NULL,
    request_payload TEXT NULL,
    response_payload TEXT NULL,
    error_message TEXT NULL,
    idempotency_key VARCHAR(100) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sync_logs_hosp (hospital_id),
    INDEX idx_sync_logs_status (status),
    INDEX idx_sync_logs_event (event),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add hospital_id to chambers and appointments if missing (safely)
-- Note: MySQL does not have ADD COLUMN IF NOT EXISTS in older versions, handled programmatically in migration script.
