-- Migration 005: Doctor Specialties Multi-Select Junction Table
-- Supports multiple medical specialties per doctor (e.g. Cardiology + Internal Medicine)

CREATE TABLE IF NOT EXISTS doctor_specialties (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    specialty_id INT UNSIGNED NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_doctor_specialty (doctor_id, specialty_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE CASCADE,
    INDEX idx_doc_spec_doctor (doctor_id),
    INDEX idx_doc_spec_specialty (specialty_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill from existing doctors table so single-specialty doctors seamlessly persist
INSERT IGNORE INTO doctor_specialties (doctor_id, specialty_id, is_primary)
SELECT id, specialty_id, 1 FROM doctors WHERE specialty_id IS NOT NULL;
