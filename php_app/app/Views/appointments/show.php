<div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Top action navigation -->
    <div class="flex items-center justify-between mb-4 no-print">
        <a href="<?= authCheck() ? (currentUser()['role'] === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard') : '/doctors' ?>" class="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span><?= t('Back to Dashboard', 'ফিরে যান') ?></span>
        </a>
        <button onclick="window.print()" class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer">
            <i data-lucide="printer" class="w-4 h-4"></i>
            <span><?= t('Print Serial Slip', 'প্রিন্ট রসিদ') ?></span>
        </button>
    </div>

    <!-- Official Slip Card -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        <!-- Receipt Header -->
        <div class="text-center border-b border-slate-100 pb-5 space-y-1">
            <div class="inline-flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white">
                    <i data-lucide="stethoscope" class="w-4 h-4"></i>
                </div>
                <span class="font-extrabold text-slate-900 text-lg tracking-tight">Daktar Serial</span>
            </div>
            <p class="text-xs text-slate-500 font-medium"><?= t('Official Chamber Serial Confirmation Slip', 'অফিসিয়াল চেম্বার সিরিয়াল বুকিং কনফার্মেশন স্লিপ') ?></p>
            <div class="pt-1">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    ID: <?= e($appointment['appointment_id']) ?>
                </span>
            </div>
        </div>

        <!-- Serial Number Box -->
        <div class="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 text-center">
            <span class="text-xs uppercase font-bold text-emerald-800 tracking-wider block mb-1">
                <?= t('Assigned Chamber Serial', 'আপনার নির্ধারিত সিরিয়াল নম্বর') ?>
            </span>
            <span class="text-5xl sm:text-6xl font-black text-emerald-800 tracking-tight">
                #<?= str_pad((string)$appointment['serial_number'], 2, '0', STR_PAD_LEFT) ?>
            </span>
            <div class="flex items-center justify-center gap-6 mt-3 text-xs">
                <div>
                    <span class="text-emerald-700 block"><?= t('Date', 'তারিখ') ?></span>
                    <strong class="text-slate-900 text-sm"><?= date('d F, Y (l)', strtotime($appointment['schedule_date'])) ?></strong>
                </div>
                <div class="border-l border-emerald-200 pl-6">
                    <span class="text-emerald-700 block"><?= t('Estimated Time', 'আনুমানিক সময়') ?></span>
                    <strong class="text-slate-900 text-sm"><?= e($appointment['appointment_time']) ?></strong>
                </div>
            </div>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block"><?= t('Doctor Details', 'ডাক্তার তথ্য') ?></span>
                <h4 class="font-bold text-slate-900 text-sm"><?= e($appointment['doctor_title'] . ' ' . $appointment['doctor_name']) ?></h4>
                <p class="text-slate-600"><?= e($appointment['doctor_qualification']) ?></p>
                <span class="inline-block text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 mt-1">
                    BMDC: <?= e($appointment['bmdc_number']) ?>
                </span>
            </div>

            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block"><?= t('Chamber Location', 'চেম্বার ও লোকেশন') ?></span>
                <h4 class="font-bold text-slate-900 text-sm"><?= e($appointment['chamber_name']) ?></h4>
                <p class="text-slate-600"><?= e($appointment['chamber_address']) ?></p>
                <p class="text-slate-500"><?= e($appointment['chamber_area']) ?>, <?= e($appointment['chamber_city']) ?></p>
            </div>
        </div>

        <!-- Patient and Payment Info -->
        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
            <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span class="text-slate-500"><?= t('Patient Name', 'রোগীর নাম') ?>:</span>
                <strong class="text-slate-900"><?= e($appointment['patient_name']) ?></strong>
            </div>
            <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span class="text-slate-500"><?= t('Patient Phone', 'রোগীর মোবাইল') ?>:</span>
                <span class="text-slate-800 font-medium"><?= e($appointment['patient_phone']) ?></span>
            </div>
            <div class="flex items-center justify-between pt-1">
                <span class="text-slate-500"><?= t('Consultation Fee (Payable at Chamber)', 'পরামর্শ ফি (চেম্বারে প্রদেয়)') ?>:</span>
                <span class="text-base font-extrabold text-emerald-600">৳<?= number_format((float)$appointment['fee']) ?></span>
            </div>
        </div>

        <!-- Footer instructions -->
        <div class="text-[11px] text-slate-400 text-center space-y-1 border-t border-slate-100 pt-4">
            <p><?= t('Please arrive at the chamber 15 minutes before your estimated time.', 'অনুগ্রহ করে আনুমানিক সময়ের ১৫ মিনিট পূর্বে চেম্বারে উপস্থিত থাকুন।') ?></p>
            <p><?= t('Present this digital slip or printed copy at the reception desk.', 'চেম্বারের অভ্যর্থনায় এই ডিজিটাল স্লিপ বা প্রিন্ট কপি প্রদর্শন করুন।') ?></p>
        </div>
    </div>
</div>
