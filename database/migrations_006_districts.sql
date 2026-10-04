-- Migration 006: Districts Table and Seed Data for Bangladesh 64 Districts
-- Compatible with MySQL 8.0+ / MariaDB 10.5+

CREATE TABLE IF NOT EXISTS districts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_bn VARCHAR(100) NOT NULL,
    division VARCHAR(50) NOT NULL,
    division_bn VARCHAR(50) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_districts_division (division),
    INDEX idx_districts_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Populate 64 Bangladesh districts with default active status
INSERT IGNORE INTO districts (id, name, name_bn, division, division_bn, is_active, sort_order) VALUES
-- Dhaka Division (13 districts)
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

-- Chattogram Division (11 districts)
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

-- Rajshahi Division (8 districts)
('rajshahi', 'Rajshahi', 'রাজশাহী', 'Rajshahi', 'রাজশাহী', 1, 25),
('bogura', 'Bogura', 'বগুড়া', 'Rajshahi', 'রাজশাহী', 1, 26),
('pabna', 'Pabna', 'পাবনা', 'Rajshahi', 'রাজশাহী', 1, 27),
('sirajganj', 'Sirajganj', 'সিরাজগঞ্জ', 'Rajshahi', 'রাজশাহী', 1, 28),
('naogaon', 'Naogaon', 'নওগাঁ', 'Rajshahi', 'রাজশাহী', 1, 29),
('natore', 'Natore', 'নাটোর', 'Rajshahi', 'রাজশাহী', 1, 30),
('chapainawabganj', 'Chapainawabganj', 'চাঁপাইনবাবগঞ্জ', 'Rajshahi', 'রাজশাহী', 1, 31),
('joypurhat', 'Joypurhat', 'জয়পুরহাট', 'Rajshahi', 'রাজশাহী', 1, 32),

-- Khulna Division (10 districts)
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

-- Barishal Division (6 districts)
('barishal', 'Barishal', 'বরিশাল', 'Barishal', 'বরিশাল', 1, 43),
('patuakhali', 'Patuakhali', 'পটুয়াখালী', 'Barishal', 'বরিশাল', 1, 44),
('bhola', 'Bhola', 'ভোলা', 'Barishal', 'বরিশাল', 1, 45),
('pirojpur', 'Pirojpur', 'পিরোজপুর', 'Barishal', 'বরিশাল', 1, 46),
('barguna', 'Barguna', 'বরগুনা', 'Barishal', 'বরিশাল', 1, 47),
('jhalokati', 'Jhalokati', 'ঝালকাঠি', 'Barishal', 'বরিশাল', 1, 48),

-- Sylhet Division (4 districts)
('sylhet', 'Sylhet', 'সিলেট', 'Sylhet', 'সিলেট', 1, 49),
('moulvibazar', 'Moulvibazar', 'মৌলভীবাজার', 'Sylhet', 'সিলেট', 1, 50),
('habiganj', 'Habiganj', 'হবিগঞ্জ', 'Sylhet', 'সিলেট', 1, 51),
('sunamganj', 'Sunamganj', 'সুনামগঞ্জ', 'Sylhet', 'সিলেট', 1, 52),

-- Rangpur Division (8 districts)
('rangpur', 'Rangpur', 'রংপুর', 'Rangpur', 'রংপুর', 1, 53),
('dinajpur', 'Dinajpur', 'দিনাজপুর', 'Rangpur', 'রংপুর', 1, 54),
('kurigram', 'Kurigram', 'কুড়িগ্রাম', 'Rangpur', 'রংপুর', 1, 55),
('gaibandha', 'Gaibandha', 'গাইবান্ধা', 'Rangpur', 'রংপুর', 1, 56),
('nilphamari', 'Nilphamari', 'নীলফামারী', 'Rangpur', 'রংপুর', 1, 57),
('lalmonirhat', 'Lalmonirhat', 'লালমনিরহাট', 'Rangpur', 'রংপুর', 1, 58),
('panchagarh', 'Panchagarh', 'পঞ্চগড়', 'Rangpur', 'রংপুর', 1, 59),
('thakurgaon', 'Thakurgaon', 'ঠাকুরগাঁও', 'Rangpur', 'রংপুর', 1, 60),

-- Mymensingh Division (4 districts)
('mymensingh', 'Mymensingh', 'ময়মনসিংহ', 'Mymensingh', 'ময়মনসিংহ', 1, 61),
('jamalpur', 'Jamalpur', 'জামালপুর', 'Mymensingh', 'ময়মনসিংহ', 1, 62),
('netrokona', 'Netrokona', 'নেত্রকোনা', 'Mymensingh', 'ময়মনসিংহ', 1, 63),
('sherpur', 'Sherpur', 'শেরপুর', 'Mymensingh', 'ময়মনসিংহ', 1, 64);
