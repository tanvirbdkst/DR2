<div class="max-w-xl mx-auto px-4 py-12 text-center">
    <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-5">
        <div class="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <i data-lucide="alert-octagon" class="w-8 h-8"></i>
        </div>
        
        <div>
            <h1 class="text-2xl font-bold text-slate-900"><?= t('Page Not Found (404)', 'পৃষ্ঠাটি খুঁজে পাওয়া যায়নি (404)') ?></h1>
            <p class="text-xs text-slate-500 mt-1">
                <?= t('The URL you requested is not available or has been moved.', 'আপনি যে পৃষ্ঠা বা ডাক্তারের তথ্য খুঁজছেন তা পাওয়া যায়নি বা ঠিকানা ভুল রয়েছে।') ?>
            </p>
        </div>

        <?php if (!empty($requestedUri)): ?>
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">অনুরোধকৃত লিঙ্ক (Requested Path):</span>
                <code class="text-xs font-mono text-rose-700 break-all"><?= e($requestedUri) ?></code>
            </div>
        <?php endif; ?>

        <!-- Primary Return Action -->
        <div class="pt-2">
            <a href="<?= url('/') ?>" class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer w-full sm:w-auto">
                <i data-lucide="home" class="w-4 h-4"></i>
                <span><?= t('Back to Homepage', 'সরাসরি হোমপেজে যান') ?></span>
            </a>
        </div>

        <!-- Quick Working Navigation Links -->
        <div class="pt-4 border-t border-slate-100 text-left">
            <span class="text-xs font-semibold text-slate-700 block mb-2.5">
                <?= t('Popular Pages (জরুরি পেইজসমূহ):', 'প্রয়োজনীয় পেইজসমূহ:') ?>
            </span>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <a href="<?= url('/doctors') ?>" class="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition flex items-center gap-1.5 font-medium">
                    <i data-lucide="stethoscope" class="w-3.5 h-3.5 text-emerald-600"></i>
                    <span>ডাক্তার তালিকা</span>
                </a>
                <a href="<?= url('/login') ?>" class="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition flex items-center gap-1.5 font-medium">
                    <i data-lucide="log-in" class="w-3.5 h-3.5 text-emerald-600"></i>
                    <span>লগইন করুন</span>
                </a>
                <a href="<?= url('/register/patient') ?>" class="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition flex items-center gap-1.5 font-medium">
                    <i data-lucide="user-plus" class="w-3.5 h-3.5 text-emerald-600"></i>
                    <span>রোগী রেজিস্ট্রেশন</span>
                </a>
                <a href="<?= url('/register/doctor') ?>" class="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition flex items-center gap-1.5 font-medium">
                    <i data-lucide="user-check" class="w-3.5 h-3.5 text-emerald-600"></i>
                    <span>ডাক্তার নিবন্ধন</span>
                </a>
                <a href="<?= url('/diagnostics.php') ?>" class="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition flex items-center gap-1.5 font-medium">
                    <i data-lucide="activity" class="w-3.5 h-3.5 text-emerald-600"></i>
                    <span>ডায়াগনস্টিকস</span>
                </a>
                <a href="<?= url('/install.php') ?>" class="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition flex items-center gap-1.5 font-medium">
                    <i data-lucide="database" class="w-3.5 h-3.5 text-emerald-600"></i>
                    <span>ডাটাবেস সেটআপ</span>
                </a>
            </div>
        </div>
    </div>
</div>
