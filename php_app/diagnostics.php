<?php
/**
 * Daktar Serial (ডাক্তার সিরিয়াল) - Server Diagnostics & Health Check
 * Quickly detects why HTTP 500 or database connection errors happen on cPanel/LiteSpeed.
 */

declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '1');

$phpVersion = PHP_VERSION;
$phpOk = version_compare($phpVersion, '8.1.0', '>=');

// Check extensions
$requiredExtensions = [
    'pdo' => 'PDO Core',
    'pdo_mysql' => 'PDO MySQL Driver',
    'mbstring' => 'Multibyte String (Bangla text support)',
    'json' => 'JSON Parser',
    'session' => 'PHP Session Engine',
];

$extensionStatus = [];
$allExtensionsOk = true;
foreach ($requiredExtensions as $ext => $label) {
    $loaded = extension_loaded($ext);
    $extensionStatus[$ext] = [
        'label' => $label,
        'loaded' => $loaded
    ];
    if (!$loaded) {
        $allExtensionsOk = false;
    }
}

// Check database
$configFile = __DIR__ . '/config/config.php';
$dbConnected = false;
$dbError = null;
$tableStats = [];
$missingCoreTables = [];
$configData = null;

if (file_exists($configFile)) {
    $configData = require $configFile;
    $dbConfig = $configData['db'] ?? [];

    try {
        $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['database']};charset=utf8mb4";
        $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $dbConnected = true;

        // Auto-fix tables request
        if (isset($_GET['action']) && $_GET['action'] === 'fix_tables') {
            $sqlFile = __DIR__ . '/database/complete_daktar_serial.sql';
            if (file_exists($sqlFile)) {
                $rawSql = file_get_contents($sqlFile);
                if (!empty($rawSql)) {
                    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
                    $statements = preg_split('/;\s*[\r\n]+/', $rawSql);
                    foreach ($statements as $stmt) {
                        $cleanStmt = trim($stmt);
                        if (!empty($cleanStmt) && !str_starts_with($cleanStmt, '--') && !str_starts_with($cleanStmt, '/*')) {
                            try {
                                $pdo->exec($cleanStmt);
                            } catch (\Throwable $e) {}
                        }
                    }
                    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
                }
            }
            // Always ensure reviews table
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS reviews (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    appointment_id INT UNSIGNED NOT NULL UNIQUE,
                    doctor_id INT UNSIGNED NOT NULL,
                    patient_id INT UNSIGNED NOT NULL,
                    rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
                    review_text TEXT NULL,
                    is_approved TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_reviews_doctor (doctor_id, is_approved)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
            header("Location: diagnostics.php?fixed=1");
            exit;
        }

        // Check tables
        $tablesStmt = $pdo->query("SHOW TABLES");
        $existingTables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

        $coreTables = ['users', 'specialties', 'doctors', 'patients', 'chambers', 'doctor_schedules', 'appointments', 'reviews', 'hospitals', 'settings', 'notifications', 'payments'];
        foreach ($coreTables as $tb) {
            if (in_array($tb, $existingTables)) {
                $count = (int)$pdo->query("SELECT COUNT(*) FROM `{$tb}`")->fetchColumn();
                $tableStats[$tb] = $count;
            } else {
                $missingCoreTables[] = $tb;
            }
        }
    } catch (PDOException $e) {
        $dbError = $e->getMessage();
    }
} else {
    $dbError = "config/config.php ফাইলটি খুঁজে পাওয়া যায়নি!";
}

// Config writable check
$configWritable = is_writable($configFile) || is_writable(__DIR__ . '/config');

// Routing environment detection
$scriptDir = dirname(str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? ''));
$baseAppPath = ($scriptDir === '/' || $scriptDir === '\\' || $scriptDir === '.') ? '' : rtrim($scriptDir, '/');
$homeUrl = $baseAppPath !== '' ? $baseAppPath . '/' : '/';
$doctorsUrl = $baseAppPath . '/doctors';
$loginUrl = $baseAppPath . '/login';
$registerUrl = $baseAppPath . '/register/patient';
$testQueryUrl = $baseAppPath . '/index.php?r=/doctors';
?>
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daktar Serial - Server Diagnostics</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Hind Siliguri', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen py-8 px-4">
    <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <span>🩺 সার্ভার স্বাস্থ্য পরীক্ষা (Server Diagnostics)</span>
                </h1>
                <p class="text-sm text-slate-500 mt-1">HTTP 500 এর কারণ ও সমাধান নির্ণয়</p>
            </div>
            <div class="flex gap-2">
                <a href="install.php" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow transition">
                    ⚙️ Web Installer
                </a>
                <a href="<?= htmlspecialchars($homeUrl) ?>" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-300 transition">
                    হোমপেজ
                </a>
            </div>
        </div>

        <div class="space-y-6">
            <!-- 1. PHP Version -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="font-bold text-slate-800 text-base flex items-center gap-2">
                        <span>1. পিএইচপি ভার্সন (PHP Version)</span>
                    </h2>
                    <?php if ($phpOk): ?>
                        <span class="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                            ✓ বর্তমান ভার্সন: PHP <?= htmlspecialchars($phpVersion) ?> (সঠিক)
                        </span>
                    <?php else: ?>
                        <span class="bg-rose-100 text-rose-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                            ✕ বর্তমান ভার্সন: PHP <?= htmlspecialchars($phpVersion) ?> (ত্রুটিপূর্ণ)
                        </span>
                    <?php endif; ?>
                </div>

                <?php if (!$phpOk): ?>
                    <div class="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-900 leading-relaxed">
                        <strong class="font-bold">⚠️ সমস্যা:</strong> আপনার সার্ভারে বর্তমানে <strong>PHP <?= htmlspecialchars($phpVersion) ?></strong> চলছে। ডাক্তার সিরিয়াল অ্যাপ্লিকেশনের জন্য <strong>PHP 8.1 অথবা 8.2</strong> প্রয়োজন। এটিই 500 Internal Server Error তৈরি করছে!
                        <div class="mt-3 pt-3 border-t border-rose-200">
                            <strong>সমাধান:</strong> আপনার cPanel-এ প্রবেশ করে <strong>MultiPHP Manager</strong> অথবা <strong>Select PHP Version</strong>-এ যান এবং ডোমেইনের জন্য <strong>PHP 8.2</strong> সিলেক্ট করে সেভ করুন।
                        </div>
                    </div>
                <?php else: ?>
                    <p class="text-xs text-slate-500">
                        আপনার সার্ভারের PHP ভার্সন (<?= htmlspecialchars($phpVersion) ?>) সম্পূর্ণ উপযোগী।
                    </p>
                <?php endif; ?>
            </div>

            <!-- 2. Extensions -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 class="font-bold text-slate-800 text-base mb-4">
                    2. প্রয়োজনীয় পিএইচপি এক্সটেনশন (PHP Extensions)
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <?php foreach ($extensionStatus as $ext => $info): ?>
                        <div class="p-3 rounded-xl border flex items-center justify-between <?= $info['loaded'] ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-300' ?>">
                            <div>
                                <span class="font-mono text-xs font-bold text-slate-800"><?= $ext ?></span>
                                <div class="text-[11px] text-slate-500"><?= $info['label'] ?></div>
                            </div>
                            <div>
                                <?= $info['loaded'] ? '<span class="text-emerald-600 font-bold text-sm">✓ Active</span>' : '<span class="text-rose-600 font-bold text-sm">✕ Missing</span>' ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- 3. Database Connection -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="font-bold text-slate-800 text-base">
                        3. ডাটাবেস কানেকশন স্ট্যাটাস (Database Status)
                    </h2>
                    <?php if ($dbConnected): ?>
                        <span class="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
                            ✓ কানেক্টেড (Connected)
                        </span>
                    <?php else: ?>
                        <span class="bg-rose-100 text-rose-800 text-xs font-semibold px-3 py-1 rounded-full">
                            ✕ কানেকশন ব্যর্থ (Failed)
                        </span>
                    <?php endif; ?>
                </div>

                <?php if ($dbConnected): ?>
                    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-xs text-emerald-800">
                        MySQL ডাটাবেস <strong><?= htmlspecialchars($configData['db']['database']) ?></strong> এ সফলভাবে কানেক্ট হয়েছে (User: <?= htmlspecialchars($configData['db']['username']) ?>)।
                    </div>

                    <?php if (!empty($missingCoreTables)): ?>
                        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-4">
                            <strong>⚠️ মিসিং টেবিল শনাক্ত:</strong> নিচের টেবিলগুলো এখনও আপনার ডাটাবেসে তৈরি করা হয়নি:
                            <div class="mt-2 font-mono text-xs font-bold text-amber-800">
                                <?= implode(', ', $missingCoreTables) ?>
                            </div>
                            <div class="mt-3 flex flex-wrap gap-2">
                                <a href="diagnostics.php?action=fix_tables" class="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm">
                                    ⚡ এখনই মিসিং টেবিল তৈরি করুন (Auto-Create Missing Tables)
                                </a>
                                <a href="install.php" class="inline-block bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition">
                                    🚀 ফুল ওয়েব ইনস্টলার
                                </a>
                            </div>
                        </div>
                    <?php else: ?>
                        <div class="border border-slate-200 rounded-xl overflow-hidden">
                            <table class="w-full text-xs text-left">
                                <thead class="bg-slate-100 text-slate-700 uppercase font-semibold">
                                    <tr>
                                        <th class="px-4 py-2.5">টেবিল নাম (Table Name)</th>
                                        <th class="px-4 py-2.5">মোট রেকর্ড (Rows)</th>
                                        <th class="px-4 py-2.5">স্ট্যাটাস</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-200">
                                    <?php foreach ($tableStats as $table => $rows): ?>
                                        <tr class="hover:bg-slate-50">
                                            <td class="px-4 py-2 font-mono font-medium text-slate-800"><?= $table ?></td>
                                            <td class="px-4 py-2 text-slate-600"><?= $rows ?> টি রেকর্ড</td>
                                            <td class="px-4 py-2 text-emerald-600 font-semibold">✓ ওকে</td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php endif; ?>

                <?php else: ?>
                    <div class="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-900 leading-relaxed">
                        <div class="font-bold text-rose-800 mb-1">❌ কানেকশন ব্যর্থ হয়েছে:</div>
                        <div class="font-mono text-xs bg-white/70 p-2.5 rounded border border-rose-200 text-rose-800 overflow-x-auto mb-3">
                            <?= htmlspecialchars($dbError ?? 'Unknown error') ?>
                        </div>
                        <p class="text-xs text-slate-600">
                            <strong>সমাধান:</strong> আপনার <code>config/config.php</code> ফাইলে অথবা <a href="install.php" class="text-emerald-700 font-bold underline">ওয়েব ইনস্টলার</a> পেজে গিয়ে সঠিক MySQL Database Name, User এবং Password দিন।
                        </p>
                        <div class="mt-4">
                            <a href="install.php" class="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow transition">
                                ⚙️ ডাটাবেস ঠিক করতে এখানে ক্লিক করুন (Open Web Installer)
                            </a>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
            <!-- 4. Route & Page Resolution Diagnostics -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="font-bold text-slate-800 text-base flex items-center gap-2">
                        <span>🌐 পেজ ও রাউটিং টেস্ট (Page & Routing Diagnostics)</span>
                    </h2>
                    <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                        সিস্টেম অ্যাক্টিভ
                    </span>
                </div>

                <div class="text-xs text-slate-600 mb-4 leading-relaxed">
                    নিচে আপনার অ্যাপ্লিকেশনের সমস্ত প্রধান পেজের টেস্ট লিঙ্ক দেওয়া হলো। সার্ভারে <code>mod_rewrite</code> বা সাব-ফোল্ডার সংক্রান্ত কোনো সমস্যা আছে কিনা তা সহজেই যাচাই করুন:
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <a href="<?= htmlspecialchars($homeUrl) ?>" target="_blank" class="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-800 transition flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🏠</span>
                            <div>
                                <strong class="block">হোমপেজ (Home)</strong>
                                <span class="text-[11px] text-slate-500 font-mono"><?= htmlspecialchars($homeUrl) ?></span>
                            </div>
                        </div>
                        <span class="text-emerald-600 font-bold">&rarr;</span>
                    </a>

                    <a href="<?= htmlspecialchars($doctorsUrl) ?>" target="_blank" class="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-800 transition flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🩺</span>
                            <div>
                                <strong class="block">ডাক্তার তালিকা (Doctors)</strong>
                                <span class="text-[11px] text-slate-500 font-mono"><?= htmlspecialchars($doctorsUrl) ?></span>
                            </div>
                        </div>
                        <span class="text-emerald-600 font-bold">&rarr;</span>
                    </a>

                    <a href="<?= htmlspecialchars($loginUrl) ?>" target="_blank" class="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-800 transition flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🔑</span>
                            <div>
                                <strong class="block">লগইন (Login)</strong>
                                <span class="text-[11px] text-slate-500 font-mono"><?= htmlspecialchars($loginUrl) ?></span>
                            </div>
                        </div>
                        <span class="text-emerald-600 font-bold">&rarr;</span>
                    </a>

                    <a href="<?= htmlspecialchars($registerUrl) ?>" target="_blank" class="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-800 transition flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">📋</span>
                            <div>
                                <strong class="block">নিবন্ধন (Patient Register)</strong>
                                <span class="text-[11px] text-slate-500 font-mono"><?= htmlspecialchars($registerUrl) ?></span>
                            </div>
                        </div>
                        <span class="text-emerald-600 font-bold">&rarr;</span>
                    </a>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <span class="font-bold text-slate-700 block mb-1">🛠️ সার্ভার পাথ ডিটেকশন ভেরিয়েবল:</span>
                    <ul class="space-y-1 font-mono text-[11px]">
                        <li>REQUEST_URI: <span class="text-slate-800 font-bold"><?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '') ?></span></li>
                        <li>SCRIPT_NAME: <span class="text-slate-800 font-bold"><?= htmlspecialchars($_SERVER['SCRIPT_NAME'] ?? '') ?></span></li>
                        <li>DETECTED BASE: <span class="text-emerald-700 font-bold"><?= htmlspecialchars($baseAppPath ?: '/') ?></span></li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
