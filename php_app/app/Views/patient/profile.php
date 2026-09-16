<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-xl font-bold text-slate-900"><?= t('Patient Profile Settings', 'প্রোফাইল ব্যবস্থাপনা') ?></h1>
            <p class="text-xs text-slate-500 mt-0.5"><?= t('Update personal records and account security', 'আপনার ব্যক্তিগত তথ্য ও পাসওয়ার্ড আপডেট করুন') ?></p>
        </div>
        <a href="/patient/dashboard" class="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span><?= t('Back to Dashboard', 'ড্যাশবোর্ডে ফিরে যান') ?></span>
        </a>
    </div>

    <!-- Personal Info Card -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <i data-lucide="user" class="w-4 h-4 text-emerald-600"></i>
            <span><?= t('Personal Information', 'রোগীর ব্যক্তিগত তথ্য') ?></span>
        </h2>

        <form action="/patient/profile" method="POST" class="space-y-4 text-xs">
            <?= csrf_field() ?>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Full Name', 'রোগীর পূর্ণ নাম') ?> *</label>
                    <input type="text" name="name" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($user['name']) ?>" required>
                </div>
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Mobile Phone', 'মোবাইল নম্বর') ?> *</label>
                    <input type="text" name="phone" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($user['phone']) ?>" required>
                </div>
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Email Address', 'ইমেইল ঠিকানা') ?></label>
                    <input type="email" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 outline-none" value="<?= e($user['email']) ?>" readonly disabled>
                </div>
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Blood Group', 'রক্তের গ্রুপ') ?></label>
                    <select name="blood_group" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white">
                        <option value=""><?= t('Select Blood Group', 'নির্বাচন করুন') ?></option>
                        <?php foreach (['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as $bg): ?>
                            <option value="<?= $bg ?>" <?= ($profile['blood_group'] ?? '') === $bg ? 'selected' : '' ?>><?= $bg ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Date of Birth', 'জন্ম তারিখ') ?></label>
                    <input type="date" name="date_of_birth" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($profile['date_of_birth'] ?? '') ?>">
                </div>
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Gender', 'লিঙ্গ') ?></label>
                    <select name="gender" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white">
                        <option value="male" <?= ($profile['gender'] ?? 'male') === 'male' ? 'selected' : '' ?>><?= t('Male', 'পুরুষ') ?></option>
                        <option value="female" <?= ($profile['gender'] ?? '') === 'female' ? 'selected' : '' ?>><?= t('Female', 'নারী') ?></option>
                        <option value="other" <?= ($profile['gender'] ?? '') === 'other' ? 'selected' : '' ?>><?= t('Other', 'অন্যান্য') ?></option>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Emergency Contact', 'জরুরি যোগাযোগের নম্বর') ?></label>
                    <input type="text" name="emergency_contact" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($profile['emergency_contact'] ?? '') ?>" placeholder="01XXXXXXXXX">
                </div>
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Present Address', 'বর্তমান ঠিকানা') ?></label>
                    <input type="text" name="address" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($profile['address'] ?? '') ?>" placeholder="Road, Area, District">
                </div>
            </div>
            <div class="pt-2 flex justify-end">
                <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    <span><?= t('Save Profile Details', 'তথ্য সংরক্ষণ করুন') ?></span>
                </button>
            </div>
        </form>
    </div>

    <!-- Password Change Card -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <i data-lucide="lock" class="w-4 h-4 text-emerald-600"></i>
            <span><?= t('Change Password', 'পাসওয়ার্ড পরিবর্তন') ?></span>
        </h2>

        <form action="/patient/profile" method="POST" class="space-y-4 text-xs">
            <?= csrf_field() ?>
            <input type="hidden" name="change_password" value="1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Current Password', 'বর্তমান পাসওয়ার্ড') ?> *</label>
                    <input type="password" name="current_password" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" placeholder="••••••••" required>
                </div>
                <div>
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('New Password', 'নতুন পাসওয়ার্ড') ?> *</label>
                    <input type="password" name="new_password" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" minlength="6" placeholder="Minimum 6 characters" required>
                </div>
            </div>
            <div class="pt-2 flex justify-end">
                <button type="submit" class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="key" class="w-4 h-4"></i>
                    <span><?= t('Update Password', 'পাসওয়ার্ড আপডেট করুন') ?></span>
                </button>
            </div>
        </form>
    </div>
</div>
