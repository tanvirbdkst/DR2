# 🚀 Daktar Serial (ডাক্তার সিরিয়াল) - cPanel Deployment & Troubleshooting Guide (PHP 8.2+ & MySQL)

“সহজেই ডাক্তার দেখানোর সিরিয়াল নিন” - A Complete Bangladesh-focused Doctor Chamber Serial Booking Platform.

---

## 🛑 HTTP ERROR 500 সমাধান (Fixing HTTP ERROR 500 on your domain)

যদি আপনার ডোমেইনে (যেমন `https://dakatarseial.bd`) **HTTP ERROR 500 (This page isn’t working)** দেখায়, তবে এটি সাধারণত নিচের ৩টি কারণে ঘটে:

### ১. পিএইচপি ভার্সন অসঙ্গতি (PHP Version Mismatch - সবচেয়ে সাধারণ কারণ)
- Daktar Serial অ্যাপ্লিকেশনের জন্য **PHP 8.1 অথবা PHP 8.2** প্রয়োজন। cPanel-এ ডিফল্টভাবে অনেক সময় PHP 7.4 সেট থাকে।
- **সমাধান:** 
  1. আপনার **cPanel**-এ লগইন করুন।
  2. **MultiPHP Manager** অথবা **Select PHP Version** অপশনে যান।
  3. আপনার ডোমেইনের (`dakatarseial.bd`) জন্য **PHP 8.2** সিলেক্ট করে **Apply / Save** দিন।

### ২. ডাটাবেস তথ্য ও টেবিল সেটআপ না থাকা (Database Credentials & Tables Missing)
- আপনার জন্য একটি **1-Click Web Installer** পেজ তৈরি করা হয়েছে যাতে কোনো কোড এডিট না করেই ব্রাউজার থেকে সহজে ডাটাবেস কানেক্ট করা যায়।
- **সমাধান:** 
  1. ব্রাউজারে যান: `https://dakatarseial.bd/install.php`
  2. আপনার cPanel-এর **MySQL Database Name**, **Username**, এবং **Password** বক্সে দিন।
  3. **"Save & Install Database"** বাটনে ক্লিক করুন।
  4. এটি স্বয়ংক্রিয়ভাবে ডাটাবেস কানেকশন টেস্ট করবে, `config/config.php` আপডেট করবে এবং সকল টেবিল ও ডেমো ডেটা ১ ক্লিকে ইমপোর্ট করে দেবে!

### ৩. সার্ভার স্বাস্থ্য পরীক্ষা (Diagnostics)
- ব্রাউজারে যান: `https://dakatarseial.bd/diagnostics.php`
- এখানে আপনি সরাসরি দেখতে পারবেন:
  - আপনার বর্তমান PHP ভার্সন কত
  - সব প্রয়োজনীয় পিএইচপি এক্সটেনশন চালু আছে কিনা
  - ডাটাবেস সফলভাবে কানেক্ট হয়েছে কিনা
  - কোন কোন টেবিল মিসিং রয়েছে

---

## 📁 ১. ডিরেক্টরি ও ফাইল কাঠামো

```text
php_app/
├── .htaccess                  <- Apache/LiteSpeed রাউটিং ও ডিরেক্টরি প্রোটেকশন
├── index.php                  <- ফ্রন্ট কন্ট্রোলার এন্ট্রি পয়েন্ট
├── install.php                <- 1-Click ওয়েব ইনস্টলার ও কনফিগারেশন পেজ
├── diagnostics.php            <- পিএইচপি ও ডাটাবেস স্বাস্থ্য পরীক্ষা টুল
├── config/
│   └── config.php             <- ডাটাবেস ক্রেডেনশিয়াল ফাইল
├── database/
│   └── complete_daktar_serial.sql <- সম্পূর্ণ অল-ইন-ওয়ান ডাটাবেস স্কিমা ও সীড ফাইল
├── app/
│   ├── Core/                  <- Database (PDO), Session, Router, Controller, Helpers
│   ├── Models/                <- User, Doctor, Appointment, Chamber, Specialty, Hospital
│   ├── Controllers/           <- Home, Auth, Doctor, Appointment, Patient, DoctorPortal, Admin
│   ├── Middleware/            <- Auth, Doctor, Admin রুট গার্ড
│   └── Views/                 <- Tailwind CSS ও Lucide Icons যুক্ত রেসপন্সিভ ভিউ
├── lang/                      <- সম্পূর্ণ দ্বিভাষিক সাপোর্ট (বাংলা 'bn' ও ইংরেজি 'en')
└── routes/
    └── web.php                <- ক্লিন RESTful MVC রাউটিং
```

---

## 🗄️ ২. cPanel-এ ম্যানুয়ালি ডাটাবেস সেটআপের নিয়ম (Alternative Manual Setup)

যদি আপনি `install.php` ব্যবহার না করে ম্যানুয়ালি phpMyAdmin দিয়ে করতে চান:

1. আপনার **cPanel**-এ প্রবেশ করুন।
2. **MySQL® Databases**-এ যান:
   - Create Database: যেমন `pixeswpo_dr`
   - Create User: যেমন `pixeswpo_druser` (একটি শক্তিশালী পাসওয়ার্ড দিন)
   - Add User to Database: সিলেক্ট করে **ALL PRIVILEGES** দিন।
3. **phpMyAdmin** ওপেন করুন:
   - বাম পাশে আপনার ডাটাবেসটি (`pixeswpo_dr`) সিলেক্ট করুন।
   - **Import** ট্যাবে যান।
   - `php_app/database/complete_daktar_serial.sql` ফাইলটি সিলেক্ট করে **Go** বাটনে ক্লিক করুন।
4. `php_app/config/config.php` ফাইলে তথ্যগুলো নিশ্চিত করুন:

```php
return [
    'app' => [
        'name' => 'Daktar Serial',
        'tagline_bn' => 'সহজেই ডাক্তার দেখানোর সিরিয়াল নিন',
        'url' => 'https://dakatarseial.bd',
        'lang' => 'bn',
        'debug' => false,
    ],
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'database' => 'pixeswpo_dr',      // আপনার cPanel ডাটাবেসের পুরো নাম
        'username' => 'pixeswpo_druser',  // আপনার cPanel ডাটাবেস ইউজার
        'password' => 'আপনার_পাসওয়ার্ড',   // ডাটাবেস পাসওয়ার্ড
        'charset' => 'utf8mb4',
    ],
];
```

---

## 🔑 ৩. ডিফল্ট লগইন ক্রেডেনশিয়াল (Default Credentials)

| ভূমিকা (Role) | ইমেইল (Email) | পাসওয়ার্ড (Password) | ড্যাশবোর্ড লিঙ্ক |
|---|---|---|---|
| **সুপার অ্যাডমিন** | `admin@daktarserial.com` | `admin123` | `/admin/dashboard` |
| **ডাক্তার ১ (মেডিসিন)** | `doctor@daktarserial.com` | `Password123!` | `/doctor/dashboard` |
| **ডাক্তার ২ (স্ত্রী রোগ)** | `dr.nusrat@daktarserial.com` | `Password123!` | `/doctor/dashboard` |
| **রোগী (Patient)** | `patient@daktarserial.com` | `Password123!` | `/patient/dashboard` |
