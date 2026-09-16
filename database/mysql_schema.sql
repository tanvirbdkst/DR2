-- Daktar Serial Booking System - Phase 1 Production Database Schema
-- Compatible with MySQL 8.0+ / MariaDB 10.5+

CREATE DATABASE IF NOT EXISTS daktar_serial CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE daktar_serial;

-- 1. Users table (Central auth and base profile)
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

-- 3. Doctors table (Doctor specific professional records)
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

-- 4. Patients table (Patient specific health metadata)
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

-- 5. Chambers table (Physical clinical locations)
CREATE TABLE IF NOT EXISTS chambers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
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

-- 6. Doctor Chambers junction (Chamber specific fees)
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

-- 7. Doctor Schedules table (Weekly recurring availability)
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

-- 8. Serials table (Day-specific serial slot allocations)
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

-- 9. Appointments table (Patient bookings with strict double-booking protection)
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
    fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('unpaid', 'paid', 'exempt') NOT NULL DEFAULT 'unpaid',
    status ENUM('confirmed', 'waiting', 'in_consultation', 'completed', 'cancelled') NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- CRITICAL: Database-level double booking constraint
    CONSTRAINT uq_appointment_slot UNIQUE (doctor_id, chamber_id, schedule_date, serial_number),
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
    FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE RESTRICT,
    FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(id) ON DELETE RESTRICT,
    INDEX idx_appointments_patient (patient_id),
    INDEX idx_appointments_doctor_date (doctor_id, schedule_date),
    INDEX idx_appointments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Password resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_resets_email (email),
    INDEX idx_password_resets_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Activity logs table
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

-- 12. Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
