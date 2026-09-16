<?php
declare(strict_types=1);

/**
 * Daktar Serial (ডাক্তার সিরিয়াল) - Front Controller Entry Point
 */

// Enable error reporting immediately so any fatal error or warning is visible (suppress minor PHP 8.5 deprecations)
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

// Register shutdown handler for any fatal or compile error
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            http_response_code(500);
        }
        echo "<!DOCTYPE html><html lang='bn'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Server Error - Daktar Serial</title><script src='https://cdn.tailwindcss.com'></script></head>";
        echo "<body class='bg-slate-50 p-6 flex items-center justify-center min-h-screen'>";
        echo "<div class='max-w-xl w-full bg-white rounded-2xl border border-rose-200 p-6 shadow-xl'>";
        echo "<div class='text-rose-600 text-3xl mb-2'>⚠️</div>";
        echo "<h2 class='text-xl font-bold text-slate-900 mb-2'>সার্ভার এরর (Fatal Server Error)</h2>";
        echo "<div class='bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs font-mono text-rose-900 break-words mb-4'>";
        echo htmlspecialchars($error['message']);
        echo "<div class='text-[11px] text-slate-500 mt-2 font-mono'>File: " . htmlspecialchars($error['file']) . " (Line: " . $error['line'] . ")</div>";
        echo "</div>";
        echo "<div class='flex gap-2'>";
        echo "<a href='diagnostics.php' class='bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition'>🩺 ডায়াগনস্টিকস চালান</a>";
        echo "<a href='install.php' class='bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition'>⚙️ ওয়েব ইন্সটলার</a>";
        echo "</div>";
        echo "</div></body></html>";
    }
});

// 1. PHP Version Compatibility Guard
if (version_compare(PHP_VERSION, '8.1.0', '<')) {
    http_response_code(500);
    ?>
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PHP Version Error - Daktar Serial</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
        <style>body { font-family: 'Hind Siliguri', sans-serif; }</style>
    </head>
    <body class="bg-slate-50 text-slate-800 min-h-screen flex items-center justify-center p-4">
        <div class="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-rose-200 p-8 text-center">
            <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                ⚠️
            </div>
            <h1 class="text-2xl font-bold text-slate-900 mb-2">পিএইচপি ভার্সন আপডেট প্রয়োজন</h1>
            <p class="text-slate-600 text-sm mb-6">
                আপনার সার্ভারে বর্তমানে <strong>PHP <?= htmlspecialchars(PHP_VERSION) ?></strong> চলছে। ডাক্তার সিরিয়াল অ্যাপ্লিকেশনের জন্য <strong>PHP 8.1 অথবা PHP 8.2</strong> প্রয়োজন।
            </p>
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs text-slate-700 leading-relaxed mb-6">
                <strong class="text-slate-900 block mb-1">🔧 যেভাবে ঠিক করবেন (cPanel Steps):</strong>
                1. আপনার <strong>cPanel</strong>-এ লগইন করুন।<br>
                2. <strong>MultiPHP Manager</strong> অথবা <strong>Select PHP Version</strong> অপশনটি খুঁজুন।<br>
                3. আপনার ডোমেইনের জন্য <strong>PHP 8.2</strong> সিলেক্ট করে <strong>Apply / Save</strong> করুন।
            </div>
            <a href="diagnostics.php" class="inline-block bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition">
                সার্ভার ডায়াগনস্টিকস দেখুন (Open Diagnostics)
            </a>
        </div>
    </body>
    </html>
    <?php
    exit;
}

try {
    // 2. Autoload function for Daktar Serial application classes
    spl_autoload_register(function ($class) {
        $prefix = 'App\\';
        $baseDir = __DIR__ . '/app/';

        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) !== 0) {
            return;
        }

        $relativeClass = substr($class, $len);
        $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

        if (file_exists($file)) {
            require_once $file;
        }
    });

    // 3. Load configuration
    $configFile = __DIR__ . '/config/config.php';
    if (!file_exists($configFile)) {
        header("Location: install.php");
        exit;
    }

    $config = require_once $configFile;

    // 4. Helper for translation
    require_once __DIR__ . '/app/Core/helpers.php';

    // 5. Initialize session safely
    App\Core\Session::start();

    // 6. Dispatch router
    $router = new App\Core\Router();
    require_once __DIR__ . '/routes/web.php';

    $router->dispatch();

} catch (\Throwable $e) {
    http_response_code(500);

    $isDbError = ($e instanceof \PDOException) || 
                 str_contains($e->getMessage(), 'SQLSTATE') || 
                 str_contains($e->getMessage(), 'Table') || 
                 str_contains($e->getMessage(), 'Access denied');

    ?>
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?= $isDbError ? 'Database Setup Required' : 'Application Error' ?> - Daktar Serial</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
        <style>body { font-family: 'Hind Siliguri', sans-serif; }</style>
    </head>
    <body class="bg-slate-50 text-slate-800 min-h-screen flex items-center justify-center p-4">
        <div class="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div class="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-6 text-white text-center">
                <div class="text-3xl mb-2"><?= $isDbError ? '🗄️' : '⚠️' ?></div>
                <h1 class="text-2xl font-bold">
                    <?= $isDbError ? 'ডাটাবেস সেটআপ প্রয়োজন (Database Setup Required)' : 'অ্যাপ্লিকেশন এরর (Application Error)' ?>
                </h1>
                <p class="text-emerald-100 text-sm mt-1">Daktar Serial - Diagnostic & Recovery</p>
            </div>

            <div class="p-8">
                <div class="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs font-mono text-rose-900 break-words mb-6">
                    <strong class="font-sans block text-sm font-bold text-rose-800 mb-1">Error Details:</strong>
                    <?= htmlspecialchars($e->getMessage()) ?>
                </div>

                <?php if ($isDbError): ?>
                    <p class="text-sm text-slate-600 mb-6 leading-relaxed">
                        আপনার MySQL ডাটাবেসের ইউজারনেম, পাসওয়ার্ড অথবা টেবিলসমূহ কনফিগার করা বাকি রয়েছে। 
                        আপনি নিচের <strong>1-Click Web Installer</strong> বাটনে ক্লিক করে সহজেই ১ মিনিটে ডাটাবেস ঠিক করে নিতে পারেন।
                    </p>

                    <div class="flex flex-col sm:flex-row gap-3">
                        <a href="install.php" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-center shadow-lg shadow-emerald-600/20 transition">
                            🚀 1-ক্লিকে ডাটাবেস সেটআপ করুন (Open Web Installer)
                        </a>
                        <a href="diagnostics.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-5 rounded-xl border border-slate-300 text-center transition">
                            🩺 ডায়াগনস্টিকস
                        </a>
                    </div>
                <?php else: ?>
                    <div class="text-xs text-slate-500 mb-6">
                        File: <code><?= htmlspecialchars($e->getFile()) ?></code> (Line: <?= $e->getLine() ?>)
                    </div>
                    <div class="flex gap-3">
                        <a href="javascript:location.reload()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl transition">
                            রিলোড দিন (Reload)
                        </a>
                        <a href="diagnostics.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-xl border border-slate-300 transition">
                            ডায়াগনস্টিকস
                        </a>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}
