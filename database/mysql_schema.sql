-- Daktar Serial Booking System - Phase 1 Production Database Schema
-- Compatible with MySQL 8.0+ / MariaDB 10.5+
-- Schema is database-agnostic: executes in whatever DB is selected by the connection

-- 1. Users table (Central auth and base profile)
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'admin', 'compounder') NOT NULL DEFAULT 'patient',
    status ENUM('active', 'pending', 'rejected', 'suspended') NOT NULL DEFAULT 'active',
    -- Only populated for role = 'compounder': the single doctor this staff account is bound to
    doctor_id INT UNSIGNED NULL,
    last_login_at DATETIME NULL,
    avatar_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role_status (role, status),
    INDEX idx_users_doctor (doctor_id)
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

-- 3b. Doctor Specialties table (Multi-specialty support: e.g. Cardiology + Medicine)
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

-- 4b. Compounders table (Chamber staff account. Each compounder is bound to exactly ONE doctor.)
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
    patient_age INT UNSIGNED NULL,
    patient_gender ENUM('male', 'female', 'other') NOT NULL,
    problem_description TEXT NULL,
    fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('unpaid', 'paid', 'exempt') NOT NULL DEFAULT 'unpaid',
    -- 'online' = public patient booking (may be paid); 'compounder' = manual staff booking (always unpaid)
    booking_source ENUM('online', 'compounder', 'admin', 'walk_in') NOT NULL DEFAULT 'online',
    created_by INT UNSIGNED NULL,
    status ENUM('confirmed', 'waiting', 'in_consultation', 'completed', 'cancelled') NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- CRITICAL: Database-level double booking constraint
    CONSTRAINT uq_appointment_slot UNIQUE (doctor_id, chamber_id, schedule_date, serial_number),
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
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

-- 13. Districts table (Search Location & Bangladesh 64 Districts)
CREATE TABLE IF NOT EXISTS districts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_bn VARCHAR(100) NOT NULL,
    division VARCHAR(50) NOT NULL,
    division_bn VARCHAR(50) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_districts_division (division),
    INDEX idx_districts_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed for 64 Bangladesh Districts
INSERT IGNORE INTO districts (id, name, name_bn, division, division_bn, is_active, sort_order) VALUES
('dhaka', 'Dhaka', 'ঢাকা', 'Dhaka', 'ঢাকা', 1, 1),
('gazipur', 'Gazipur', 'গাজীপুর', 'Dhaka', 'ঢাকা', 1, 2),
('narayanganj', 'Narayanganj', 'নারায়ণগঞ্জ', 'Dhaka', 'ঢাকা', 1, 3),
('tangail', 'Tangail', 'টাঙ্গাইল', 'Dhaka', 'ঢাকা', 1, 4),
('narsingdi', 'Narsingdi', 'নরসিংদী', 'Dhaka', 'ঢাকা', 1, 5),
('faridpur', 'Faridpur', 'ফরিদপুর', 'Dhaka', 'ঢাকা', 1, 6),
('manikganj', 'Manikganj', 'মানিকগঞ্জ', 'Dhaka', 'ঢাকা', 1, 7),
('munshiganj', 'Munshiganj', 'মুন্সীগঞ্জ', 'Dhaka', 'ঢাকা', 1, 8),
('kishoreganj', 'Kishoreganj', 'কিশোরগঞ্জ', 'Dhaka', 'ঢাকা', 1, 9),
('gopalganj', 'Gopalganj', 'গোপালগঞ্জ', 'Dhaka', 'ঢাকা', 1, 10),
('madaripur', 'Madaripur', 'মাদারীপুর', 'Dhaka', 'ঢাকা', 1, 11),
('rajbari', 'Rajbari', 'রাজবাড়ী', 'Dhaka', 'ঢাকা', 1, 12),
('shariatpur', 'Shariatpur', 'শরীয়তপুর', 'Dhaka', 'ঢাকা', 1, 13),
('chattogram', 'Chattogram', 'চট্টগ্রাম', 'Chattogram', 'চট্টগ্রাম', 1, 14),
('coxs-bazar', "Cox's Bazar", 'কক্সবাজার', 'Chattogram', 'চট্টগ্রাম', 1, 15),
('cumilla', 'Cumilla', 'কুমিল্লা', 'Chattogram', 'চট্টগ্রাম', 1, 16),
('brahmanbaria', 'Brahmanbaria', 'ব্রাহ্মণবাড়িয়া', 'Chattogram', 'চট্টগ্রাম', 1, 17),
('chandpur', 'Chandpur', 'চাঁদপুর', 'Chattogram', 'চট্টগ্রাম', 1, 18),
('feni', 'Feni', 'ফেনী', 'Chattogram', 'চট্টগ্রাম', 1, 19),
('noakhali', 'Noakhali', 'নোয়াখালী', 'Chattogram', 'চট্টগ্রাম', 1, 20),
('lakshmipur', 'Lakshmipur', 'লক্ষ্মীপুর', 'Chattogram', 'চট্টগ্রাম', 1, 21),
('khagrachhari', 'Khagrachhari', 'খাগড়াছড়ি', 'Chattogram', 'চট্টগ্রাম', 1, 22),
('rangamati', 'Rangamati', 'রাঙ্গামাটি', 'Chattogram', 'চট্টগ্রাম', 1, 23),
('bandarban', 'Bandarban', 'বান্দরবান', 'Chattogram', 'চট্টগ্রাম', 1, 24),
('rajshahi', 'Rajshahi', 'রাজশাহী', 'Rajshahi', 'রাজশাহী', 1, 25),
('bogura', 'Bogura', 'বগুড়া', 'Rajshahi', 'রাজশাহী', 1, 26),
('pabna', 'Pabna', 'পাবনা', 'Rajshahi', 'রাজশাহী', 1, 27),
('sirajganj', 'Sirajganj', 'সিরাজগঞ্জ', 'Rajshahi', 'রাজশাহী', 1, 28),
('naogaon', 'Naogaon', 'নওগাঁ', 'Rajshahi', 'রাজশাহী', 1, 29),
('natore', 'Natore', 'নাটোর', 'Rajshahi', 'রাজশাহী', 1, 30),
('chapainawabganj', 'Chapainawabganj', 'চাঁপাইনবাবগঞ্জ', 'Rajshahi', 'রাজশাহী', 1, 31),
('joypurhat', 'Joypurhat', 'জয়পুরহাট', 'Rajshahi', 'রাজশাহী', 1, 32),
('khulna', 'Khulna', 'খুলনা', 'Khulna', 'খুলনা', 1, 33),
('jashore', 'Jashore', 'যশোর', 'Khulna', 'খুলনা', 1, 34),
('kushtia', 'Kushtia', 'কুষ্টিয়া', 'Khulna', 'খুলনা', 1, 35),
('jhenaidah', 'Jhenaidah', 'ঝিনাইদহ', 'Khulna', 'খুলনা', 1, 36),
('satkhira', 'Satkhira', 'সাতক্ষীরা', 'Khulna', 'খুলনা', 1, 37),
('bagerhat', 'Bagerhat', 'বাগেরহাট', 'Khulna', 'খুলনা', 1, 38),
('chuadanga', 'Chuadanga', 'চুয়াডাঙ্গা', 'Khulna', 'খুলনা', 1, 39),
('magura', 'Magura', 'মাগুরা', 'Khulna', 'খুলনা', 1, 40),
('meherpur', 'Meherpur', 'মেহেরপুর', 'Khulna', 'খুলনা', 1, 41),
('narail', 'Narail', 'নড়াইল', 'Khulna', 'খুলনা', 1, 42),
('barishal', 'Barishal', 'বরিশাল', 'Barishal', 'বরিশাল', 1, 43),
('patuakhali', 'Patuakhali', 'পটুয়াখালী', 'Barishal', 'বরিশাল', 1, 44),
('bhola', 'Bhola', 'ভোলা', 'Barishal', 'বরিশাল', 1, 45),
('pirojpur', 'Pirojpur', 'পিরোজপুর', 'Barishal', 'বরিশাল', 1, 46),
('barguna', 'Barguna', 'বরগুনা', 'Barishal', 'বরিশাল', 1, 47),
('jhalokati', 'Jhalokati', 'ঝালকাঠি', 'Barishal', 'বরিশাল', 1, 48),
('sylhet', 'Sylhet', 'সিলেট', 'Sylhet', 'সিলেট', 1, 49),
('moulvibazar', 'Moulvibazar', 'মৌলভীবাজার', 'Sylhet', 'সিলেট', 1, 50),
('habiganj', 'Habiganj', 'হবিগঞ্জ', 'Sylhet', 'সিলেট', 1, 51),
('sunamganj', 'Sunamganj', 'সুনামগঞ্জ', 'Sylhet', 'সিলেট', 1, 52),
('rangpur', 'Rangpur', 'রংপুর', 'Rangpur', 'রংপুর', 1, 53),
('dinajpur', 'Dinajpur', 'দিনাজপুর', 'Rangpur', 'রংপুর', 1, 54),
('kurigram', 'Kurigram', 'কুড়িগ্রাম', 'Rangpur', 'রংপুর', 1, 55),
('gaibandha', 'Gaibandha', 'গাইবান্ধা', 'Rangpur', 'রংপুর', 1, 56),
('nilphamari', 'Nilphamari', 'নীলফামারী', 'Rangpur', 'রংপুর', 1, 57),
('lalmonirhat', 'Lalmonirhat', 'লালমনিরহাট', 'Rangpur', 'রংপুর', 1, 58),
('panchagarh', 'Panchagarh', 'পঞ্চগড়', 'Rangpur', 'রংপুর', 1, 59),
('thakurgaon', 'Thakurgaon', 'ঠাকুরগাঁও', 'Rangpur', 'রংপুর', 1, 60),
('mymensingh', 'Mymensingh', 'ময়মনসিংহ', 'Mymensingh', 'ময়মনসিংহ', 1, 61),
('jamalpur', 'Jamalpur', 'জামালপুর', 'Mymensingh', 'ময়মনসিংহ', 1, 62),
('netrokona', 'Netrokona', 'নেত্রকোনা', 'Mymensingh', 'ময়মনসিংহ', 1, 63),
('sherpur', 'Sherpur', 'শেরপুর', 'Mymensingh', 'ময়মনসিংহ', 1, 64);

-- 14. Hospitals table (Hospital Integration & Collaboration)
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
    webhook_enabled TINYINT(1) NOT NULL DEFAULT 1,
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

-- 15. Hospital API Credentials
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

-- 16. Hospital Doctors / Chambers mapping
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

-- 17. Hospital External Bookings (Idempotency & External ID mapping)
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

-- 18. Hospital Sync Logs
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

-- 19. In-App Notifications table (Admin, Compounder & Patient notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSON NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    INDEX idx_notifications_user_read (user_id, is_read),
    INDEX idx_notifications_created (created_at),
    INDEX idx_notifications_type (type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. FCM Device Registration Tokens table (Browser & Mobile push tokens)
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    device_type VARCHAR(50) NOT NULL DEFAULT 'web',
    user_agent TEXT NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fcm_tokens_user (user_id),
    INDEX idx_fcm_tokens_token (token(255)),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


