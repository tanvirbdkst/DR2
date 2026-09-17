<div class="max-w-md mx-auto px-4 py-12">
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div class="text-center space-y-2">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 mx-auto">
                <i data-lucide="stethoscope" class="w-6 h-6"></i>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                <?= t('Sign In to Daktar Serial', 'লগইন করুন') ?>
            </h1>
            <p class="text-xs text-slate-500">
                <?= t('Enter your email and password to access your account', 'আপনার ইমেইল ও পাসওয়ার্ড দিয়ে একাউন্টে প্রবেশ করুন') ?>
            </p>
        </div>

        <!-- Quick Demo Fill Pills -->
        <div class="bg-slate-50 rounded-2xl border border-slate-200 p-3 text-left">
            <span class="text-[11px] font-bold text-slate-600 block mb-2">
                <?= t('Quick Demo Credentials:', 'ডেমো লগইন অ্যাকাউন্ট:') ?>
            </span>
            <div class="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                    type="button"
                    onclick="fillLogin('admin@daktarserial.com', 'admin123')"
                    class="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-500 text-slate-700 font-medium text-center transition cursor-pointer"
                >
                    Admin
                </button>
                <button
                    type="button"
                    onclick="fillLogin('dr.tariq@gmail.com', 'doctor123')"
                    class="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-500 text-slate-700 font-medium text-center transition cursor-pointer"
                >
                    Doctor
                </button>
                <button
                    type="button"
                    onclick="fillLogin('rahim@gmail.com', 'patient123')"
                    class="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-500 text-slate-700 font-medium text-center transition cursor-pointer"
                >
                    Patient
                </button>
            </div>
        </div>

        <form action="/login" method="POST" class="space-y-4">
            <?= csrf_field() ?>
            <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                    <?= t('Email Address', 'ইমেইল ঠিকানা') ?>
                </label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <i data-lucide="mail" class="w-4 h-4"></i>
                    </div>
                    <input
                        type="email"
                        name="email"
                        id="loginEmail"
                        placeholder="you@example.com"
                        class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                        required
                        autofocus
                    />
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                    <?= t('Password', 'পাসওয়ার্ড') ?>
                </label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <i data-lucide="lock" class="w-4 h-4"></i>
                    </div>
                    <input
                        type="password"
                        name="password"
                        id="loginPassword"
                        placeholder="••••••••"
                        class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                        required
                    />
                </div>
            </div>

            <button
                type="submit"
                class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
                <i data-lucide="log-in" class="w-4 h-4"></i>
                <span><?= t('Sign In', 'লগইন করুন') ?></span>
            </button>
        </form>

        <div class="pt-4 border-t border-slate-100 text-center space-y-2">
            <p class="text-xs text-slate-500"><?= t('Don\'t have an account?', 'নতুন একাউন্ট খুলতে চান?') ?></p>
            <div class="flex items-center justify-center gap-4 text-xs font-semibold">
                <a href="/register/patient" class="text-emerald-600 hover:text-emerald-700">
                    <?= t('Patient Registration', 'রোগীর নিবন্ধন') ?>
                </a>
                <span class="text-slate-300">&bull;</span>
                <a href="/register/doctor" class="text-slate-600 hover:text-slate-900">
                    <?= t('Doctor Registration', 'ডাক্তার নিবন্ধন') ?>
                </a>
            </div>
        </div>
    </div>
</div>

<script>
function fillLogin(email, pass) {
    const eInput = document.getElementById('loginEmail');
    const pInput = document.getElementById('loginPassword');
    if (eInput && pInput) {
        eInput.value = email;
        pInput.value = pass;
    }
}
</script>
