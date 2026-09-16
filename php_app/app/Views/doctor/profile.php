<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-xl font-bold text-slate-900"><?= t('Doctor Profile Settings', 'ডাক্তার প্রোফাইল সম্পাদনা') ?></h1>
            <p class="text-xs text-slate-500 mt-0.5"><?= t('Update qualifications, consultation fees, and profile details', 'আপনার ডিগ্রি, পরামর্শ ফি ও অন্যান্য তথ্য আপডেট করুন') ?></p>
        </div>
        <a href="/doctor/dashboard" class="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span><?= t('Back to Dashboard', 'ড্যাশবোর্ডে ফিরে যান') ?></span>
        </a>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
                <h2 class="text-sm font-bold text-slate-900"><?= t('Professional Credentials & BMDC', 'পেশাগত তথ্য ও বিএমডিসি ভেরিফিকেশন') ?></h2>
                <span class="text-xs text-slate-500"><?= t('BMDC Registration #:', 'বিএমডিসি নম্বর:') ?> <strong class="font-mono text-slate-800"><?= e($doctor['bmdc_number']) ?></strong></span>
            </div>
            <div>
                <?php if ($doctor['approval_status'] === 'approved'): ?>
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
                        <span><?= t('Verified BMDC Account', 'ভেরিফাইড অ্যাকাউন্ট') ?></span>
                    </span>
                <?php else: ?>
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                        <span><?= t('Pending Verification', 'ভেরিফিকেশন অপেক্ষমাণ') ?></span>
                    </span>
                <?php endif; ?>
            </div>
        </div>

        <form action="/doctor/profile" method="POST" class="space-y-4 text-xs">
            <?= csrf_field() ?>
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div class="sm:col-span-3">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Title', 'উপাধি') ?> *</label>
                    <select name="title" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white" required>
                        <option value="Dr." <?= $doctor['title'] === 'Dr.' ? 'selected' : '' ?>>Dr. (ডাঃ)</option>
                        <option value="Prof. Dr." <?= $doctor['title'] === 'Prof. Dr.' ? 'selected' : '' ?>>Prof. Dr. (অধ্যাপক ডাঃ)</option>
                        <option value="Assoc. Prof. Dr." <?= $doctor['title'] === 'Assoc. Prof. Dr.' ? 'selected' : '' ?>>Assoc. Prof. Dr. (সহযোগী অধ্যাপক ডাঃ)</option>
                        <option value="Asst. Prof. Dr." <?= $doctor['title'] === 'Asst. Prof. Dr.' ? 'selected' : '' ?>>Asst. Prof. Dr. (সহকারী অধ্যাপক ডাঃ)</option>
                    </select>
                </div>
                <div class="sm:col-span-5">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Full Name', 'পূর্ণ নাম') ?> *</label>
                    <input type="text" name="name" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($user['name']) ?>" required>
                </div>
                <div class="sm:col-span-4">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Specialty', 'স্পেশালিটি / বিভাগ') ?> *</label>
                    <select name="specialty_id" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white" required>
                        <?php foreach ($specialties as $s): ?>
                            <option value="<?= $s['id'] ?>" <?= $doctor['specialty_id'] == $s['id'] ? 'selected' : '' ?>><?= e($s['name_bn'] ?: $s['name']) ?> (<?= e($s['name']) ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="sm:col-span-6">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Mobile Phone', 'মোবাইল নম্বর') ?> *</label>
                    <input type="text" name="phone" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($user['phone']) ?>" required>
                </div>
                <div class="sm:col-span-6">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Email Address', 'ইমেইল ঠিকানা') ?></label>
                    <input type="email" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 outline-none" value="<?= e($user['email']) ?>" readonly disabled>
                </div>

                <div class="sm:col-span-8">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Degrees & Qualifications', 'ডিগ্রি ও শিক্ষাগত যোগ্যতা') ?> *</label>
                    <input type="text" name="qualification" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($doctor['qualification']) ?>" required placeholder="MBBS, FCPS (Medicine), MD (Cardiology)">
                </div>
                <div class="sm:col-span-4">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Experience (Years)', 'অভিজ্ঞতা (বছর)') ?></label>
                    <input type="number" name="experience_years" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= (int)$doctor['experience_years'] ?>" min="0" max="60">
                </div>

                <div class="sm:col-span-6">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Consultation Fee (৳)', 'সাধারণ চেম্বার ফি (৳)') ?> *</label>
                    <input type="number" name="consultation_fee" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= (float)$doctor['consultation_fee'] ?>" required min="0" step="50">
                </div>
                <div class="sm:col-span-6">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Follow-up Fee (৳)', 'ফলো-আপ ফি (৳)') ?></label>
                    <input type="number" name="follow_up_fee" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= (float)$doctor['follow_up_fee'] ?>" min="0" step="50">
                </div>

                <div class="sm:col-span-12">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Professional Bio & Specialization', 'চিকিৎসক পরিচিতি ও বিবরণ (Bio)') ?></label>
                    <textarea name="bio" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" rows="3" placeholder="<?= t('Describe clinical expertise, hospital attachments, etc.', 'আপনার চিকিৎসা অভিজ্ঞতা, বিশেষ পারদর্শিতা ও সেবামূলক কাজের সংক্ষিপ্ত বিবরণ লিখুন...') ?>"><?= e($doctor['bio'] ?? '') ?></textarea>
                </div>

                <!-- Password change section -->
                <div class="sm:col-span-12 border-t border-slate-100 pt-4 mt-2">
                    <h3 class="font-bold text-slate-900 text-xs"><?= t('Change Password (Optional)', 'পাসওয়ার্ড পরিবর্তন (ঐচ্ছিক)') ?></h3>
                    <p class="text-slate-400 text-[11px]"><?= t('Leave blank if you wish to keep current password', 'পাসওয়ার্ড অপরিবর্তিত রাখতে চাইলে খালি রাখুন') ?></p>
                </div>
                <div class="sm:col-span-6">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('New Password', 'নতুন পাসওয়ার্ড') ?></label>
                    <input type="password" name="new_password" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" placeholder="Minimum 6 characters">
                </div>
                <div class="sm:col-span-6">
                    <label class="block font-semibold text-slate-700 mb-1"><?= t('Confirm Password', 'নতুন পাসওয়ার্ড পুনরায় লিখুন') ?></label>
                    <input type="password" name="confirm_password" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" placeholder="Repeat password">
                </div>
            </div>

            <div class="pt-3 flex justify-end">
                <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    <span><?= t('Save Profile Changes', 'তথ্য সংরক্ষণ করুন') ?></span>
                </button>
            </div>
        </form>
    </div>
</div>
