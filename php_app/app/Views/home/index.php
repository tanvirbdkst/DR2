<div class="space-y-16 pb-16">
    <!-- Hero Section with Deep Slate/Emerald Theme and Search Bar -->
    <section class="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-900 text-white pt-14 pb-20 px-4 sm:px-6 lg:px-8">
        <!-- Subtle grid pattern overlay -->
        <div class="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 pointer-events-none"></div>

        <div class="relative max-w-5xl mx-auto text-center space-y-6">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                <span><?= t('Instant Doctor Serial Booking in Bangladesh', 'বাংলাদেশের দ্রুততম ডাক্তার সিরিয়াল বুকিং প্ল্যাটফর্ম') ?></span>
            </div>

            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                <?= t('Book Doctor Chamber Serial', 'ডাক্তারের চেম্বার সিরিয়াল নিন') ?> <br class="hidden sm:inline" />
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                    <?= t('Without Standing in Crowded Queues', 'দীর্ঘ লাইনে না দাঁড়িয়ে') ?>
                </span>
            </h1>

            <p class="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed">
                <?= t(
                    'Select doctor, choose your preferred chamber and date, pick your exact serial number (e.g. Serial 03), and receive your unique Appointment ID instantly.',
                    'ডাক্তার ও চেম্বার পছন্দ করুন, তারিখ নির্বাচন করুন, নির্দিষ্ট সিরিয়াল বেছে নিন এবং সাথে সাথে নিশ্চিত অ্যাপয়েন্টমেন্ট আইডি পান।'
                ) ?>
            </p>

            <!-- Search Box Card -->
            <div class="max-w-4xl mx-auto mt-8 bg-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-slate-200 text-slate-800 text-left">
                <form action="/doctors" method="GET" class="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
                    <!-- Doctor Name / Query -->
                    <div class="sm:col-span-4 relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="search" class="w-4 h-4"></i>
                        </div>
                        <input
                            type="text"
                            name="search"
                            value="<?= e($search ?? '') ?>"
                            placeholder="<?= t('Doctor name, disease, or qualification...', 'ডাক্তারের নাম বা রোগ...') ?>"
                            class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm outline-none transition"
                        />
                    </div>

                    <!-- Specialty dropdown -->
                    <div class="sm:col-span-3 relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="stethoscope" class="w-4 h-4"></i>
                        </div>
                        <select
                            name="specialty"
                            class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm outline-none transition bg-white"
                        >
                            <option value=""><?= t('All Specialties', 'সকল বিভাগ') ?></option>
                            <?php foreach ($specialties as $spec): ?>
                                <option value="<?= e($spec['slug']) ?>">
                                    <?= e($spec['name']) ?> <?= $spec['name_bn'] ? '(' . e($spec['name_bn']) . ')' : '' ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <!-- Location input -->
                    <div class="sm:col-span-3 relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="map-pin" class="w-4 h-4"></i>
                        </div>
                        <input
                            type="text"
                            name="location"
                            placeholder="<?= t('Location (e.g. Dhanmondi, Dhaka)', 'এলাকা (যেমন: ধানমন্ডি)') ?>"
                            class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm outline-none transition"
                        />
                    </div>

                    <!-- Submit Button -->
                    <div class="sm:col-span-2">
                        <button
                            type="submit"
                            class="w-full h-full min-h-[42px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm shadow-emerald-600/30 cursor-pointer"
                        >
                            <i data-lucide="search" class="w-4 h-4"></i>
                            <span><?= t('Search', 'খুঁজুন') ?></span>
                        </button>
                    </div>
                </form>

                <div class="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                    <span class="flex items-center gap-1">
                        <span class="font-semibold text-slate-700"><?= t('Popular:', 'জনপ্রিয়:') ?></span>
                        <a href="/doctors?specialty=cardiology" class="hover:text-emerald-600 underline decoration-slate-300 underline-offset-2 ml-1">Cardiology</a>
                        <a href="/doctors?specialty=general-medicine" class="hover:text-emerald-600 underline decoration-slate-300 underline-offset-2 ml-1">General Medicine</a>
                        <a href="/doctors?specialty=pediatrics" class="hover:text-emerald-600 underline decoration-slate-300 underline-offset-2 ml-1">Pediatrics</a>
                        <a href="/doctors?specialty=gynecology" class="hover:text-emerald-600 underline decoration-slate-300 underline-offset-2 ml-1">Gynecology</a>
                    </span>
                    <span class="text-emerald-600 font-medium flex items-center gap-1">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                        <span><?= t('Verified BMDC Doctors Only', 'শুধুমাত্র অনুমোদিত ডাক্তার') ?></span>
                    </span>
                </div>
            </div>
        </div>
    </section>

    <!-- Specialty Categories -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    <?= t('Explore by Medical Specialty', 'বিভাগ অনুযায়ী বিশেষজ্ঞ ডাক্তার') ?>
                </h2>
                <p class="text-xs sm:text-sm text-slate-500 mt-1">
                    <?= t('Find top verified doctors across common medical departments', 'আপনার প্রয়োজনীয় বিভাগে অভিজ্ঞ ও সার্টিফাইড বিশেষজ্ঞ নির্বাচন করুন') ?>
                </p>
            </div>
            <a href="<?= url('/doctors') ?>" class="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group">
                <span><?= t('View All Doctors', 'সকল ডাক্তার দেখুন') ?></span>
                <i data-lucide="arrow-right" class="w-4 h-4 transform group-hover:translate-x-1 transition"></i>
            </a>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <?php foreach (array_slice($specialties, 0, 12) as $spec): 
                $slug = strtolower($spec['slug'] ?? '');
                $name = strtolower($spec['name'] ?? '');
                $nameBn = $spec['name_bn'] ?? '';

                if (str_contains($slug, 'cardio') || str_contains($name, 'cardio') || str_contains($nameBn, 'হৃদরোগ')) {
                    $conf = [
                        'icon' => 'heart',
                        'iconBg' => 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
                        'borderHover' => 'hover:border-rose-400 hover:shadow-rose-500/10',
                    ];
                } elseif (str_contains($slug, 'gynecol') || str_contains($name, 'gynecol') || str_contains($nameBn, 'স্ত্রী')) {
                    $conf = [
                        'icon' => 'baby',
                        'iconBg' => 'bg-pink-50 text-pink-600 group-hover:bg-pink-600 group-hover:text-white',
                        'borderHover' => 'hover:border-pink-400 hover:shadow-pink-500/10',
                    ];
                } elseif (str_contains($slug, 'pediatric') || str_contains($name, 'pediatric') || str_contains($nameBn, 'শিশু')) {
                    $conf = [
                        'icon' => 'smile',
                        'iconBg' => 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
                        'borderHover' => 'hover:border-amber-400 hover:shadow-amber-500/10',
                    ];
                } elseif (str_contains($slug, 'dermatol') || str_contains($name, 'dermatol') || str_contains($nameBn, 'চর্ম')) {
                    $conf = [
                        'icon' => 'sparkles',
                        'iconBg' => 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
                        'borderHover' => 'hover:border-purple-400 hover:shadow-purple-500/10',
                    ];
                } elseif (str_contains($slug, 'orthoped') || str_contains($name, 'orthoped') || str_contains($nameBn, 'হাড়') || str_contains($nameBn, 'হাড়-জোড়')) {
                    $conf = [
                        'icon' => 'activity',
                        'iconBg' => 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
                        'borderHover' => 'hover:border-blue-400 hover:shadow-blue-500/10',
                    ];
                } elseif (str_contains($slug, 'ent') || str_contains($name, 'ent') || str_contains($nameBn, 'নাক') || str_contains($name, 'throat')) {
                    $conf = [
                        'icon' => 'volume-2',
                        'iconBg' => 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white',
                        'borderHover' => 'hover:border-teal-400 hover:shadow-teal-500/10',
                    ];
                } elseif (str_contains($slug, 'neuro') || str_contains($name, 'neuro') || str_contains($nameBn, 'নিউর')) {
                    $conf = [
                        'icon' => 'brain',
                        'iconBg' => 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
                        'borderHover' => 'hover:border-indigo-400 hover:shadow-indigo-500/10',
                    ];
                } elseif (str_contains($slug, 'eye') || str_contains($name, 'eye') || str_contains($nameBn, 'চোখ')) {
                    $conf = [
                        'icon' => 'eye',
                        'iconBg' => 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
                        'borderHover' => 'hover:border-cyan-400 hover:shadow-cyan-500/10',
                    ];
                } else {
                    $conf = [
                        'icon' => 'stethoscope',
                        'iconBg' => 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
                        'borderHover' => 'hover:border-emerald-400 hover:shadow-emerald-500/10',
                    ];
                }
            ?>
                <a
                    href="<?= url('/doctors?specialty=' . urlencode($spec['slug'])) ?>"
                    class="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 <?= $conf['borderHover'] ?> hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer text-center flex flex-col items-center justify-center block"
                >
                    <div class="w-12 h-12 mx-auto rounded-xl <?= $conf['iconBg'] ?> flex items-center justify-center group-hover:scale-110 transition-all duration-200 shadow-xs mb-3">
                        <i data-lucide="<?= $conf['icon'] ?>" class="w-6 h-6"></i>
                    </div>
                    <h3 class="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-emerald-600 transition leading-snug line-clamp-1">
                        <?= e($spec['name']) ?>
                    </h3>
                    <?php if (!empty($spec['name_bn'])): ?>
                        <p class="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-1 font-normal">
                            <?= e($spec['name_bn']) ?>
                        </p>
                    <?php endif; ?>
                </a>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- How It Works Section -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="how-it-works">
        <div class="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-10">
            <div class="text-center max-w-xl mx-auto mb-10">
                <span class="text-emerald-600 font-bold text-xs uppercase tracking-wider">
                    <?= t('Simple 3-Step Process', 'সহজ ৩ ধাপে সিরিয়াল') ?>
                </span>
                <h2 class="text-2xl font-bold text-slate-900 mt-1">
                    <?= t('How Chamber Serial Booking Works', 'কীভাবে সিরিয়াল বুক করবেন') ?>
                </h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
                    <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mb-4 text-sm">
                        01
                    </div>
                    <h3 class="font-bold text-slate-900 text-base mb-2">
                        <?= t('Find Doctor & Chamber', 'ডাক্তার ও চেম্বার নির্বাচন') ?>
                    </h3>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        <?= t(
                            'Search approved doctors by specialty or location. Review qualification, BMDC reg number, chamber address, and fees.',
                            'বিশেষজ্ঞ বা এলাকা দিয়ে অনুমোদিত ডাক্তার খুঁজুন। ডাক্তারের অভিজ্ঞতা ও চেম্বারের ঠিকানা দেখে নিন।'
                        ) ?>
                    </p>
                </div>

                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
                    <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mb-4 text-sm">
                        02
                    </div>
                    <h3 class="font-bold text-slate-900 text-base mb-2">
                        <?= t('Pick Date & Serial Number', 'তারিখ ও সিরিয়াল বেছে নিন') ?>
                    </h3>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        <?= t(
                            'Select an available date. Browse active serial slots (e.g. Serial 01, 02, 03) and select your preferred consultation slot.',
                            'পছন্দের তারিখ নির্বাচন করে উপলব্ধ সিরিয়াল নম্বরটি সিলেক্ট করুন (যেমন: সিরিয়াল ০৩)।'
                        ) ?>
                    </p>
                </div>

                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
                    <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mb-4 text-sm">
                        03
                    </div>
                    <h3 class="font-bold text-slate-900 text-base mb-2">
                        <?= t('Get Confirmed Serial ID', 'তাৎক্ষণিক সিরিয়াল রসিদ') ?>
                    </h3>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        <?= t(
                            'Instantly receive your official Appointment ID (DS-YYYYMMDD-XXXXX). Double-booking protection guarantees your slot.',
                            'সাথে সাথে আপনার অনন্য অ্যাপয়েন্টমেন্ট আইডি ও সিরিয়াল কনফার্মেশন পাবেন। কোনো ডুপ্লিকেট বুকিং এর সুযোগ নেই।'
                        ) ?>
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Verified Medical Specialists -->
    <?php if (!empty($featuredDoctors)): ?>
        <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        <?= t('Verified Medical Specialists', 'অনুমোদিত বিশেষজ্ঞ ডাক্তার') ?>
                    </h2>
                    <p class="text-xs sm:text-sm text-slate-500 mt-1">
                        <?= t('Approved by system administration with verified credentials and active chambers', 'অ্যাডমিন কর্তৃক ভেরিফাইড বিএমডিসি সনদপ্রাপ্ত ডাক্তারদের তালিকা') ?>
                    </p>
                </div>
                <a href="/doctors" class="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                    <span><?= t('Browse All Doctors', 'সব ডাক্তার') ?></span>
                    <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </a>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <?php foreach (array_slice($featuredDoctors, 0, 4) as $doc): ?>
                    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-lg transition flex flex-col justify-between">
                        <div>
                            <div class="flex items-start gap-3 mb-3">
                                <?php if (!empty($doc['avatar_url'])): ?>
                                    <img
                                        src="<?= e($doc['avatar_url']) ?>"
                                        alt="<?= e($doc['name']) ?>"
                                        class="w-14 h-14 rounded-xl object-cover border border-slate-100"
                                    />
                                <?php else: ?>
                                    <div class="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center shrink-0">
                                        <?= strtoupper(substr($doc['name'], 0, 1)) ?>
                                    </div>
                                <?php endif; ?>

                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                            <?= e($doc['specialty_name_bn'] ?: ($doc['specialty_name'] ?? 'Specialist')) ?>
                                        </span>
                                    </div>
                                    <h3 class="font-bold text-slate-900 text-sm mt-1 truncate">
                                        <?= e($doc['title'] . ' ' . $doc['name']) ?>
                                    </h3>
                                    <p class="text-[11px] text-slate-500 truncate">BMDC: <?= e($doc['bmdc_number']) ?></p>
                                </div>
                            </div>

                            <p class="text-xs text-slate-600 line-clamp-2 mb-3 min-h-[32px]">
                                <?= e($doc['qualification']) ?>
                            </p>

                            <div class="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                                <div class="flex items-center gap-1.5 truncate">
                                    <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                    <span class="truncate"><?= e($doc['chambers_summary'] ?: 'Active Chamber') ?></span>
                                </div>
                                <div class="flex items-center justify-between text-[11px]">
                                    <span class="flex items-center gap-1 text-slate-600">
                                        <i data-lucide="award" class="w-3.5 h-3.5 text-amber-500"></i>
                                        <?= (int)$doc['experience_years'] ?>+ years exp
                                    </span>
                                    <span class="font-bold text-slate-900">
                                        ৳<?= number_format((float)$doc['consultation_fee']) ?>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                            <a
                                href="/doctor/<?= $doc['id'] ?>"
                                class="w-full py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-center"
                            >
                                <?= t('Profile', 'প্রোফাইল') ?>
                            </a>
                            <a
                                href="/doctor/<?= $doc['id'] ?>"
                                class="w-full py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition text-center"
                            >
                                <?= t('Get Serial', 'সিরিয়াল নিন') ?>
                            </a>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </section>
    <?php endif; ?>
</div>
