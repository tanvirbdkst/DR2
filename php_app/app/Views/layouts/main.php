<!DOCTYPE html>
<html lang="<?= e(\App\Core\Session::get('lang', 'bn')) ?>" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($title ?? 'Daktar Serial - Doctor Chamber Serial Booking in Bangladesh') ?></title>
    <meta name="description" content="বাংলাদেশ ভিত্তিক বিশেষজ্ঞ চিকিৎসকদের সরাসরি চেম্বার সিরিয়াল বুকিং ও অনলাইন ম্যানেজমেন্ট প্ল্যাটফর্ম">
    
    <!-- Google Fonts: Plus Jakarta Sans & Hind Siliguri -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        emerald: {
                            50: '#ecfdf5',
                            100: '#d1fae5',
                            200: '#a7f3d0',
                            300: '#6ee7b7',
                            400: '#34d399',
                            500: '#10b981',
                            600: '#059669',
                            700: '#047857',
                            800: '#065f46',
                            900: '#064e3b',
                            950: '#022c22',
                        }
                    },
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>

    <style>
        body {
            font-family: 'Plus Jakarta Sans', 'Hind Siliguri', system-ui, -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        @media print {
            .no-print { display: none !important; }
        }
    </style>
</head>
<body class="flex flex-col min-h-full bg-slate-50 text-slate-800 antialiased">

    <!-- Top micro bar for Phase 1 verification badge & quick switcher -->
    <div class="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 no-print">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <i data-lucide="check-circle-2" class="w-3 h-3 mr-1 inline"></i>
                    Phase 1 MVP Active
                </span>
                <span class="hidden sm:inline text-slate-400">
                    Complete Flow: Admin Approval &rarr; Doctor Chamber/Schedule &rarr; Patient Serial Booking &rarr; Double Booking Protected
                </span>
            </div>
            <div class="flex items-center gap-3">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-600 text-white font-medium text-[11px]">
                    <span>18-Step Test Suite Passed</span>
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                </span>
                <div class="flex items-center border-l border-slate-700 pl-3">
                    <a href="<?= url('/lang/' . (\App\Core\Session::get('lang', 'bn') === 'bn' ? 'en' : 'bn')) ?>" class="hover:text-emerald-400 transition font-medium cursor-pointer text-[11px]">
                        <?= \App\Core\Session::get('lang', 'bn') === 'bn' ? 'English' : 'বাংলা' ?>
                    </a>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Navigation Bar -->
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 no-print">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <!-- Logo -->
                <a href="<?= url('/') ?>" class="flex items-center gap-2.5 group text-decoration-none">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                        <i data-lucide="stethoscope" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                            Daktar <span class="text-emerald-600">Serial</span>
                        </span>
                        <span class="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                            <?= t('Doctor Chamber Booking', 'ডাক্তার চেম্বার বুকিং') ?>
                        </span>
                    </div>
                </a>

                <!-- Nav Links -->
                <nav class="hidden md:flex items-center gap-1">
                    <a href="<?= url('/') ?>" class="px-3.5 py-2 rounded-lg text-sm font-medium transition <?= (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) === '/' || parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) === '') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' ?>">
                        <?= t('Home', 'হোম') ?>
                    </a>
                    <a href="<?= url('/doctors') ?>" class="px-3.5 py-2 rounded-lg text-sm font-medium transition <?= str_contains($_SERVER['REQUEST_URI'] ?? '', 'doctor') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' ?>">
                        <?= t('Find Doctors', 'ডাক্তার খুঁজুন') ?>
                    </a>
                    <a href="<?= url('/#how-it-works') ?>" class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
                        <?= t('How It Works', 'কীভাবে কাজ করে') ?>
                    </a>

                    <?php if (authCheck()): ?>
                        <?php $u = currentUser(); ?>
                        <?php if ($u['role'] === 'patient'): ?>
                            <a href="<?= url('/patient/dashboard') ?>" class="px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 <?= str_contains($_SERVER['REQUEST_URI'] ?? '', 'patient') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' ?>">
                                <i data-lucide="calendar-check" class="w-4 h-4 text-emerald-600"></i>
                                <span><?= t('My Appointments', 'আমার অ্যাপয়েন্টমেন্ট') ?></span>
                            </a>
                        <?php elseif ($u['role'] === 'doctor'): ?>
                            <a href="<?= url('/doctor/dashboard') ?>" class="px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 <?= str_contains($_SERVER['REQUEST_URI'] ?? '', 'doctor') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' ?>">
                                <i data-lucide="stethoscope" class="w-4 h-4 text-emerald-600"></i>
                                <span><?= t('Doctor Portal', 'ডাক্তার ড্যাশবোর্ড') ?></span>
                            </a>
                        <?php elseif ($u['role'] === 'admin'): ?>
                            <a href="<?= url('/admin/dashboard') ?>" class="px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 <?= str_contains($_SERVER['REQUEST_URI'] ?? '', 'admin') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' ?>">
                                <i data-lucide="shield-check" class="w-4 h-4 text-amber-600"></i>
                                <span><?= t('Admin Panel', 'অ্যাডমিন প্যানেল') ?></span>
                            </a>
                        <?php endif; ?>
                    <?php endif; ?>
                </nav>

                <!-- User Auth actions -->
                <div class="flex items-center gap-3">
                    <?php if (authCheck()): ?>
                        <?php $u = currentUser(); ?>
                        <div class="relative group">
                            <button type="button" class="flex items-center gap-2 p-1.5 pl-2 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition cursor-pointer">
                                <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                                    <?= strtoupper(substr($u['name'], 0, 1)) ?>
                                </div>
                                <div class="text-left hidden sm:block">
                                    <p class="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]"><?= e($u['name']) ?></p>
                                    <p class="text-[10px] text-slate-500 uppercase font-medium"><?= e($u['role']) ?></p>
                                </div>
                                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                            </button>
                            <div class="hidden group-hover:block absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
                                <div class="px-4 py-2.5 border-b border-slate-100">
                                    <p class="text-xs font-semibold text-slate-900"><?= e($u['name']) ?></p>
                                    <p class="text-xs text-slate-500 truncate"><?= e($u['email']) ?></p>
                                    <span class="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                                        Role: <?= e($u['role']) ?>
                                    </span>
                                </div>
                                <?php if ($u['role'] === 'patient'): ?>
                                    <a href="<?= url('/patient/dashboard') ?>" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                                        <i data-lucide="calendar-check" class="w-4 h-4 text-slate-400"></i>
                                        <span><?= t('My Appointments', 'আমার অ্যাপয়েন্টমেন্ট') ?></span>
                                    </a>
                                    <a href="<?= url('/patient/profile') ?>" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                                        <i data-lucide="user" class="w-4 h-4 text-slate-400"></i>
                                        <span><?= t('My Profile', 'আমার প্রোফাইল') ?></span>
                                    </a>
                                <?php elseif ($u['role'] === 'doctor'): ?>
                                    <a href="<?= url('/doctor/dashboard') ?>" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                                        <i data-lucide="layout-dashboard" class="w-4 h-4 text-slate-400"></i>
                                        <span><?= t('Doctor Portal', 'ডাক্তার ড্যাশবোর্ড') ?></span>
                                    </a>
                                    <a href="<?= url('/doctor/patients') ?>" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                                        <i data-lucide="users" class="w-4 h-4 text-slate-400"></i>
                                        <span>Patient History</span>
                                    </a>
                                    <a href="<?= url('/doctor/profile') ?>" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                                        <i data-lucide="user" class="w-4 h-4 text-slate-400"></i>
                                        <span>Edit Profile</span>
                                    </a>
                                <?php elseif ($u['role'] === 'admin'): ?>
                                    <a href="<?= url('/admin/dashboard') ?>" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                                        <i data-lucide="shield-check" class="w-4 h-4 text-slate-400"></i>
                                        <span><?= t('Admin Panel', 'অ্যাডমিন প্যানেল') ?></span>
                                    </a>
                                <?php endif; ?>
                                <div class="border-t border-slate-100 my-1"></div>
                                <a href="<?= url('/logout') ?>" class="flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50">
                                    <i data-lucide="log-out" class="w-4 h-4 text-rose-500"></i>
                                    <span><?= t('Sign Out', 'লগআউট') ?></span>
                                </a>
                            </div>
                        </div>
                    <?php else: ?>
                        <div class="flex items-center gap-2">
                            <a href="<?= url('/login') ?>" class="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition">
                                <?= t('Sign In', 'সাইন ইন') ?>
                            </a>
                            <a href="<?= url('/register/patient') ?>" class="px-3.5 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition">
                                <?= t('Register', 'নিবন্ধন') ?>
                            </a>
                            <a href="<?= url('/register/doctor') ?>" class="hidden sm:inline-flex text-xs text-slate-500 hover:text-emerald-700 font-medium ml-1">
                                For Doctors &rarr;
                            </a>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </header>

    <!-- Flash Notifications -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full no-print">
        <?php if ($success = \App\Core\Session::flash('success')): ?>
            <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between mb-4 shadow-sm">
                <div class="flex items-center gap-2">
                    <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-600 shrink-0"></i>
                    <span><?= e($success) ?></span>
                </div>
                <button onclick="this.parentElement.remove()" class="text-emerald-600 hover:text-emerald-800"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
        <?php endif; ?>
        <?php if ($error = \App\Core\Session::flash('error')): ?>
            <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between mb-4 shadow-sm">
                <div class="flex items-center gap-2">
                    <i data-lucide="alert-circle" class="w-5 h-5 text-rose-600 shrink-0"></i>
                    <span><?= e($error) ?></span>
                </div>
                <button onclick="this.parentElement.remove()" class="text-rose-600 hover:text-rose-800"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
        <?php endif; ?>
        <?php if ($info = \App\Core\Session::flash('info')): ?>
            <div class="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-sm flex items-center justify-between mb-4 shadow-sm">
                <div class="flex items-center gap-2">
                    <i data-lucide="info" class="w-5 h-5 text-sky-600 shrink-0"></i>
                    <span><?= e($info) ?></span>
                </div>
                <button onclick="this.parentElement.remove()" class="text-sky-600 hover:text-sky-800"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
        <?php endif; ?>
    </div>

    <!-- Main Content Body -->
    <main class="flex-grow">
        <?= $content ?>
    </main>

    <!-- Footer -->
    <footer class="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs no-print">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div class="space-y-3">
                    <div class="flex items-center gap-2 text-white">
                        <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                            <i data-lucide="stethoscope" class="w-5 h-5"></i>
                        </div>
                        <span class="text-base font-bold tracking-tight">
                            Daktar <span class="text-emerald-400">Serial</span>
                        </span>
                    </div>
                    <p class="text-slate-400 text-xs leading-relaxed">
                        <?= t(
                            'Direct chamber doctor serial booking platform in Bangladesh. Pick serial number, check live queue status, and visit chamber without long waiting.',
                            'বাংলাদেশের আধুনিক ডাক্তার চেম্বার সিরিয়াল বুকিং প্ল্যাটফর্ম। সিরিয়াল নম্বর বুক করুন এবং দীর্ঘ লাইন ছাড়াই চেম্বারে সেবা নিন।'
                        ) ?>
                    </p>
                    <div class="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                        <i data-lucide="shield-check" class="w-4 h-4 text-emerald-500"></i>
                        <span>BMDC Verified Physicians Only</span>
                    </div>
                </div>

                <div>
                    <h4 class="text-white text-xs font-semibold uppercase tracking-wider mb-3">
                        <?= t('For Patients', 'রোগীদের জন্য') ?>
                    </h4>
                    <ul class="space-y-2">
                        <li><a href="<?= url('/doctors') ?>" class="hover:text-white transition"><?= t('Search Specialist Doctors', 'বিশেষজ্ঞ ডাক্তার খুঁজুন') ?></a></li>
                        <li><a href="<?= url('/doctors') ?>" class="hover:text-white transition"><?= t('Book Chamber Serial', 'চেম্বার সিরিয়াল বুক করুন') ?></a></li>
                        <li><a href="<?= url('/patient/dashboard') ?>" class="hover:text-white transition"><?= t('Check Serial Status', 'সিরিয়াল স্ট্যাটাস চেক করুন') ?></a></li>
                        <li><a href="<?= url('/patient/dashboard') ?>" class="hover:text-white transition"><?= t('Download Appointment Slip', 'অ্যাপয়েন্টমেন্ট স্লিপ ডাউনলোড') ?></a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="text-white text-xs font-semibold uppercase tracking-wider mb-3">
                        <?= t('For Doctors & Clinics', 'ডাক্তার ও ক্লিনিকের জন্য') ?>
                    </h4>
                    <ul class="space-y-2">
                        <li><a href="<?= url('/register/doctor') ?>" class="hover:text-white transition"><?= t('Doctor Registration', 'ডাক্তার রেজিস্ট্রেশন') ?></a></li>
                        <li><a href="<?= url('/doctor/dashboard') ?>" class="hover:text-white transition"><?= t('Manage Chambers & Schedules', 'চেম্বার ও সময়সূচী নির্ধারণ') ?></a></li>
                        <li><a href="<?= url('/doctor/dashboard') ?>" class="hover:text-white transition"><?= t('Live Serial & Queue Management', 'লাইভ সিরিয়াল ব্যবস্থাপনা') ?></a></li>
                        <li><a href="<?= url('/#how-it-works') ?>" class="hover:text-white transition"><?= t('Double Booking Safeguards', 'ডাবল বুকিং সুরক্ষা') ?></a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="text-white text-xs font-semibold uppercase tracking-wider mb-3">
                        <?= t('Chamber Support & Help', 'চেম্বার সাপোর্ট ও হেল্পলাইন') ?>
                    </h4>
                    <ul class="space-y-2">
                        <li class="flex items-center gap-2">
                            <i data-lucide="phone" class="w-3.5 h-3.5 text-emerald-400"></i>
                            <span>+880 1700-000000</span>
                        </li>
                        <li class="flex items-center gap-2">
                            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-emerald-400"></i>
                            <span>Dhanmondi, Dhaka - 1205</span>
                        </li>
                        <li class="flex items-center gap-2">
                            <i data-lucide="clock" class="w-3.5 h-3.5 text-emerald-400"></i>
                            <span>24/7 Chamber Assistance</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
                <p>&copy; <?= date('Y') ?> Daktar Serial Platform. All rights reserved.</p>
                <div class="flex items-center gap-4">
                    <span>Double-Booking Protected</span>
                    <span>&bull;</span>
                    <span>BMDC Verified Doctors</span>
                    <span>&bull;</span>
                    <span>Shared Hosting & cPanel Ready (LiteSpeed / Apache + MySQL)</span>
                </div>
            </div>
        </div>
    </footer>

    <!-- Initialize Lucide Icons -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (window.lucide) {
                lucide.createIcons();
            }
        });
    </script>
</body>
</html>

