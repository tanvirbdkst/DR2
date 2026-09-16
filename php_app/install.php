<?php
/**
 * Daktar Serial (ডাক্তার সিরিয়াল) - 1-Click cPanel Web Installer & Database Configurator
 * Helps users configure database credentials and import tables without manually running SQL queries.
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

$configFile = __DIR__ . '/config/config.php';
$sqlFile = __DIR__ . '/database/complete_daktar_serial.sql';

// Read existing config if present
$existingConfig = [];
if (file_exists($configFile)) {
    $existingConfig = require $configFile;
}

$dbHost = $_POST['db_host'] ?? ($existingConfig['db']['host'] ?? 'localhost');
$dbPort = (int)($_POST['db_port'] ?? ($existingConfig['db']['port'] ?? 3306));
$dbName = $_POST['db_name'] ?? ($existingConfig['db']['database'] ?? 'pixeswpo_dr');
$dbUser = $_POST['db_user'] ?? ($existingConfig['db']['username'] ?? '');
$dbPass = $_POST['db_pass'] ?? ($existingConfig['db']['password'] ?? '');

$scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
$defaultUrl = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$appUrl = $_POST['app_url'] ?? ($existingConfig['app']['url'] ?? $defaultUrl);

$message = null;
$messageType = null;
$installationSuccess = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'install';

    if (empty($dbName) || empty($dbUser)) {
        $message = "অনুগ্রহ করে ডাটাবেস নাম (Database Name) এবং ইউজারনেম (Username) প্রদান করুন।";
        $messageType = "danger";
    } else {
        try {
            // Test PDO Connection
            $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ];
            $pdo = new PDO($dsn, $dbUser, $dbPass, $options);

            // If user only wanted to test connection
            if ($action === 'test') {
                $message = "✅ ডাটাবেস কানেকশন সফল হয়েছে! আপনি এখন 'Save & Install Database' বাটনে ক্লিক করতে পারেন।";
                $messageType = "success";
            } else {
                // Read complete SQL file
                if (!file_exists($sqlFile)) {
                    throw new Exception("SQL ফাইল পাওয়া যায়নি: database/complete_daktar_serial.sql");
                }

                $sqlContent = file_get_contents($sqlFile);
                if (!$sqlContent) {
                    throw new Exception("SQL ফাইলটি খালি অথবা পড়া যাচ্ছে না।");
                }

                // Execute SQL script safely statement by statement
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
                $statements = preg_split('/;\s*[\r\n]+/', $sqlContent);
                foreach ($statements as $stmt) {
                    $cleanStmt = trim($stmt);
                    if (!empty($cleanStmt) && !str_starts_with($cleanStmt, '--') && !str_starts_with($cleanStmt, '/*')) {
                        try {
                            $pdo->exec($cleanStmt);
                        } catch (\Throwable $e) {
                            // Ignore minor duplicate warnings
                        }
                    }
                }
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

                // Update config/config.php file safely
                $configContent = "<?php\n" .
                    "declare(strict_types=1);\n\n" .
                    "return [\n" .
                    "    'app' => [\n" .
                    "        'name' => 'Daktar Serial',\n" .
                    "        'tagline_bn' => 'সহজেই ডাক্তার দেখানোর সিরিয়াল নিন',\n" .
                    "        'url' => '" . addslashes($appUrl) . "',\n" .
                    "        'lang' => 'bn',\n" .
                    "        'debug' => false,\n" .
                    "        'upload_max_size' => 5 * 1024 * 1024,\n" .
                    "    ],\n" .
                    "    'db' => [\n" .
                    "        'host' => '" . addslashes($dbHost) . "',\n" .
                    "        'port' => " . (int)$dbPort . ",\n" .
                    "        'database' => '" . addslashes($dbName) . "',\n" .
                    "        'username' => '" . addslashes($dbUser) . "',\n" .
                    "        'password' => '" . addslashes($dbPass) . "',\n" .
                    "        'charset' => 'utf8mb4',\n" .
                    "    ],\n" .
                    "    'session' => [\n" .
                    "        'lifetime' => 86400 * 7,\n" .
                    "        'cookie_name' => 'daktar_session',\n" .
                    "    ],\n" .
                    "];\n";

                if (file_put_contents($configFile, $configContent) === false) {
                    throw new Exception("config/config.php ফাইলে লেখার পারমিশন নেই। অনুগ্রহ করে ফাইলটির পারমিশন 644 অথবা 666 দিন।");
                }

                $installationSuccess = true;
                $message = "🎉 অভিনন্দন! ডাটাবেস সম্পূর্ণ সেটআপ এবং কনফিগারেশন সফলভাবে সম্পন্ন হয়েছে।";
                $messageType = "success";
            }
        } catch (PDOException $e) {
            $message = "❌ ডাটাবেস কানেকশন ত্রুটি (MySQL Error): " . htmlspecialchars($e->getMessage());
            $messageType = "danger";
        } catch (Exception $e) {
            $message = "❌ ত্রুটি: " . htmlspecialchars($e->getMessage());
            $messageType = "danger";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daktar Serial - Database Installer & Setup</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Hind Siliguri', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen py-10 px-4">
    <div class="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-6 text-white text-center">
            <div class="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-3">
                <svg class="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
            </div>
            <h1 class="text-2xl font-bold">ডাক্তার সিরিয়াল (Daktar Serial)</h1>
            <p class="text-emerald-100 text-sm mt-1">1-Click cPanel Web Installer & Database Configuration</p>
        </div>

        <div class="p-8">
            <!-- Alert Message -->
            <?php if ($message): ?>
                <div class="mb-6 p-4 rounded-xl border <?= $messageType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800' ?>">
                    <div class="flex items-start gap-3">
                        <div class="text-lg"><?= $messageType === 'success' ? '✅' : '⚠️' ?></div>
                        <div class="text-sm font-medium leading-relaxed"><?= $message ?></div>
                    </div>
                </div>
            <?php endif; ?>

            <?php if ($installationSuccess): ?>
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                    <h3 class="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
                        <span>🔑 ডিফল্ট লগইন ক্রেডেনশিয়াল (Default Credentials):</span>
                    </h3>
                    <div class="space-y-2 text-sm">
                        <div class="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                            <div>
                                <span class="font-semibold text-emerald-700">অ্যাডমিন (Admin):</span>
                                <span class="text-slate-600 ml-2">admin@daktarserial.com</span>
                            </div>
                            <span class="bg-slate-100 px-2 py-1 rounded text-xs font-mono">admin123</span>
                        </div>
                        <div class="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                            <div>
                                <span class="font-semibold text-teal-700">ডাক্তার (Doctor):</span>
                                <span class="text-slate-600 ml-2">doctor@daktarserial.com</span>
                            </div>
                            <span class="bg-slate-100 px-2 py-1 rounded text-xs font-mono">Password123!</span>
                        </div>
                        <div class="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                            <div>
                                <span class="font-semibold text-blue-700">রোগী (Patient):</span>
                                <span class="text-slate-600 ml-2">patient@daktarserial.com</span>
                            </div>
                            <span class="bg-slate-100 px-2 py-1 rounded text-xs font-mono">Password123!</span>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4">
                    <a href="/" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-center shadow-lg shadow-emerald-600/20 transition">
                        ওয়েবসাইটে যান (Go to Website) →
                    </a>
                    <a href="/login" class="bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-6 rounded-xl text-center transition">
                        লগইন করুন (Login)
                    </a>
                </div>

            <?php else: ?>

                <form method="POST" action="install.php" class="space-y-5">
                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 leading-relaxed">
                        💡 <strong>cPanel টিপস:</strong> আপনার cPanel-এর <strong>MySQL® Databases</strong> থেকে যে ডাটাবেস ও ডাটাবেস ইউজার তৈরি করেছেন, তার নাম ও পাসওয়ার্ড নিচের বক্সে দিন।
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                Database Host
                            </label>
                            <input type="text" name="db_host" value="<?= htmlspecialchars($dbHost) ?>" required
                                   class="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm">
                            <p class="text-[11px] text-slate-500 mt-1">সাধারণত <code>localhost</code> থাকে</p>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                Database Port
                            </label>
                            <input type="number" name="db_port" value="<?= htmlspecialchars((string)$dbPort) ?>" required
                                   class="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm">
                            <p class="text-[11px] text-slate-500 mt-1">ডিফল্ট <code>3306</code></p>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                            Database Name
                        </label>
                        <input type="text" name="db_name" value="<?= htmlspecialchars($dbName) ?>" required placeholder="e.g. pixeswpo_dr"
                               class="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm">
                        <p class="text-[11px] text-slate-500 mt-1">cPanel ডাটাবেসের পুরো নাম (যেমন <code>pixeswpo_dr</code>)</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                Database User
                            </label>
                            <input type="text" name="db_user" value="<?= htmlspecialchars($dbUser) ?>" required placeholder="e.g. pixeswpo_druser"
                                   class="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm">
                            <p class="text-[11px] text-slate-500 mt-1">cPanel ডাটাবেস ইউজারনেম</p>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                Database Password
                            </label>
                            <input type="password" name="db_pass" value="<?= htmlspecialchars($dbPass) ?>" placeholder="আপনার ডাটাবেস পাসওয়ার্ড"
                                   class="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm">
                            <p class="text-[11px] text-slate-500 mt-1">ডাটাবেস ইউজারের জন্য দেয়া পাসওয়ার্ড</p>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                            Website URL
                        </label>
                        <input type="url" name="app_url" value="<?= htmlspecialchars($appUrl) ?>" required
                               class="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm">
                        <p class="text-[11px] text-slate-500 mt-1">যেমন <code>https://dakatarseial.bd</code></p>
                    </div>

                    <div class="pt-4 flex flex-col sm:flex-row gap-3">
                        <button type="submit" name="action" value="install"
                                class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2">
                            <span>🚀 সেভ করুন এবং ডাটাবেস ইন্সটল করুন</span>
                        </button>
                        <button type="submit" name="action" value="test"
                                class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-5 rounded-xl border border-slate-300 transition">
                            🔍 শুধু কানেকশন টেস্ট
                        </button>
                    </div>
                </form>

                <div class="mt-8 pt-6 border-t border-slate-200 text-center">
                    <a href="diagnostics.php" class="text-xs text-slate-500 hover:text-emerald-700 underline">
                        সার্ভার ও পিএইচপি স্বাস্থ্য পরীক্ষা দেখতে চান? Open Diagnostics &raquo;
                    </a>
                </div>

            <?php endif; ?>
        </div>
    </div>
</body>
</html>
