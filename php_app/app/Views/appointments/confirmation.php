<div class="max-w-2xl mx-auto px-4 py-12">
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center">
        <!-- Top Emerald Banner -->
        <div class="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8 relative">
            <div class="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 text-white border border-white/30">
                <i data-lucide="check-circle-2" class="w-10 h-10"></i>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
                <?= t('Chamber Serial Confirmed!', 'সিরিয়াল বুকিং সফল হয়েছে!') ?>
            </h1>
            <p class="text-emerald-100 text-xs sm:text-sm mt-1">
                <?= t('Your doctor chamber appointment is officially registered with double-booking guarantee.', 'ডাক্তারের চেম্বারে আপনার সিরিয়াল সুরক্ষিত ও নিশ্চিত করা হয়েছে।') ?>
            </p>
        </div>

        <!-- Serial Highlight -->
        <div class="p-6 sm:p-8 space-y-6">
            <div class="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 flex flex-col items-center justify-center">
                <span class="text-xs uppercase font-bold text-emerald-800 tracking-wider mb-1">
                    <?= t('Your Chamber Serial Number', 'আপনার সিরিয়াল নম্বর') ?>
                </span>
                <span class="text-5xl sm:text-6xl font-black text-emerald-800 tracking-tight">
                    #<?= str_pad((string)$booking['serial_number'], 2, '0', STR_PAD_LEFT) ?>
                </span>
                <div class="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-xs font-semibold text-emerald-700 shadow-2xs">
                    <span>ID: <?= e($booking['appointment_id']) ?></span>
                </div>
            </div>

            <!-- Details Table / Grid -->
            <div class="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-left text-xs sm:text-sm space-y-3">
                <div class="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span class="text-slate-500"><?= t('Doctor', 'চিকিৎসক') ?></span>
                    <span class="font-bold text-slate-900"><?= e($booking['doctor_name']) ?></span>
                </div>
                <div class="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span class="text-slate-500"><?= t('Chamber Location', 'চেম্বার') ?></span>
                    <span class="font-semibold text-slate-800"><?= e($booking['chamber_name']) ?></span>
                </div>
                <div class="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span class="text-slate-500"><?= t('Date & Time', 'তারিখ ও আনুমানিক সময়') ?></span>
                    <span class="font-semibold text-slate-800"><?= e($booking['schedule_date']) ?> (<?= e($booking['appointment_time']) ?>)</span>
                </div>
                <div class="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span class="text-slate-500"><?= t('Patient Name', 'রোগীর নাম') ?></span>
                    <span class="font-semibold text-slate-800"><?= e($booking['patient_name']) ?></span>
                </div>
                <div class="flex items-center justify-between py-1 pt-2">
                    <span class="text-slate-500"><?= t('Payable at Chamber', 'চেম্বারে প্রদেয় ফি') ?></span>
                    <span class="text-base font-extrabold text-emerald-600">৳<?= number_format((float)$booking['fee']) ?></span>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2 no-print">
                <button
                    type="button"
                    onclick="window.print()"
                    class="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                    <i data-lucide="printer" class="w-4 h-4"></i>
                    <span><?= t('Print Slip', 'রসিদ প্রিন্ট করুন') ?></span>
                </button>
                <a
                    href="/patient/dashboard"
                    class="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                    <i data-lucide="calendar-check" class="w-4 h-4"></i>
                    <span><?= t('View My Appointments', 'আমার বুকিং সমূহে যান') ?></span>
                </a>
            </div>
        </div>
    </div>
</div>
