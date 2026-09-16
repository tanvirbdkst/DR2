<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <!-- Back button -->
    <div>
        <a href="/doctors" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span><?= t('Back to All Doctors', 'সকল ডাক্তারের তালিকা') ?></span>
        </a>
    </div>

    <!-- Doctor Header Profile Card -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <?php if (!empty($doctor['avatar_url'])): ?>
                <img
                    src="<?= e($doctor['avatar_url']) ?>"
                    alt="<?= e($doctor['name']) ?>"
                    class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-slate-100 shrink-0"
                />
            <?php else: ?>
                <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-3xl flex items-center justify-center shrink-0">
                    <?= strtoupper(substr($doctor['name'], 0, 1)) ?>
                </div>
            <?php endif; ?>

            <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <?= e($doctor['specialty_name_bn'] ?: $doctor['specialty_name']) ?>
                    </span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-600"></i>
                        <span>BMDC: <?= e($doctor['bmdc_number']) ?></span>
                    </span>
                </div>

                <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    <?= e($doctor['title'] . ' ' . $doctor['name']) ?>
                </h1>

                <p class="text-xs sm:text-sm text-slate-600">
                    <?= e($doctor['qualification']) ?>
                </p>

                <div class="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-500">
                    <span class="flex items-center gap-1">
                        <i data-lucide="award" class="w-4 h-4 text-amber-500"></i>
                        <span><?= (int)$doctor['experience_years'] ?>+ <?= t('years experience', 'বছরের অভিজ্ঞতা') ?></span>
                    </span>
                    <span class="flex items-center gap-1">
                        <i data-lucide="banknote" class="w-4 h-4 text-emerald-600"></i>
                        <span><?= t('Consultation Fee:', 'পরামর্শ ফি:') ?> <strong class="text-slate-900 font-bold">৳<?= number_format((float)$doctor['consultation_fee']) ?></strong></span>
                    </span>
                    <span class="flex items-center gap-1">
                        <i data-lucide="star" class="w-4 h-4 text-amber-400 fill-amber-400"></i>
                        <span><?= $avgRating ?> (<?= count($reviews) ?> <?= t('reviews', 'রিভিউ') ?>)</span>
                    </span>
                </div>
            </div>
        </div>
    </div>

    <!-- Booking Interface & Chambers Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left Column: Chambers, Doctor Bio & Reviews -->
        <div class="lg:col-span-5 space-y-6">
            <!-- Doctor Chambers Details -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div class="flex items-center gap-2">
                    <i data-lucide="building-2" class="w-5 h-5 text-emerald-600"></i>
                    <h3 class="font-bold text-slate-900 text-sm sm:text-base"><?= t('Chambers & Visiting Schedules', 'চেম্বার ও বসার সময়সূচী') ?></h3>
                </div>

                <?php if (empty($chambers)): ?>
                    <p class="text-xs text-slate-400"><?= t('No active chamber listed.', 'কোনো চেম্বার তালিকাভুক্ত নেই।') ?></p>
                <?php else: ?>
                    <div class="space-y-3">
                        <?php foreach ($chambers as $c): ?>
                            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <div class="flex items-start justify-between gap-2">
                                    <h4 class="font-bold text-slate-900 text-xs sm:text-sm"><?= e($c['name']) ?></h4>
                                    <span class="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                                </div>
                                <p class="text-xs text-slate-600 flex items-start gap-1.5">
                                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"></i>
                                    <span><?= e($c['address']) ?>, <?= e($c['area']) ?>, <?= e($c['city']) ?></span>
                                </p>
                                <p class="text-xs text-slate-600 flex items-center gap-1.5">
                                    <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                    <span><?= e($c['phone'] ?: 'Chamber Helpline') ?></span>
                                </p>

                                <!-- Schedules for this chamber -->
                                <div class="pt-2 border-t border-slate-200/60">
                                    <span class="text-[11px] font-semibold text-slate-700 block mb-1"><?= t('Consultation Days:', 'সাপ্তাহিক শিডিউল:') ?></span>
                                    <?php
                                    $chamSchedules = array_filter($schedules, fn($s) => (int)$s['chamber_id'] === (int)$c['id']);
                                    ?>
                                    <?php if (empty($chamSchedules)): ?>
                                        <span class="text-[11px] text-slate-400"><?= t('Schedule pending', 'শিডিউল শীঘ্রই দেওয়া হবে') ?></span>
                                    <?php else: ?>
                                        <div class="flex flex-wrap gap-1.5">
                                            <?php foreach ($chamSchedules as $cs): ?>
                                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white border border-slate-200 text-slate-700 font-medium">
                                                    <i data-lucide="clock" class="w-3 h-3 text-slate-400"></i>
                                                    <span class="capitalize"><?= e($cs['day_of_week']) ?></span>:
                                                    <?= date('g:i A', strtotime($cs['start_time'])) ?> - <?= date('g:i A', strtotime($cs['end_time'])) ?>
                                                </span>
                                            <?php endforeach; ?>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>

            <!-- About Doctor -->
            <?php if (!empty($doctor['bio'])): ?>
                <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                    <h3 class="font-bold text-slate-900 text-sm sm:text-base"><?= t('Doctor Profile & Bio', 'ডাক্তার পরিচিতি') ?></h3>
                    <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-line"><?= e($doctor['bio']) ?></p>
                </div>
            <?php endif; ?>

            <!-- Patient Reviews -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                        <i data-lucide="message-square" class="w-4 h-4 text-emerald-600"></i>
                        <span><?= t('Patient Reviews', 'রোগীদের মতামত') ?> (<?= count($reviews) ?>)</span>
                    </h3>
                </div>

                <?php if (empty($reviews)): ?>
                    <p class="text-xs text-slate-400"><?= t('No reviews submitted yet. Verified patients can review after consultation.', 'এখনো কোনো রিভিউ নেই। চেম্বারে সেবা নেয়ার পর রোগীরা মতামত প্রদান করেন।') ?></p>
                <?php else: ?>
                    <div class="space-y-2.5 divide-y divide-slate-100">
                        <?php foreach ($reviews as $rev): ?>
                            <div class="pt-2.5 first:pt-0">
                                <div class="flex items-center justify-between text-xs mb-1">
                                    <strong class="font-semibold text-slate-800"><?= e($rev['patient_name']) ?></strong>
                                    <div class="flex text-amber-400">
                                        <?= str_repeat('★', (int)$rev['rating']) ?>
                                    </div>
                                </div>
                                <p class="text-xs text-slate-600"><?= e($rev['review_text']) ?></p>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Right Column: Interactive Real-time Serial Booking Widget -->
        <div class="lg:col-span-7">
            <div class="bg-white rounded-2xl border-2 border-emerald-500 shadow-xl p-5 sm:p-6 space-y-5">
                <div class="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                        <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-1">
                            <i data-lucide="lock" class="w-3 h-3"></i>
                            <span><?= t('Double-Booking Safeguards Active', 'ডাবল বুকিং সুরক্ষা সক্রিয়') ?></span>
                        </div>
                        <h2 class="text-lg sm:text-xl font-bold text-slate-900">
                            <?= t('Book Chamber Serial Number', 'চেম্বার সিরিয়াল বুকিং') ?>
                        </h2>
                    </div>
                    <div class="text-right">
                        <span class="text-[11px] text-slate-400 block"><?= t('Consultation Fee', 'পরামর্শ ফি') ?></span>
                        <span class="text-lg font-extrabold text-emerald-600">৳<?= number_format((float)$doctor['consultation_fee']) ?></span>
                    </div>
                </div>

                <form id="bookingForm" action="/appointment/book" method="POST" class="space-y-5">
                    <?= csrf_field() ?>
                    <input type="hidden" name="doctor_id" value="<?= $doctor['id'] ?>">

                    <!-- Step 1: Chamber & Date Selection -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-800 mb-1.5">
                                1. <?= t('Select Chamber', 'চেম্বার নির্বাচন করুন') ?> <span class="text-rose-500">*</span>
                            </label>
                            <select
                                name="chamber_id"
                                id="chamberSelect"
                                class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                                required
                            >
                                <?php foreach ($chambers as $c): ?>
                                    <option value="<?= $c['id'] ?>"><?= e($c['name']) ?> (<?= e($c['area']) ?>)</option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-800 mb-1.5">
                                2. <?= t('Select Date', 'তারিখ নির্বাচন করুন') ?> <span class="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="schedule_date"
                                id="dateInput"
                                value="<?= date('Y-m-d') ?>"
                                min="<?= date('Y-m-d') ?>"
                                class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    <!-- Step 2: Slot / Serial Grid -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <label class="block text-xs font-bold text-slate-800">
                                3. <?= t('Pick Your Serial Number', 'সিরিয়াল নম্বর বেছে নিন') ?> <span class="text-rose-500">*</span>
                            </label>
                            <span id="slotStatusBadge" class="text-[11px] font-semibold text-slate-500">
                                <?= t('Checking availability...', 'সিরিয়াল লোড হচ্ছে...') ?>
                            </span>
                        </div>

                        <div
                            id="slotsContainer"
                            class="p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[120px] flex flex-wrap gap-2 items-center justify-center"
                        >
                            <span class="text-xs text-slate-400"><?= t('Loading serials...', 'সিরিয়াল লোড হচ্ছে...') ?></span>
                        </div>
                        <input type="hidden" name="serial_number" id="selectedSerialNumber" value="" required>
                    </div>

                    <!-- Step 3: Patient Information -->
                    <div class="pt-4 border-t border-slate-100 space-y-4">
                        <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            4. <?= t('Patient Details & Contact', 'রোগীর বিবরণ ও মোবাইল') ?>
                        </h3>

                        <?php $currUser = currentUser(); ?>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    <?= t('Patient Full Name', 'রোগীর পুরো নাম') ?> <span class="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="patient_name"
                                    value="<?= e($currUser['name'] ?? '') ?>"
                                    placeholder="Md. Rahim Khan"
                                    class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    <?= t('Phone Number', 'মোবাইল নম্বর') ?> <span class="text-rose-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="patient_phone"
                                    value="<?= e($currUser['phone'] ?? '') ?>"
                                    placeholder="017XXXXXXXX"
                                    class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Age', 'বয়স') ?></label>
                                <input
                                    type="number"
                                    name="patient_age"
                                    value="28"
                                    min="1"
                                    max="120"
                                    class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Gender', 'লিঙ্গ') ?></label>
                                <select
                                    name="patient_gender"
                                    class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                                >
                                    <option value="male"><?= t('Male', 'পুরুষ') ?></option>
                                    <option value="female"><?= t('Female', 'মহিলা') ?></option>
                                    <option value="other"><?= t('Other', 'অন্যান্য') ?></option>
                                </select>
                            </div>

                            <div class="sm:col-span-2">
                                <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Problem Description (Optional)', 'সমস্যার বিবরণ (ঐচ্ছিক)') ?></label>
                                <textarea
                                    name="problem_description"
                                    rows="2"
                                    placeholder="<?= t('Fever, headache, routine checkup...', 'জ্বর, মাথাব্যথা, রুটিন চেকআপ ইত্যাদি...') ?>"
                                    class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <div class="pt-2">
                        <button
                            type="submit"
                            id="bookSubmitBtn"
                            disabled
                            class="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <i data-lucide="shield-check" class="w-5 h-5"></i>
                            <span id="btnSubmitText"><?= t('Select a Serial Number to Continue', 'সিরিয়াল নম্বর বেছে নিন') ?></span>
                        </button>
                        <p class="text-[11px] text-slate-400 text-center mt-2">
                            <?= t('No advance payment needed. Pay consultation fee directly at chamber desk.', 'কোনো অগ্রিম ফি প্রয়োজন নেই। চেম্বারে সরাসরি ফি প্রদান করুন।') ?>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const chamberSelect = document.getElementById('chamberSelect');
    const dateInput = document.getElementById('dateInput');
    const slotsContainer = document.getElementById('slotsContainer');
    const slotStatusBadge = document.getElementById('slotStatusBadge');
    const selectedSerialInput = document.getElementById('selectedSerialNumber');
    const bookSubmitBtn = document.getElementById('bookSubmitBtn');
    const btnSubmitText = document.getElementById('btnSubmitText');

    const doctorId = <?= (int)$doctor['id'] ?>;

    async function loadAvailability() {
        const chamberId = chamberSelect.value;
        const date = dateInput.value;

        if (!chamberId || !date) return;

        slotsContainer.innerHTML = '<span class="text-xs text-slate-400">লোডিং...</span>';
        selectedSerialInput.value = '';
        bookSubmitBtn.disabled = true;
        btnSubmitText.textContent = 'সিরিয়াল নম্বর বেছে নিন';

        try {
            const res = await fetch(`/api/availability?doctorId=${doctorId}&chamberId=${chamberId}&date=${date}`);
            const data = await res.json();

            if (!data.available) {
                slotStatusBadge.className = 'text-[11px] font-semibold text-rose-500';
                slotStatusBadge.textContent = 'শিডিউল নেই';
                slotsContainer.innerHTML = `<div class="text-rose-600 text-xs p-3 text-center">${data.message || 'এই তারিখে ডাক্তারের কোনো বসার শিডিউল নেই। অনুগ্রহ করে অন্য দিন নির্বাচন করুন।'}</div>`;
                return;
            }

            const freeCount = data.serials.filter(s => s.status === 'available').length;
            slotStatusBadge.className = 'text-[11px] font-semibold text-emerald-600';
            slotStatusBadge.textContent = `${freeCount} টি সিরিয়াল খালি আছে`;

            slotsContainer.innerHTML = '';
            data.serials.forEach(slot => {
                const btn = document.createElement('button');
                btn.type = 'button';

                if (slot.status === 'booked') {
                    btn.disabled = true;
                    btn.className = 'w-16 h-14 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed flex flex-col items-center justify-center text-xs opacity-60';
                    btn.innerHTML = `<span class="font-bold">#${slot.serial_number}</span><span class="text-[9px] uppercase font-semibold text-slate-400">বুকড</span>`;
                } else {
                    btn.className = 'w-16 h-14 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-sm text-slate-800 flex flex-col items-center justify-center text-xs transition cursor-pointer';
                    btn.innerHTML = `<span class="font-bold text-emerald-600">#${slot.serial_number}</span><span class="text-[9px] text-slate-400">${slot.time || ''}</span>`;
                    btn.onclick = function () {
                        document.querySelectorAll('#slotsContainer button').forEach(b => {
                            if (!b.disabled) {
                                b.className = 'w-16 h-14 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 text-slate-800 flex flex-col items-center justify-center text-xs transition cursor-pointer';
                            }
                        });
                        btn.className = 'w-16 h-14 rounded-xl bg-emerald-600 text-white shadow-md font-bold flex flex-col items-center justify-center text-xs scale-105 transition';
                        btn.querySelector('.text-emerald-600')?.classList.replace('text-emerald-600', 'text-white');
                        selectedSerialInput.value = slot.serial_number;
                        bookSubmitBtn.disabled = false;
                        btnSubmitText.textContent = `সিরিয়াল #${slot.serial_number} বুকিং নিশ্চিত করুন`;
                    };
                }
                slotsContainer.appendChild(btn);
            });
        } catch (err) {
            slotsContainer.innerHTML = '<div class="text-rose-500 text-xs">সিরিয়াল লোড করতে ব্যর্থ হয়েছে।</div>';
        }
    }

    chamberSelect.addEventListener('change', loadAvailability);
    dateInput.addEventListener('change', loadAvailability);

    loadAvailability();
});
</script>
