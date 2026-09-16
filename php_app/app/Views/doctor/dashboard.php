<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Doctor Header Card -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xl shrink-0">
                <?= strtoupper(substr($doctor['name'], 0, 1)) ?>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="text-xl font-bold text-slate-900 leading-tight"><?= e($doctor['title'] . ' ' . $doctor['name']) ?></h1>
                    <?php if ($doctor['approval_status'] === 'approved'): ?>
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
                            <span><?= t('Verified Doctor', 'ভেরিফাইড ডাক্তার') ?></span>
                        </span>
                    <?php else: ?>
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i>
                            <span><?= t('Pending Verification', 'এডমিন যাচাইকরণ অপেক্ষমাণ') ?></span>
                        </span>
                    <?php endif; ?>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                    <?= e($doctor['qualification']) ?> &bull; BMDC #<?= e($doctor['bmdc_number']) ?>
                </p>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <a href="/doctor/profile" class="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition">
                <i data-lucide="user-cog" class="w-4 h-4 text-slate-500"></i>
                <span><?= t('Edit Profile', 'প্রোফাইল') ?></span>
            </a>
            <a href="/doctor/patients" class="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition">
                <i data-lucide="users" class="w-4 h-4 text-slate-500"></i>
                <span><?= t('Patients', 'রোগী তালিকা') ?></span>
            </a>
            <a href="/doctor/<?= $doctor['id'] ?>" target="_blank" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition">
                <i data-lucide="external-link" class="w-4 h-4"></i>
                <span><?= t('Public Profile', 'পাবলিক ভিউ') ?></span>
            </a>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <?php $tab = $_GET['tab'] ?? 'appointments'; ?>
    <div class="flex border-b border-slate-200 gap-2">
        <a href="/doctor/dashboard?tab=appointments" class="pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 <?= $tab === 'appointments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span><?= t('Appointments & Live Queue', 'রোগী ও সিরিয়াল ব্যবস্থাপনা') ?></span>
        </a>
        <a href="/doctor/dashboard?tab=chambers" class="pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 <?= $tab === 'chambers' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="building-2" class="w-4 h-4"></i>
            <span><?= t('Chambers', 'চেম্বার সমূহ') ?> (<?= count($chambers) ?>)</span>
        </a>
        <a href="/doctor/dashboard?tab=schedules" class="pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 <?= $tab === 'schedules' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="clock" class="w-4 h-4"></i>
            <span><?= t('Weekly Schedules', 'সাপ্তাহিক শিডিউল') ?></span>
        </a>
    </div>

    <?php if ($tab === 'appointments'): ?>
        <!-- Quick Summary Stats -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-slate-500"><?= t('Total Bookings Today', 'আজকের মোট বুকিং') ?></span>
                    <i data-lucide="calendar" class="w-4 h-4 text-slate-400"></i>
                </div>
                <div class="text-2xl font-bold text-slate-900 mt-2"><?= (int)$stats['total_today'] ?></div>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-amber-700"><?= t('Waiting Outside', 'চেম্বারে অপেক্ষমাণ') ?></span>
                    <i data-lucide="clock" class="w-4 h-4 text-amber-500"></i>
                </div>
                <div class="text-2xl font-bold text-amber-600 mt-2"><?= (int)$stats['waiting'] ?></div>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-sky-700"><?= t('In Consultation', 'বর্তমানে ভেতরে') ?></span>
                    <i data-lucide="activity" class="w-4 h-4 text-sky-500"></i>
                </div>
                <div class="text-2xl font-bold text-sky-600 mt-2"><?= (int)$stats['in_consultation'] ?></div>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-emerald-700"><?= t('Completed', 'সম্পন্ন') ?></span>
                    <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>
                </div>
                <div class="text-2xl font-bold text-emerald-600 mt-2"><?= (int)$stats['completed'] ?></div>
            </div>
        </div>

        <!-- Quick Call Next Patient Bar -->
        <?php if (!empty($chambers)): ?>
            <div class="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
                <form action="/doctor/call-next" method="POST" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <?= csrf_field() ?>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
                            <i data-lucide="bell" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                <?= t('Call Next Patient (Queue Progression)', 'পরবর্তী রোগী ডাকুন') ?>
                            </h3>
                            <p class="text-[11px] text-slate-500">
                                <?= t('Advances waiting patients and triggers real-time queue notifications', 'অপেক্ষমাণ রোগীদের ক্রম অনুসারে পরবর্তী রোগীকে ভেতরে কল করুন') ?>
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <select name="chamber_id" class="px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-semibold text-slate-800 outline-none">
                            <?php foreach ($chambers as $c): ?>
                                <option value="<?= $c['id'] ?>"><?= e($c['name']) ?></option>
                            <?php endforeach; ?>
                        </select>
                        <input type="hidden" name="schedule_date" value="<?= date('Y-m-d') ?>">
                        <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer">
                            <i data-lucide="bell" class="w-3.5 h-3.5"></i>
                            <span><?= t('Call Next', 'কল করুন') ?></span>
                        </button>
                    </div>
                </form>
            </div>
        <?php endif; ?>

        <!-- Filter Controls -->
        <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <form action="/doctor/dashboard" method="GET" class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <input type="hidden" name="tab" value="appointments">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Select Date', 'তারিখ নির্বাচন') ?></label>
                    <input type="date" name="date" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none" value="<?= $dateFilter === 'today' ? date('Y-m-d') : e($dateFilter) ?>">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1"><?= t('Status Filter', 'স্ট্যাটাস ফিল্টার') ?></label>
                    <select name="status" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none bg-white">
                        <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>><?= t('All Statuses', 'সকল অবস্থা') ?></option>
                        <option value="confirmed" <?= $statusFilter === 'confirmed' ? 'selected' : '' ?>><?= t('Confirmed', 'কনফার্মড') ?></option>
                        <option value="waiting" <?= $statusFilter === 'waiting' ? 'selected' : '' ?>><?= t('Waiting', 'অপেক্ষমাণ') ?></option>
                        <option value="called" <?= $statusFilter === 'called' ? 'selected' : '' ?>><?= t('Called', 'কল করা হয়েছে') ?></option>
                        <option value="in_consultation" <?= $statusFilter === 'in_consultation' ? 'selected' : '' ?>><?= t('In Consultation', 'পরামর্শরত') ?></option>
                        <option value="completed" <?= $statusFilter === 'completed' ? 'selected' : '' ?>><?= t('Completed', 'সম্পন্ন') ?></option>
                        <option value="no_show" <?= $statusFilter === 'no_show' ? 'selected' : '' ?>><?= t('No Show', 'অনুপস্থিত') ?></option>
                        <option value="cancelled" <?= $statusFilter === 'cancelled' ? 'selected' : '' ?>><?= t('Cancelled', 'বাতিল') ?></option>
                    </select>
                </div>
                <div>
                    <button type="submit" class="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer">
                        <i data-lucide="filter" class="w-3.5 h-3.5"></i>
                        <span><?= t('Apply Filters', 'ফিল্টার প্রয়োগ করুন') ?></span>
                    </button>
                </div>
            </form>
        </div>

        <!-- Appointments Table -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th class="py-3 px-4"><?= t('Serial', 'সিরিয়াল') ?></th>
                            <th class="py-3 px-4"><?= t('Patient Details', 'রোগীর বিবরণ') ?></th>
                            <th class="py-3 px-4"><?= t('Phone', 'মোবাইল') ?></th>
                            <th class="py-3 px-4"><?= t('Time', 'সময়') ?></th>
                            <th class="py-3 px-4"><?= t('Chamber', 'চেম্বার') ?></th>
                            <th class="py-3 px-4"><?= t('Status', 'অবস্থা') ?></th>
                            <th class="py-3 px-4 text-right"><?= t('Update Queue', 'কিউ পরিবর্তন') ?></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($appointments)): ?>
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">
                                    <i data-lucide="calendar-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                                    <p><?= t('No appointments found for the selected filter.', 'কোনো সিরিয়াল পাওয়া যায়নি।') ?></p>
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($appointments as $a): ?>
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-black text-sm border border-emerald-200">
                                            #<?= $a['serial_number'] ?>
                                        </span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <strong class="text-slate-900 block"><?= e($a['patient_name']) ?></strong>
                                        <span class="text-slate-400 text-[11px]"><?= e($a['patient_gender']) ?>, <?= (int)$a['patient_age'] ?> yrs</span>
                                        <?php if (!empty($a['problem_description'])): ?>
                                            <div class="text-slate-500 text-[11px] mt-0.5"><span class="font-semibold">Reason:</span> <?= e($a['problem_description']) ?></div>
                                        <?php endif; ?>
                                    </td>
                                    <td class="py-3 px-4">
                                        <a href="tel:<?= e($a['patient_phone']) ?>" class="font-medium text-slate-700 hover:text-emerald-600 flex items-center gap-1">
                                            <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400"></i>
                                            <span><?= e($a['patient_phone']) ?></span>
                                        </a>
                                    </td>
                                    <td class="py-3 px-4 font-semibold text-slate-600"><?= e($a['appointment_time']) ?></td>
                                    <td class="py-3 px-4 text-slate-600"><?= e($a['chamber_name']) ?></td>
                                    <td class="py-3 px-4">
                                        <?php
                                        $badgeClass = match($a['status']) {
                                            'confirmed' => 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            'waiting' => 'bg-amber-50 text-amber-700 border-amber-200',
                                            'called' => 'bg-sky-50 text-sky-700 border-sky-200',
                                            'in_consultation' => 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                            'completed' => 'bg-slate-100 text-slate-700 border-slate-200',
                                            'cancelled' => 'bg-rose-50 text-rose-700 border-rose-200',
                                            default => 'bg-slate-100 text-slate-700 border-slate-200'
                                        };
                                        ?>
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border <?= $badgeClass ?>">
                                            <?= e($a['status']) ?>
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <div class="inline-flex items-center gap-1">
                                            <!-- Next Step Actions -->
                                            <?php if ($a['status'] === 'confirmed'): ?>
                                                <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST" class="inline">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="status" value="waiting">
                                                    <button type="submit" class="px-2 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-[11px] border border-amber-200 transition">
                                                        Mark Waiting
                                                    </button>
                                                </form>
                                            <?php elseif ($a['status'] === 'waiting'): ?>
                                                <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST" class="inline">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="status" value="called">
                                                    <button type="submit" class="px-2 py-1 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-[11px] border border-sky-200 transition">
                                                        Call Inside
                                                    </button>
                                                </form>
                                            <?php elseif ($a['status'] === 'called'): ?>
                                                <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST" class="inline">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="status" value="in_consultation">
                                                    <button type="submit" class="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] border border-indigo-200 transition">
                                                        Start Consultation
                                                    </button>
                                                </form>
                                            <?php elseif ($a['status'] === 'in_consultation'): ?>
                                                <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST" class="inline">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="status" value="completed">
                                                    <button type="submit" class="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] border border-emerald-200 transition">
                                                        Complete
                                                    </button>
                                                </form>
                                            <?php endif; ?>

                                            <!-- Dropdown for other status changes -->
                                            <details class="relative inline-block text-left">
                                                <summary class="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-[11px] list-none cursor-pointer">
                                                    &bull;&bull;&bull;
                                                </summary>
                                                <div class="origin-top-right absolute right-0 mt-1 w-44 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 py-1 text-xs">
                                                    <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST">
                                                        <?= csrf_field() ?>
                                                        <input type="hidden" name="status" value="waiting">
                                                        <button type="submit" class="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50">Set Waiting</button>
                                                    </form>
                                                    <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST">
                                                        <?= csrf_field() ?>
                                                        <input type="hidden" name="status" value="called">
                                                        <button type="submit" class="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50">Call Patient</button>
                                                    </form>
                                                    <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST">
                                                        <?= csrf_field() ?>
                                                        <input type="hidden" name="status" value="in_consultation">
                                                        <button type="submit" class="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50">In Consultation</button>
                                                    </form>
                                                    <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST">
                                                        <?= csrf_field() ?>
                                                        <input type="hidden" name="status" value="completed">
                                                        <button type="submit" class="w-full text-left px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 font-semibold">Mark Completed</button>
                                                    </form>
                                                    <hr class="my-1 border-slate-100">
                                                    <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST" onsubmit="return confirm('<?= t('Mark patient as No Show?', 'রোগীকে অনুপস্থিত চিহ্নিত করবেন?') ?>');">
                                                        <?= csrf_field() ?>
                                                        <input type="hidden" name="status" value="no_show">
                                                        <button type="submit" class="w-full text-left px-3 py-1.5 text-slate-500 hover:bg-slate-50">No Show</button>
                                                    </form>
                                                    <form action="/doctor/appointment/<?= $a['id'] ?>/status" method="POST" onsubmit="return confirm('<?= t('Cancel serial?', 'সিরিয়াল বাতিল করবেন?') ?>');">
                                                        <?= csrf_field() ?>
                                                        <input type="hidden" name="status" value="cancelled">
                                                        <button type="submit" class="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-semibold">Cancel Serial</button>
                                                    </form>
                                                </div>
                                            </details>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    <?php elseif ($tab === 'chambers'): ?>
        <!-- Chambers Tab -->
        <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-900"><?= t('My Chambers & Hospital Centers', 'আমার চেম্বার সমূহ') ?></h2>
            <button
                type="button"
                onclick="document.getElementById('addChamberDialog').showModal()"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span><?= t('Add New Chamber', 'নতুন চেম্বার যোগ করুন') ?></span>
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <?php foreach ($chambers as $c): ?>
                <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                        <div class="flex items-start justify-between">
                            <h3 class="font-bold text-slate-900 text-sm"><?= e($c['name']) ?></h3>
                            <form action="/doctor/chamber/<?= $c['id'] ?>/delete" method="POST" onsubmit="return confirm('<?= t('Are you sure you want to delete this chamber?', 'এই চেম্বারটি মুছে ফেলতে চান?') ?>');">
                                <?= csrf_field() ?>
                                <button type="submit" class="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer" title="Delete Chamber">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </form>
                        </div>
                        <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-500 shrink-0"></i>
                            <span><?= e($c['address']) ?>, <?= e($c['area']) ?>, <?= e($c['city']) ?></span>
                        </p>
                        <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                            <span><?= e($c['phone'] ?: 'Helpline not set') ?></span>
                        </p>
                    </div>
                    <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-slate-500"><?= t('Consultation Fee', 'পরামর্শ ফি') ?>:</span>
                        <span class="font-extrabold text-emerald-600 text-sm">৳<?= number_format((float)$c['consultation_fee']) ?></span>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <!-- Add Chamber Dialog -->
        <dialog id="addChamberDialog" class="p-0 rounded-2xl border border-slate-200 shadow-2xl backdrop:bg-slate-900/40 max-w-lg w-full">
            <div class="p-6 space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-slate-900 text-sm"><?= t('Add New Chamber', 'নতুন চেম্বার যোগ করুন') ?></h3>
                    <button type="button" onclick="document.getElementById('addChamberDialog').close()" class="text-slate-400 hover:text-slate-700 cursor-pointer">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>

                <form action="/doctor/chamber/create" method="POST" class="space-y-3 text-xs">
                    <?= csrf_field() ?>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1"><?= t('Chamber / Hospital Name', 'চেম্বার / হাসপাতালের নাম') ?> *</label>
                        <input type="text" name="name" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" required placeholder="Ibn Sina Diagnostic Center">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1"><?= t('Full Address', 'পূর্ণ ঠিকানা') ?> *</label>
                        <input type="text" name="address" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" required placeholder="House #48, Road #9/A, Dhanmondi">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1"><?= t('City', 'শহর') ?></label>
                            <input type="text" name="city" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="Dhaka" required>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1"><?= t('Area', 'এলাকা') ?> *</label>
                            <input type="text" name="area" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" placeholder="Dhanmondi" required>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1"><?= t('Chamber Phone', 'ফোন নম্বর') ?></label>
                            <input type="tel" name="phone" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" placeholder="017XXXXXXXX">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1"><?= t('Consultation Fee (৳)', 'পরামর্শ ফি') ?> *</label>
                            <input type="number" name="consultation_fee" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="1000" min="100">
                        </div>
                    </div>

                    <div class="pt-3 flex justify-end gap-2">
                        <button type="button" onclick="document.getElementById('addChamberDialog').close()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
                            <?= t('Cancel', 'বাতিল') ?>
                        </button>
                        <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">
                            <?= t('Save Chamber', 'সংরক্ষণ করুন') ?>
                        </button>
                    </div>
                </form>
            </div>
        </dialog>

    <?php elseif ($tab === 'schedules'): ?>
        <!-- Schedules Tab -->
        <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-900"><?= t('Weekly Schedules', 'সাপ্তাহিক বসার শিডিউল') ?></h2>
            <button
                type="button"
                onclick="document.getElementById('addScheduleDialog').showModal()"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span><?= t('Add New Schedule', 'নতুন শিডিউল যোগ করুন') ?></span>
            </button>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th class="py-3 px-4"><?= t('Chamber', 'চেম্বার') ?></th>
                            <th class="py-3 px-4"><?= t('Day of Week', 'দিন') ?></th>
                            <th class="py-3 px-4"><?= t('Time Interval', 'সময়কাল') ?></th>
                            <th class="py-3 px-4"><?= t('Max Serials', 'সর্বোচ্চ সিরিয়াল') ?></th>
                            <th class="py-3 px-4"><?= t('Slot Duration', 'প্রতি স্লট') ?></th>
                            <th class="py-3 px-4"><?= t('Status', 'অবস্থা') ?></th>
                            <th class="py-3 px-4 text-right"><?= t('Action', 'অ্যাকশন') ?></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($schedules)): ?>
                            <tr>
                                <td colspan="7" class="py-8 text-center text-slate-400">
                                    <?= t('No schedules created yet.', 'কোনো শিডিউল পাওয়া যায়নি।') ?>
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($schedules as $s): ?>
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td class="py-3 px-4 font-bold text-slate-900"><?= e($s['chamber_name']) ?></td>
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                            <?= e($s['day_of_week']) ?>
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 font-semibold text-slate-600">
                                        <?= date('g:i A', strtotime($s['start_time'])) ?> - <?= date('g:i A', strtotime($s['end_time'])) ?>
                                    </td>
                                    <td class="py-3 px-4 font-extrabold text-emerald-600"><?= (int)$s['max_serials'] ?> <?= t('Serials', 'জন') ?></td>
                                    <td class="py-3 px-4 text-slate-500"><?= (int)$s['slot_duration_minutes'] ?> mins</td>
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Active
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <form action="/doctor/schedule/<?= $s['id'] ?>/delete" method="POST" onsubmit="return confirm('<?= t('Delete schedule?', 'শিডিউল মুছে ফেলতে চান?') ?>');" class="inline">
                                            <?= csrf_field() ?>
                                            <button type="submit" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add Schedule Dialog -->
        <dialog id="addScheduleDialog" class="p-0 rounded-2xl border border-slate-200 shadow-2xl backdrop:bg-slate-900/40 max-w-lg w-full">
            <div class="p-6 space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-slate-900 text-sm"><?= t('Add New Schedule', 'নতুন শিডিউল যোগ করুন') ?></h3>
                    <button type="button" onclick="document.getElementById('addScheduleDialog').close()" class="text-slate-400 hover:text-slate-700 cursor-pointer">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>

                <form action="/doctor/schedule/create" method="POST" class="space-y-3 text-xs">
                    <?= csrf_field() ?>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1"><?= t('Select Chamber', 'চেম্বার নির্বাচন') ?> *</label>
                        <select name="chamber_id" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white" required>
                            <?php foreach ($chambers as $c): ?>
                                <option value="<?= $c['id'] ?>"><?= e($c['name']) ?> (<?= e($c['area']) ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1"><?= t('Day of Week', 'সপ্তাহের দিন') ?> *</label>
                        <select name="day_of_week" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white" required>
                            <option value="Friday">Friday (শুক্রবার)</option>
                            <option value="Saturday">Saturday (শনিবার)</option>
                            <option value="Sunday">Sunday (রবিবার)</option>
                            <option value="Monday">Monday (সোমবার)</option>
                            <option value="Tuesday">Tuesday (মঙ্গলবার)</option>
                            <option value="Wednesday">Wednesday (বুধবার)</option>
                            <option value="Thursday">Thursday (বৃহস্পতিবার)</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1"><?= t('Start Time', 'শুরুর সময়') ?> *</label>
                            <input type="time" name="start_time" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="17:00" required>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1"><?= t('End Time', 'শেষের সময়') ?> *</label>
                            <input type="time" name="end_time" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="21:00" required>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1"><?= t('Max Serials', 'সর্বোচ্চ সিরিয়াল') ?> *</label>
                            <input type="number" name="max_serials" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="25" min="1" max="100" required>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1"><?= t('Slot Duration (min)', 'প্রতি স্লট মিনিট') ?></label>
                            <input type="number" name="slot_duration_minutes" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="10" min="5" max="60">
                        </div>
                    </div>

                    <div class="pt-3 flex justify-end gap-2">
                        <button type="button" onclick="document.getElementById('addScheduleDialog').close()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
                            <?= t('Cancel', 'বাতিল') ?>
                        </button>
                        <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">
                            <?= t('Save Schedule', 'সংরক্ষণ করুন') ?>
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    <?php endif; ?>
</div>
