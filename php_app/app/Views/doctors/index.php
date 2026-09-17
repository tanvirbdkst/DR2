<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Page Header -->
    <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            <?= t('Find Specialist Doctors', 'বিশেষজ্ঞ ডাক্তার অনুসন্ধান') ?>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
            <?= t(
                'Browse verified doctors, check real-time chamber schedules, and book direct serial numbers.',
                'ভেরিফাইড ডাক্তারদের তালিকা থেকে চেম্বারের সময়সূচী দেখে সরাসরি সিরিয়াল বুক করুন।'
            ) ?>
        </p>
    </div>

    <!-- Filter and Search Bar -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form action="/doctors" method="GET" class="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div class="sm:col-span-4 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i data-lucide="search" class="w-4 h-4"></i>
                </div>
                <input
                    type="text"
                    name="search"
                    value="<?= e($search ?? '') ?>"
                    placeholder="<?= t('Search by doctor name or qualification...', 'ডাক্তারের নাম বা যোগ্যতা...') ?>"
                    class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
            </div>

            <div class="sm:col-span-3 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i data-lucide="stethoscope" class="w-4 h-4"></i>
                </div>
                <select
                    name="specialty"
                    class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                >
                    <option value=""><?= t('All Specialties', 'সকল বিভাগ') ?></option>
                    <?php foreach ($specialties as $s): ?>
                        <option value="<?= e($s['slug']) ?>" <?= ($selectedSpecialty ?? '') === $s['slug'] ? 'selected' : '' ?>>
                            <?= e($s['name']) ?> <?= $s['name_bn'] ? '(' . e($s['name_bn']) . ')' : '' ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="sm:col-span-3 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i data-lucide="map-pin" class="w-4 h-4"></i>
                </div>
                <input
                    type="text"
                    name="location"
                    value="<?= e($location ?? '') ?>"
                    placeholder="<?= t('Location (e.g. Dhanmondi, Dhaka)', 'এলাকা (যেমন: ধানমন্ডি)') ?>"
                    class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
            </div>

            <div class="sm:col-span-2 flex items-center gap-2">
                <button
                    type="submit"
                    class="w-full h-full min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm shadow-emerald-600/30 cursor-pointer"
                >
                    <i data-lucide="filter" class="w-4 h-4"></i>
                    <span><?= t('Filter', 'ফিল্টার') ?></span>
                </button>
                <a
                    href="/doctors"
                    title="<?= t('Reset', 'রিসেট') ?>"
                    class="h-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center justify-center"
                >
                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                </a>
            </div>
        </form>
    </div>

    <!-- Results Header -->
    <div class="flex items-center justify-between">
        <p class="text-xs sm:text-sm text-slate-500">
            <?= t('Found', 'পাওয়া গেছে') ?> <span class="font-bold text-slate-900"><?= count($doctors) ?></span> <?= t('specialist doctors', 'জন বিশেষজ্ঞ ডাক্তার') ?>
        </p>
    </div>

    <!-- Doctor Cards Grid -->
    <?php if (empty($doctors)): ?>
        <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
            <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <i data-lucide="stethoscope" class="w-6 h-6"></i>
            </div>
            <h3 class="text-base font-bold text-slate-900"><?= t('No doctors found', 'কোনো ডাক্তার পাওয়া যায়নি') ?></h3>
            <p class="text-xs text-slate-500">
                <?= t('Try adjusting your search criteria or clear filters to see all specialists.', 'অন্য কোনো নাম বা স্পেশালিটি নির্বাচন করে পুনরায় অনুসন্ধান করুন।') ?>
            </p>
            <a href="/doctors" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 pt-2">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                <span><?= t('Reset all filters', 'ফিল্টার রিসেট করুন') ?></span>
            </a>
        </div>
    <?php else: ?>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <?php foreach ($doctors as $doc): ?>
                <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-lg transition flex flex-col justify-between">
                    <div>
                        <!-- Header with Avatar and Basic Info -->
                        <div class="flex items-start gap-3.5 mb-3">
                            <?php if (!empty($doc['avatar_url'])): ?>
                                <img
                                    src="<?= e($doc['avatar_url']) ?>"
                                    alt="<?= e($doc['name']) ?>"
                                    class="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0"
                                />
                            <?php else: ?>
                                <div class="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-xl flex items-center justify-center shrink-0">
                                    <?= strtoupper(substr($doc['name'], 0, 1)) ?>
                                </div>
                            <?php endif; ?>

                            <div class="min-w-0 flex-1">
                                <span class="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-1">
                                    <?= e($doc['specialty_name_bn'] ?: ($doc['specialty_name'] ?? 'Specialist')) ?>
                                </span>
                                <h3 class="font-bold text-slate-900 text-base leading-tight truncate">
                                    <?= e($doc['title'] . ' ' . $doc['name']) ?>
                                </h3>
                                <div class="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                    <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-600 shrink-0"></i>
                                    <span class="truncate">BMDC: <?= e($doc['bmdc_number']) ?></span>
                                </div>
                            </div>
                        </div>

                        <!-- Qualifications & Experience -->
                        <p class="text-xs text-slate-600 line-clamp-2 mb-3 min-h-[32px]">
                            <?= e($doc['qualification']) ?>
                        </p>

                        <div class="space-y-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
                            <div class="flex items-center gap-2">
                                <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                <span class="truncate"><?= e($doc['chambers_summary'] ?: 'Active Chamber') ?></span>
                            </div>
                            <div class="flex items-center justify-between text-xs pt-1">
                                <span class="flex items-center gap-1 text-slate-600">
                                    <i data-lucide="award" class="w-3.5 h-3.5 text-amber-500"></i>
                                    <span><?= (int)$doc['experience_years'] ?>+ <?= t('years exp', 'বছরের অভিজ্ঞতা') ?></span>
                                </span>
                                <div class="text-right">
                                    <span class="text-[10px] text-slate-400 block leading-none"><?= t('Fee', 'পরামর্শ ফি') ?></span>
                                    <span class="text-sm font-bold text-slate-900">৳<?= number_format((float)$doc['consultation_fee']) ?></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-slate-100">
                        <a
                            href="/doctor/<?= $doc['id'] ?>"
                            class="w-full py-2.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-center"
                        >
                            <?= t('Profile', 'প্রোফাইল') ?>
                        </a>
                        <a
                            href="/doctor/<?= $doc['id'] ?>"
                            class="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition text-center shadow-xs"
                        >
                            <?= t('Get Serial', 'সিরিয়াল নিন') ?>
                        </a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
