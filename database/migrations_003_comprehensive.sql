-- Migration 003: Expand appointments status enum, add hospitals and initial seeds
-- Safe migration: preserves all existing tables and data

USE daktar_serial;

-- 1. Safely expand status enum in appointments table to include 'called' and 'no_show'
ALTER TABLE appointments 
    MODIFY COLUMN status ENUM('confirmed', 'waiting', 'called', 'in_consultation', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'confirmed';

-- 2. Add doctor_notes column to appointments if not exists
SET @dbname = DATABASE();
SET @tablename = "appointments";
SET @columnname = "doctor_notes";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE appointments ADD COLUMN doctor_notes TEXT NULL AFTER problem_description;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Add hospital_id to chambers table if not exists
SET @columnname2 = "hospital_id";
SET @tablename2 = "chambers";
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename2
      AND COLUMN_NAME = @columnname2
  ) > 0,
  "SELECT 1",
  "ALTER TABLE chambers ADD COLUMN hospital_id INT UNSIGNED NULL AFTER doctor_id;"
));
PREPARE alterIfNotExists2 FROM @preparedStatement2;
EXECUTE alterIfNotExists2;
DEALLOCATE PREPARE alterIfNotExists2;

-- 4. Seed Popular Bangladesh Hospitals and Diagnostic Centers
INSERT IGNORE INTO hospitals (id, name, address, city, area, phone, description) VALUES
(1, 'Ibn Sina Diagnostic & Consultation Center', 'House 48, Road 9/A, Dhanmondi', 'Dhaka', 'Dhanmondi', '10615, 01713067888', 'Leading modern private healthcare and diagnostic institution in Bangladesh'),
(2, 'Popular Diagnostic Centre Ltd.', 'House 16, Road 2, Dhanmondi R/A', 'Dhaka', 'Dhanmondi', '09613787801', 'Premier pathology and specialized doctors consultation center'),
(3, 'Square Hospitals Ltd.', '18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath', 'Dhaka', 'Panthapath', '10616', 'Tertiary care hospital with international standards of healthcare'),
(4, 'Evercare Hospital Dhaka', 'Plot 81, Block E, Bashundhara R/A', 'Dhaka', 'Bashundhara', '10678', 'Multi-disciplinary super-specialty tertiary care hospital'),
(5, 'LabAid Specialized Hospital', 'House 06, Road 04, Dhanmondi', 'Dhaka', 'Dhanmondi', '10606', 'Specialized cardiac and multi-disciplinary healthcare center'),
(6, 'Green Life Hospital Ltd.', '32 Green Road, Dhanmondi', 'Dhaka', 'Green Road', '01711200000', 'Renowned hospital offering complete medical services');

-- 5. Seed default system settings
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
('site_title', 'Daktar Serial'),
('site_title_bn', 'ডাক্তার সিরিয়াল'),
('hotline_phone', '+880 1700-000000'),
('support_email', 'support@daktarserial.com'),
('emergency_notice', 'জরুরি ও সংকটজনক পরিস্থিতিতে অবিলম্বে নিকটস্থ জরুরি বিভাগে যোগাযোগ করুন।'),
('booking_rules', 'সিরিয়ালের আনুমানিক সময়ের কমপক্ষে ২০ মিনিট পূর্বে চেম্বারে উপস্থিত থাকুন।'),
('auto_approve_doctors', '0');
