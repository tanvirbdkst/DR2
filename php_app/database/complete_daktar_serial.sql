-- Daktar Serial (ডাক্তার সিরিয়াল) - Complete Production Database Schema & Seed Data
-- Fully compatible with cPanel MySQL 5.7, 8.0+ and MariaDB 10.3+
-- SAFE FOR IMPORT: No hardcoded database names or CREATE DATABASE commands!

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
    status ENUM('active', 'pending', 'rejected', 'suspended') NOT NULL DEFAULT 'active',
    avatar_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Specialties table
CREATE TABLE IF NOT EXISTS specialties (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_bn VARCHAR(100) NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100) NULL,
    description TEXT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_specialties_slug (slug),
    INDEX idx_specialties_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    specialty_id INT UNSIGNED NULL,
    title VARCHAR(50) NOT NULL DEFAULT 'Dr.',
    bmdc_number VARCHAR(50) NOT NULL UNIQUE,
    qualification VARCHAR(255) NOT NULL,
    experience_years INT UNSIGNED NOT NULL DEFAULT 0,
    bio TEXT NULL,
    consultation_fee DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    approval_status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
    rejection_reason VARCHAR(255) NULL,
    approved_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE SET NULL,
    INDEX idx_doctors_approval_status (approval_status),
    INDEX idx_doctors_specialty (specialty_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Patients table
CREATE TABLE IF NOT EXISTS patients (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NULL,
    date_of_birth DATE NULL,
    gender ENUM('male', 'female', 'other') NULL,
    address TEXT NULL,
    emergency_contact VARCHAR(30) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Dhaka',
    area VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NULL,
    description TEXT NULL,
    image_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Chambers table
CREATE TABLE IF NOT EXISTS chambers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    hospital_id INT UNSIGNED NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Dhaka',
    area VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NULL,
    map_location VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_chambers_doctor (doctor_id),
    INDEX idx_chambers_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Doctor Chambers junction
CREATE TABLE IF NOT EXISTS doctor_chambers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    chamber_id INT UNSIGNED NOT NULL,
    consultation_fee DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    follow_up_fee DECIMAL(10, 2) NOT NULL DEFAULT 300.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_doctor_chamber (doctor_id, chamber_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Doctor Schedules table
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    chamber_id INT UNSIGNED NOT NULL,
    day_of_week ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_serials INT UNSIGNED NOT NULL DEFAULT 20,
    slot_duration_minutes INT UNSIGNED NOT NULL DEFAULT 10,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE CASCADE,
    INDEX idx_schedules_lookup (doctor_id, chamber_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Serials table
CREATE TABLE IF NOT EXISTS serials (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT UNSIGNED NOT NULL,
    doctor_id INT UNSIGNED NOT NULL,
    chamber_id INT UNSIGNED NOT NULL,
    schedule_date DATE NOT NULL,
    serial_number INT UNSIGNED NOT NULL,
    estimated_time TIME NULL,
    status ENUM('available', 'booked', 'blocked') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_doctor_chamber_date_serial (doctor_id, chamber_id, schedule_date, serial_number),
    FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE CASCADE,
    INDEX idx_serials_lookup (doctor_id, chamber_id, schedule_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_id VARCHAR(50) NOT NULL UNIQUE,
    patient_id INT UNSIGNED NULL,
    doctor_id INT UNSIGNED NOT NULL,
    chamber_id INT UNSIGNED NOT NULL,
    schedule_id INT UNSIGNED NOT NULL,
    schedule_date DATE NOT NULL,
    serial_number INT UNSIGNED NOT NULL,
    appointment_time VARCHAR(20) NOT NULL,
    patient_name VARCHAR(150) NOT NULL,
    patient_phone VARCHAR(30) NOT NULL,
    patient_age INT UNSIGNED NOT NULL,
    patient_gender ENUM('male', 'female', 'other') NOT NULL,
    problem_description TEXT NULL,
    doctor_notes TEXT NULL,
    fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('unpaid', 'paid', 'exempt') NOT NULL DEFAULT 'unpaid',
    status ENUM('confirmed', 'waiting', 'called', 'in_consultation', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_appointment_slot UNIQUE (doctor_id, chamber_id, schedule_date, serial_number),
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
    FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE RESTRICT,
    FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(id) ON DELETE RESTRICT,
    INDEX idx_appointments_patient (patient_id),
    INDEX idx_appointments_doctor_date (doctor_id, schedule_date),
    INDEX idx_appointments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT UNSIGNED NOT NULL UNIQUE,
    doctor_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NULL,
    is_approved TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reviews_doctor (doctor_id, is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'appointment',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Payments table
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
    INDEX idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_activity_logs_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Password resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_resets_email (email),
    INDEX idx_password_resets_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED DATA (Default System Admin, Specialties, Hospitals, Doctors & Chambers)
-- =========================================================================

-- Seed System Settings
INSERT INTO settings (setting_key, setting_value) VALUES
('site_title', 'Daktar Serial'),
('site_title_bn', 'ডাক্তার সিরিয়াল'),
('hotline_phone', '+880 1700-000000'),
('contact_email', 'support@daktarserial.com')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Seed Specialties
INSERT INTO specialties (id, name, name_bn, slug, icon, description, status) VALUES
(1, 'Medicine', 'মেডিসিন', 'medicine', 'Pill', 'Internal medicine and general adult healthcare', 'active'),
(2, 'Cardiology', 'কার্ডিওলজি (হৃদরোগ)', 'cardiology', 'Heart', 'Heart and cardiovascular system diseases', 'active'),
(3, 'Gynecology & Obstetrics', 'স্ত্রী ও প্রসূতি রোগ', 'gynecology', 'Baby', 'Women health, pregnancy and delivery care', 'active'),
(4, 'Pediatrics / Child Specialist', 'শিশু বিশেষজ্ঞ', 'pediatrics', 'Smile', 'Newborn, infant and child health', 'active'),
(5, 'Dermatology & Venereology', 'চর্ম ও যৌন রোগ', 'dermatology', 'Sparkles', 'Skin, hair, nails and aesthetic treatment', 'active'),
(6, 'Orthopedics', 'অর্থোপেডিকস (হাড়-জোড়)', 'orthopedics', 'Activity', 'Bone, joint, spine and trauma surgery', 'active'),
(7, 'ENT (Ear, Nose, Throat)', 'নাক, কান ও গলা', 'ent', 'Volume2', 'Ear, nose, throat and head-neck surgery', 'active'),
(8, 'Neurology', 'নিউরোমেডিসিন', 'neurology', 'Brain', 'Brain, spinal cord and nervous system diseases', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name), name_bn = VALUES(name_bn);

-- Seed Hospitals
INSERT INTO hospitals (id, name, address, city, area, phone, description) VALUES
(1, 'Ibn Sina Diagnostic & Consultation Center', 'House 48, Road 9/A, Dhanmondi', 'Dhaka', 'Dhanmondi', '10615, 01713067888', 'Leading modern private healthcare and diagnostic institution in Bangladesh'),
(2, 'Popular Diagnostic Centre Ltd.', 'House 16, Road 2, Dhanmondi R/A', 'Dhaka', 'Dhanmondi', '09613787801', 'Premier pathology and specialized doctors consultation center'),
(3, 'Square Hospitals Ltd.', '18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath', 'Dhaka', 'Panthapath', '10616', 'Tertiary care hospital with international standards of healthcare'),
(4, 'Evercare Hospital Dhaka', 'Plot 81, Block E, Bashundhara R/A', 'Dhaka', 'Bashundhara', '10678', 'Multi-disciplinary super-specialty tertiary care hospital'),
(5, 'LabAid Specialized Hospital', 'House 06, Road 04, Dhanmondi', 'Dhaka', 'Dhanmondi', '10606', 'Specialized cardiac and multi-disciplinary healthcare center'),
(6, 'Green Life Hospital Ltd.', '32 Green Road, Dhanmondi', 'Dhaka', 'Green Road', '01711200000', 'Renowned hospital offering complete medical services')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed Users:
-- Admin: admin@daktarserial.com / admin123
-- Patient: patient@daktarserial.com / Password123!
-- Doctor 1: doctor@daktarserial.com / Password123!
-- Doctor 2: dr.nusrat@daktarserial.com / Password123!
-- Doctor 3: dr.rafiq@daktarserial.com / Password123!
INSERT INTO users (id, name, email, phone, password_hash, role, status, avatar_url) VALUES
(1, 'System Administrator', 'admin@daktarserial.com', '+8801711000000', '$2y$10$qaJ0jIX73mjD8kR7CBPI0uI8f8n1hRaYf9O9MdcxbZ0FrjlE.7NhC', 'admin', 'active', NULL),
(2, 'Rahim Uddin (Patient)', 'patient@daktarserial.com', '+8801722000000', '$2y$10$iKCuWBU9CMETcZVPwkL3cekIEeL.hFpg.6KJzJrv5Epc9MncJtcOy', 'patient', 'active', NULL),
(3, 'Prof. Dr. Tanvir Ahmad', 'doctor@daktarserial.com', '+8801733000001', '$2y$10$iKCuWBU9CMETcZVPwkL3cekIEeL.hFpg.6KJzJrv5Epc9MncJtcOy', 'doctor', 'active', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256'),
(4, 'Dr. Nusrat Jahan', 'dr.nusrat@daktarserial.com', '+8801733000002', '$2y$10$iKCuWBU9CMETcZVPwkL3cekIEeL.hFpg.6KJzJrv5Epc9MncJtcOy', 'doctor', 'active', 'https://images.unsplash.com/photo-1594824813570-589f81643c70?auto=format&fit=crop&q=80&w=256'),
(5, 'Dr. Rafiqul Islam', 'dr.rafiq@daktarserial.com', '+8801733000003', '$2y$10$iKCuWBU9CMETcZVPwkL3cekIEeL.hFpg.6KJzJrv5Epc9MncJtcOy', 'doctor', 'active', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=256')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed Patient Profile
INSERT INTO patients (id, user_id, blood_group, date_of_birth, gender, address, emergency_contact) VALUES
(1, 2, 'B+', '1992-05-14', 'male', 'Mirpur-10, Dhaka', '+8801811999999')
ON DUPLICATE KEY UPDATE blood_group = VALUES(blood_group);

-- Seed Doctors
INSERT INTO doctors (id, user_id, specialty_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status, approved_at) VALUES
(1, 3, 1, 'Prof. Dr.', 'BMDC-A-48920', 'MBBS, FCPS (Medicine), MD (Cardiology)', 16, 'Professor & Head of Department, Internal Medicine with extensive clinical experience in chronic disease management and cardiovascular wellness.', 1000.00, 'approved', NOW()),
(2, 4, 3, 'Dr.', 'BMDC-A-56214', 'MBBS, FCPS (Obs & Gynae), MS (Gynae)', 11, 'Consultant Obstetrician & Gynecologist, specialized in high-risk pregnancy, normal delivery, and laparoscopic gynecological procedures.', 800.00, 'approved', NOW()),
(3, 5, 4, 'Dr.', 'BMDC-A-39182', 'MBBS, DCH, MD (Pediatrics)', 14, 'Senior Child Specialist with dedicated focus on infant nutrition, growth tracking, pediatric infectious diseases and childhood asthma.', 700.00, 'approved', NOW())
ON DUPLICATE KEY UPDATE qualification = VALUES(qualification), approval_status = 'approved';

-- Seed Chambers
INSERT INTO chambers (id, doctor_id, hospital_id, name, address, city, area, phone) VALUES
(1, 1, 1, 'Ibn Sina Diagnostic & Consultation Center', 'House 48, Road 9/A, Dhanmondi', 'Dhaka', 'Dhanmondi', '+8801713067888'),
(2, 1, 2, 'Popular Diagnostic Centre Ltd.', 'Unit 1, House 16, Road 2, Dhanmondi R/A', 'Dhaka', 'Dhanmondi', '+8809613787801'),
(3, 2, 3, 'Square Hospital Consultation Suite', '18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath', 'Dhaka', 'Panthapath', '10616'),
(4, 3, 6, 'Green Life Hospital Consultation Center', '32 Green Road, Dhanmondi', 'Dhaka', 'Green Road', '+8801711200000')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed Doctor Chambers Junction
INSERT INTO doctor_chambers (id, doctor_id, chamber_id, consultation_fee, follow_up_fee) VALUES
(1, 1, 1, 1000.00, 600.00),
(2, 1, 2, 1200.00, 700.00),
(3, 2, 3, 1000.00, 600.00),
(4, 3, 4, 700.00, 400.00)
ON DUPLICATE KEY UPDATE consultation_fee = VALUES(consultation_fee);

-- Seed Doctor Schedules
INSERT INTO doctor_schedules (id, doctor_id, chamber_id, day_of_week, start_time, end_time, max_serials, slot_duration_minutes, is_active) VALUES
(1, 1, 1, 'Sunday', '17:00:00', '21:00:00', 20, 10, 1),
(2, 1, 1, 'Tuesday', '17:00:00', '21:00:00', 20, 10, 1),
(3, 1, 1, 'Thursday', '17:00:00', '21:00:00', 20, 10, 1),
(4, 1, 2, 'Monday', '18:00:00', '21:30:00', 18, 10, 1),
(5, 1, 2, 'Wednesday', '18:00:00', '21:30:00', 18, 10, 1),
(6, 1, 2, 'Saturday', '18:00:00', '21:30:00', 18, 10, 1),
(7, 2, 3, 'Sunday', '16:00:00', '19:30:00', 15, 12, 1),
(8, 2, 3, 'Monday', '16:00:00', '19:30:00', 15, 12, 1),
(9, 2, 3, 'Wednesday', '16:00:00', '19:30:00', 15, 12, 1),
(10, 3, 4, 'Sunday', '17:30:00', '20:30:00', 20, 10, 1),
(11, 3, 4, 'Tuesday', '17:30:00', '20:30:00', 20, 10, 1),
(12, 3, 4, 'Friday', '09:30:00', '12:30:00', 20, 10, 1)
ON DUPLICATE KEY UPDATE is_active = 1;
