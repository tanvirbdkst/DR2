<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Patient Header Card -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xl shrink-0">
                <?= strtoupper(substr($user['name'], 0, 1)) ?>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="text-xl font-bold text-slate-900 leading-tight"><?= e($user['name']) ?></h1>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <?= t('Patient Account', 'রোগী অ্যাকাউন্ট') ?>
                    </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span class="flex items-center gap-1"><i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400"></i><?= e($user['phone']) ?></span>
                    <span class="flex items-center gap-1"><i data-lucide="mail" class="w-3.5 h-3.5 text-slate-400"></i><?= e($user['email']) ?></span>
                </p>
            </div>
        </div>

        <div class="flex items-center gap-2">
            <a href="/patient/profile" class="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition">
                <i data-lucide="user-cog" class="w-4 h-4 text-slate-500"></i>
                <span><?= t('Edit Profile', 'প্রোফাইল') ?></span>
            </a>
            <a href="/doctors" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span><?= t('Book New Serial', 'নতুন সিরিয়াল নিন') ?></span>
            </a>
        </div>
    </div>

    <!-- Appointments History Header -->
    <div class="flex items-center justify-between">
        <div>
            <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <i data-lucide="calendar-check" class="w-5 h-5 text-emerald-600"></i>
                <span><?= t('My Appointments & Chamber Serials', 'আমার সিরিয়াল ও অ্যাপয়েন্টমেন্টসমূহ') ?></span>
            </h2>
            <p class="text-xs text-slate-500 mt-0.5"><?= t('Live status and details of your booked slots', 'আপনার বুক করা চেম্বার সিরিয়ালসমূহ') ?></p>
        </div>
        <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            <?= count($appointments) ?> <?= t('Bookings', 'টি বুকিং') ?>
        </span>
    </div>

    <?php if (empty($appointments)): ?>
        <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
            <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <i data-lucide="calendar-x" class="w-6 h-6"></i>
            </div>
            <h3 class="text-base font-bold text-slate-900"><?= t('No serial bookings found', 'কোনো সিরিয়াল বুকিং পাওয়া যায়নি') ?></h3>
            <p class="text-xs text-slate-500">
                <?= t('Search top specialist doctors and book your preferred chamber serial number today.', 'আপনার পছন্দমতো বিশেষজ্ঞ ডাক্তার খুঁজে সহজে সিরিয়াল বুক করুন।') ?>
            </p>
            <div class="pt-2">
                <a href="/doctors" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                    <i data-lucide="search" class="w-3.5 h-3.5"></i>
                    <span><?= t('Browse Specialist Doctors', 'ডাক্তারদের তালিকা দেখুন') ?></span>
                </a>
            </div>
        </div>
    <?php else: ?>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <?php foreach ($appointments as $appt): ?>
                <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4">
                    <div>
                        <!-- Header with ID & Status -->
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                ID: <?= e($appt['appointment_id']) ?>
                            </span>

                            <?php
                            $statusStyle = match($appt['status']) {
                                'confirmed' => 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                'waiting' => 'bg-amber-50 text-amber-700 border-amber-200',
                                'called' => 'bg-sky-50 text-sky-700 border-sky-200',
                                'in_consultation' => 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                'completed' => 'bg-slate-100 text-slate-700 border-slate-200',
                                'cancelled' => 'bg-rose-50 text-rose-700 border-rose-200',
                                default => 'bg-slate-100 text-slate-700 border-slate-200'
                            };
                            ?>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border <?= $statusStyle ?>">
                                <?= e($appt['status']) ?>
                            </span>
                        </div>

                        <!-- Doctor & Serial Block -->
                        <div class="flex items-start gap-4 mb-3">
                            <div class="w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col items-center justify-center shrink-0 p-1">
                                <span class="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">Serial</span>
                                <span class="text-xl font-black">#<?= e((string)$appt['serial_number']) ?></span>
                            </div>

                            <div class="min-w-0 flex-1">
                                <h3 class="font-bold text-slate-900 text-sm truncate">
                                    <?= e($appt['doctor_title'] . ' ' . $appt['doctor_name']) ?>
                                </h3>
                                <p class="text-xs font-semibold text-emerald-600 truncate">
                                    <?= e($appt['specialty_name_bn'] ?: $appt['specialty_name']) ?>
                                </p>
                                <p class="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                                    <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                    <span class="truncate"><?= e($appt['chamber_name']) ?>, <?= e($appt['chamber_area']) ?></span>
                                </p>
                            </div>
                        </div>

                        <!-- Details Grid -->
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 grid grid-cols-2 gap-2">
                            <div><span class="text-slate-400 block text-[10px]"><?= t('Date', 'তারিখ') ?>:</span> <strong class="text-slate-800"><?= e($appt['schedule_date']) ?></strong></div>
                            <div><span class="text-slate-400 block text-[10px]"><?= t('Estimated Time', 'সময়') ?>:</span> <strong class="text-slate-800"><?= e($appt['appointment_time']) ?></strong></div>
                            <div><span class="text-slate-400 block text-[10px]"><?= t('Patient', 'রোগী') ?>:</span> <strong class="text-slate-800"><?= e($appt['patient_name']) ?></strong></div>
                            <div><span class="text-slate-400 block text-[10px]"><?= t('Fee', 'ফি') ?>:</span> <strong class="text-emerald-700 font-bold">৳<?= number_format((float)$appt['fee']) ?></strong></div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div class="flex items-center gap-2">
                            <a href="/appointment/<?= $appt['id'] ?>" class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1">
                                <i data-lucide="receipt" class="w-3.5 h-3.5 text-slate-400"></i>
                                <span><?= t('View Slip', 'রসিদ') ?></span>
                            </a>
                        </div>

                        <div>
                            <?php if (in_array($appt['status'], ['confirmed', 'waiting'])): ?>
                                <form action="/patient/appointment/<?= $appt['id'] ?>/cancel" method="POST" onsubmit="return confirm('<?= t('Are you sure you want to cancel this serial booking?', 'আপনি কি সত্যিই এই সিরিয়াল বাতিল করতে চান?') ?>');" class="inline">
                                    <?= csrf_field() ?>
                                    <button type="submit" class="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium transition cursor-pointer">
                                        <?= t('Cancel Serial', 'বাতিল') ?>
                                    </button>
                                </form>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
