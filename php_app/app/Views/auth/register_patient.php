<div class="max-w-xl mx-auto px-4 py-12">
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div class="text-center space-y-2">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <i data-lucide="user-plus" class="w-6 h-6"></i>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                <?= t('Patient Registration', 'রোগীর নিবন্ধন') ?>
            </h1>
            <p class="text-xs text-slate-500">
                <?= t('Create a free account to track doctor serials, view history, and download slips.', 'সহজে সিরিয়াল বুক ও রেকর্ড দেখতে ফ্রি একাউন্ট খুলুন') ?>
            </p>
        </div>

        <form action="/register/patient" method="POST" class="space-y-4">
            <?= csrf_field() ?>
            <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                    <?= t('Full Name', 'পুরো নাম') ?> <span class="text-rose-500">*</span>
                </label>
                <input
                    type="text"
                    name="name"
                    placeholder="Md. Rahim Khan"
                    class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    required
                />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">
                        <?= t('Mobile Number', 'মোবাইল নম্বর') ?> <span class="text-rose-500">*</span>
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        placeholder="017XXXXXXXX"
                        class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        required
                    />
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">
                        <?= t('Email Address', 'ইমেইল ঠিকানা') ?> <span class="text-rose-500">*</span>
                    </label>
                    <input
                        type="email"
                        name="email"
                        placeholder="rahim@gmail.com"
                        class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        required
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Gender', 'লিঙ্গ') ?></label>
                    <select
                        name="gender"
                        class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                    >
                        <option value="male"><?= t('Male', 'পুরুষ') ?></option>
                        <option value="female"><?= t('Female', 'মহিলা') ?></option>
                        <option value="other"><?= t('Other', 'অন্যান্য') ?></option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Blood Group', 'রক্তের গ্রুপ') ?></label>
                    <select
                        name="blood_group"
                        class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                    >
                        <option value=""><?= t('Select Group', 'নির্বাচন করুন') ?></option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Address', 'ঠিকানা') ?></label>
                <input
                    type="text"
                    name="address"
                    placeholder="Mirpur, Dhaka"
                    class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                    <?= t('Password', 'পাসওয়ার্ড') ?> <span class="text-rose-500">*</span>
                </label>
                <input
                    type="password"
                    name="password"
                    placeholder="Minimum 6 characters"
                    minlength="6"
                    class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    required
                />
            </div>

            <button
                type="submit"
                class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
                <i data-lucide="check" class="w-4 h-4"></i>
                <span><?= t('Create Patient Account', 'একাউন্ট তৈরি করুন') ?></span>
            </button>
        </form>

        <div class="pt-4 border-t border-slate-100 text-center">
            <p class="text-xs text-slate-500">
                <?= t('Already registered?', 'ইতোমধ্যে একাউন্ট আছে?') ?>
                <a href="/login" class="text-emerald-600 font-semibold hover:text-emerald-700 ml-1">
                    <?= t('Sign In', 'লগইন করুন') ?>
                </a>
            </p>
        </div>
    </div>
</div>
