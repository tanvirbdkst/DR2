<div class="max-w-3xl mx-auto px-4 py-12">
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div class="text-center space-y-2">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 mx-auto">
                <i data-lucide="stethoscope" class="w-6 h-6"></i>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                <?= t('Doctor Registration Portal', 'ডাক্তার নিবন্ধন পোর্টাল') ?>
            </h1>
            <p class="text-xs text-slate-500">
                <?= t('Join Daktar Serial to manage chambers, schedules, and online patient serials seamlessly.', 'অনলাইনে চেম্বার ও রোগী সিরিয়াল ম্যানেজ করতে যুক্ত হোন। অ্যাডমিন ভেরিফিকেশন সাপেক্ষে কার্যকর হবে।') ?>
            </p>
        </div>

        <form action="/register/doctor" method="POST" class="space-y-6">
            <?= csrf_field() ?>

            <!-- Section 1: Professional Info -->
            <div class="space-y-3">
                <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    1. <?= t('Professional & Academic Information', '১. ব্যক্তিগত ও অ্যাকাডেমিক তথ্য') ?>
                </h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            <?= t('Full Name (with title)', 'ডাক্তারের নাম') ?> <span class="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            placeholder="e.g. Dr. Kamrul Hasan"
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            <?= t('BMDC Registration Number', 'বিএমডিসি নম্বর') ?> <span class="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="bmdc_number"
                            placeholder="BMDC-A-XXXXX"
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            <?= t('Specialty / Department', 'স্পেশালিটি / বিভাগ') ?> <span class="text-rose-500">*</span>
                        </label>
                        <select
                            name="specialty_id"
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                            required
                        >
                            <option value=""><?= t('Select Specialty', 'স্পেশালিটি নির্বাচন করুন') ?></option>
                            <?php foreach ($specialties as $s): ?>
                                <option value="<?= $s['id'] ?>"><?= e($s['name_bn'] ?: $s['name']) ?> (<?= e($s['name']) ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            <?= t('Experience (Years)', 'অভিজ্ঞতা (বছর)') ?>
                        </label>
                        <input
                            type="number"
                            name="experience_years"
                            value="5"
                            min="0"
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div class="sm:col-span-2">
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            <?= t('Qualifications & Degrees', 'ডিগ্রি ও পদবি') ?> <span class="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="qualification"
                            placeholder="MBBS, FCPS (Medicine), MD, Consultant..."
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            required
                        />
                    </div>

                    <div class="sm:col-span-2">
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            <?= t('Bio & Professional Summary', 'সংক্ষিপ্ত পরিচিতি') ?>
                        </label>
                        <textarea
                            name="bio"
                            rows="2"
                            placeholder="Write a brief overview of your specialization and chamber experience..."
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        ></textarea>
                    </div>
                </div>
            </div>

            <!-- Section 2: Initial Chamber -->
            <div class="space-y-3">
                <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    2. <?= t('Primary Chamber Details', '২. প্রাথমিক চেম্বার তথ্য') ?>
                </h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            <?= t('Chamber / Hospital Name', 'চেম্বার / হাসপাতালের নাম') ?>
                        </label>
                        <input
                            type="text"
                            name="chamber_name"
                            placeholder="e.g. Popular Diagnostic Center"
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            <?= t('Consultation Fee (৳)', 'পরামর্শ ফি (৳)') ?>
                        </label>
                        <input
                            type="number"
                            name="consultation_fee"
                            value="1000"
                            min="100"
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('City / District', 'শহর / জেলা') ?></label>
                        <input
                            type="text"
                            name="city"
                            value="Dhaka"
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Area', 'এলাকা') ?></label>
                        <input
                            type="text"
                            name="area"
                            placeholder="Dhanmondi, Mirpur, etc."
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div class="sm:col-span-2">
                        <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Chamber Full Address', 'চেম্বারের বিস্তারিত ঠিকানা') ?></label>
                        <input
                            type="text"
                            name="chamber_address"
                            placeholder="House #12, Road #2, Dhanmondi, Dhaka"
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            <!-- Section 3: Account Credentials -->
            <div class="space-y-3">
                <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    3. <?= t('Login Credentials', '৩. লগইন ক্রেডেনশিয়ালস') ?>
                </h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            <?= t('Mobile Number', 'মোবাইল নম্বর') ?> <span class="text-rose-500">*</span>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            placeholder="01XXXXXXXXX"
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
                            placeholder="doctor@example.com"
                            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            required
                        />
                    </div>

                    <div class="sm:col-span-2">
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
                </div>
            </div>

            <button
                type="submit"
                class="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
                <i data-lucide="stethoscope" class="w-4 h-4"></i>
                <span><?= t('Apply for Doctor Account', 'ডাক্তার হিসেবে আবেদন জমা দিন') ?></span>
            </button>
        </form>
    </div>
</div>
