<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Admin Header -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <i data-lucide="shield-check" class="w-6 h-6"></i>
            </div>
            <div>
                <h1 class="text-xl font-bold text-slate-900 leading-tight"><?= t('Admin Control Center', 'এডমিন কন্ট্রোল সেন্টার') ?></h1>
                <p class="text-xs text-slate-500 mt-0.5"><?= t('Doctor verification, patient management, chamber monitoring & system logs', 'ডাক্তার ভেরিফিকেশন, রোগী ব্যবস্থাপনা, চেম্বার মনিটরিং ও প্ল্যাটফর্ম কন্ট্রোল') ?></p>
            </div>
        </div>
        <div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
                <span>Super Admin</span>
            </span>
        </div>
    </div>

    <!-- Platform Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-amber-700"><?= t('Pending Verification', 'অনুমোদনের অপেক্ষায় ডাক্তার') ?></span>
                <i data-lucide="alert-circle" class="w-4 h-4 text-amber-500"></i>
            </div>
            <div class="text-2xl font-bold text-amber-600 mt-2"><?= (int)$pendingDocs ?></div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-emerald-700"><?= t('Approved Doctors', 'অনুমোদিত মোট ডাক্তার') ?></span>
                <i data-lucide="stethoscope" class="w-4 h-4 text-emerald-500"></i>
            </div>
            <div class="text-2xl font-bold text-emerald-600 mt-2"><?= (int)$approvedDocs ?></div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-sky-700"><?= t('Registered Patients', 'নিবন্ধিত রোগী') ?></span>
                <i data-lucide="users" class="w-4 h-4 text-sky-500"></i>
            </div>
            <div class="text-2xl font-bold text-sky-600 mt-2"><?= (int)$totalPatients ?></div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-600"><?= t('Total Serials Booked', 'সর্বমোট অ্যাপয়েন্টমেন্ট') ?></span>
                <i data-lucide="calendar-check" class="w-4 h-4 text-slate-400"></i>
            </div>
            <div class="text-2xl font-bold text-slate-900 mt-2"><?= (int)$totalAppts ?></div>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs sm:text-sm font-semibold">
        <a href="/admin/dashboard?tab=doctors" class="pb-3 px-3.5 border-b-2 whitespace-nowrap flex items-center gap-1.5 <?= ($activeTab === 'doctors' || $activeTab === 'overview') ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="stethoscope" class="w-4 h-4"></i>
            <span><?= t('Doctors', 'ডাক্তার তালিকা') ?> (<?= count($doctors) ?>)</span>
        </a>
        <a href="/admin/dashboard?tab=patients" class="pb-3 px-3.5 border-b-2 whitespace-nowrap flex items-center gap-1.5 <?= $activeTab === 'patients' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span><?= t('Patients', 'রোগী তালিকা') ?> (<?= count($patients) ?>)</span>
        </a>
        <a href="/admin/dashboard?tab=appointments" class="pb-3 px-3.5 border-b-2 whitespace-nowrap flex items-center gap-1.5 <?= $activeTab === 'appointments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="calendar-check" class="w-4 h-4"></i>
            <span><?= t('Appointments', 'বুকিং সমূহ') ?> (<?= count($appointments) ?>)</span>
        </a>
        <a href="/admin/dashboard?tab=specialties" class="pb-3 px-3.5 border-b-2 whitespace-nowrap flex items-center gap-1.5 <?= $activeTab === 'specialties' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="tags" class="w-4 h-4"></i>
            <span><?= t('Specialties', 'স্পেশালিটি') ?> (<?= count($specialties) ?>)</span>
        </a>
        <a href="/admin/dashboard?tab=hospitals" class="pb-3 px-3.5 border-b-2 whitespace-nowrap flex items-center gap-1.5 <?= $activeTab === 'hospitals' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="building-2" class="w-4 h-4"></i>
            <span><?= t('Hospitals', 'হাসপাতাল') ?> (<?= count($hospitals) ?>)</span>
        </a>
        <a href="/admin/dashboard?tab=reviews" class="pb-3 px-3.5 border-b-2 whitespace-nowrap flex items-center gap-1.5 <?= $activeTab === 'reviews' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="star" class="w-4 h-4"></i>
            <span><?= t('Reviews', 'রিভিউ') ?> (<?= count($reviews) ?>)</span>
        </a>
        <a href="/admin/dashboard?tab=settings" class="pb-3 px-3.5 border-b-2 whitespace-nowrap flex items-center gap-1.5 <?= $activeTab === 'settings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="settings" class="w-4 h-4"></i>
            <span><?= t('Settings', 'সেটিংস') ?></span>
        </a>
        <a href="/admin/dashboard?tab=logs" class="pb-3 px-3.5 border-b-2 whitespace-nowrap flex items-center gap-1.5 <?= $activeTab === 'logs' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900' ?>">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            <span><?= t('Audit Logs', 'লগ্স') ?></span>
        </a>
    </div>

    <!-- 1. Doctors Tab -->
    <?php if ($activeTab === 'doctors' || $activeTab === 'overview'): ?>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <h2 class="font-bold text-slate-900 text-sm"><?= t('Registered Doctors & BMDC Verification', 'সকল নিবন্ধিত ডাক্তার ও বিএমডিসি ভেরিফিকেশন') ?></h2>
                <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <a href="/admin/dashboard?tab=doctors&status=all" class="px-2.5 py-1 rounded-lg font-semibold <?= $statusFilter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600' ?>">All</a>
                    <a href="/admin/dashboard?tab=doctors&status=pending" class="px-2.5 py-1 rounded-lg font-semibold <?= $statusFilter === 'pending' ? 'bg-white shadow-xs text-amber-700' : 'text-slate-600' ?>">Pending</a>
                    <a href="/admin/dashboard?tab=doctors&status=approved" class="px-2.5 py-1 rounded-lg font-semibold <?= $statusFilter === 'approved' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-600' ?>">Approved</a>
                    <a href="/admin/dashboard?tab=doctors&status=rejected" class="px-2.5 py-1 rounded-lg font-semibold <?= $statusFilter === 'rejected' ? 'bg-white shadow-xs text-rose-700' : 'text-slate-600' ?>">Rejected</a>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th class="py-3 px-4">Doctor</th>
                            <th class="py-3 px-4">BMDC #</th>
                            <th class="py-3 px-4">Specialty</th>
                            <th class="py-3 px-4">Contact</th>
                            <th class="py-3 px-4">Chambers</th>
                            <th class="py-3 px-4">Status</th>
                            <th class="py-3 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($doctors)): ?>
                            <tr><td colspan="7" class="py-8 text-center text-slate-400">No doctors found.</td></tr>
                        <?php else: ?>
                            <?php foreach ($doctors as $d): ?>
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td class="py-3 px-4">
                                        <strong class="text-slate-900 block"><?= e($d['title'] . ' ' . $d['name']) ?></strong>
                                        <span class="text-slate-400 text-[11px]"><?= (int)$d['experience_years'] ?> yrs exp</span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <span class="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                            <?= e($d['bmdc_number']) ?>
                                        </span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <span class="font-semibold text-emerald-600 block"><?= e($d['specialty_name']) ?></span>
                                        <span class="text-slate-400 text-[11px] truncate block max-w-xs"><?= e($d['qualification']) ?></span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="text-slate-700"><?= e($d['phone']) ?></div>
                                        <div class="text-slate-400 text-[11px]"><?= e($d['email']) ?></div>
                                    </td>
                                    <td class="py-3 px-4 text-slate-600 font-medium"><?= (int)$d['chamber_count'] ?> chambers</td>
                                    <td class="py-3 px-4">
                                        <?php if ($d['approval_status'] === 'approved'): ?>
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>
                                        <?php elseif ($d['approval_status'] === 'rejected'): ?>
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-rose-50 text-rose-700 border border-rose-200" title="<?= e($d['rejection_reason'] ?? '') ?>">Rejected</span>
                                        <?php else: ?>
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <div class="inline-flex items-center gap-1.5">
                                            <?php if ($d['approval_status'] === 'pending'): ?>
                                                <form action="/admin/doctor/<?= $d['id'] ?>/approve" method="POST" class="inline">
                                                    <?= csrf_field() ?>
                                                    <button type="submit" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer">
                                                        Approve
                                                    </button>
                                                </form>
                                                <button type="button" onclick="document.getElementById('rejectDialog<?= $d['id'] ?>').showModal()" class="px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer">
                                                    Reject
                                                </button>
                                            <?php else: ?>
                                                <form action="/admin/doctor/<?= $d['id'] ?>/toggle-status" method="POST" class="inline">
                                                    <?= csrf_field() ?>
                                                    <button type="submit" class="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                                                        <?= ($d['user_status'] ?? 'active') === 'active' ? 'Suspend' : 'Activate' ?>
                                                    </button>
                                                </form>
                                                <a href="/doctor/<?= $d['id'] ?>" target="_blank" class="p-1 rounded-lg text-slate-400 hover:text-emerald-600 transition">
                                                    <i data-lucide="external-link" class="w-4 h-4"></i>
                                                </a>
                                            <?php endif; ?>
                                        </div>

                                        <!-- Rejection Dialog -->
                                        <dialog id="rejectDialog<?= $d['id'] ?>" class="p-0 rounded-2xl border border-slate-200 shadow-2xl backdrop:bg-slate-900/40 max-w-md w-full text-left">
                                            <div class="p-6 space-y-4">
                                                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                                    <h3 class="font-bold text-slate-900 text-sm">Reject Doctor Application</h3>
                                                    <button type="button" onclick="document.getElementById('rejectDialog<?= $d['id'] ?>').close()" class="text-slate-400 hover:text-slate-700">
                                                        <i data-lucide="x" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                                <form action="/admin/doctor/<?= $d['id'] ?>/reject" method="POST" class="space-y-3">
                                                    <?= csrf_field() ?>
                                                    <p class="text-xs text-slate-500">Doctor: <strong><?= e($d['name']) ?></strong> (BMDC: <?= e($d['bmdc_number']) ?>)</p>
                                                    <div>
                                                        <label class="block font-semibold text-slate-700 mb-1">Reason for Rejection *</label>
                                                        <textarea name="rejection_reason" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" rows="3" required placeholder="BMDC certificate invalid or unverified credentials..."></textarea>
                                                    </div>
                                                    <div class="flex justify-end gap-2 pt-2">
                                                        <button type="button" onclick="document.getElementById('rejectDialog<?= $d['id'] ?>').close()" class="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                                                        <button type="submit" class="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold">Confirm Reject</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </dialog>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    <!-- 2. Patients Tab -->
    <?php elseif ($activeTab === 'patients'): ?>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <h2 class="font-bold text-slate-900 text-sm"><?= t('Registered Patient Accounts', 'নিবন্ধিত রোগীদের তালিকা') ?></h2>
                <form action="/admin/dashboard" method="GET" class="flex gap-2">
                    <input type="hidden" name="tab" value="patients">
                    <input type="text" name="patient_search" class="px-3 py-1.5 rounded-xl border border-slate-200 outline-none" placeholder="Name or phone..." value="<?= e($_GET['patient_search'] ?? '') ?>">
                    <button type="submit" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">Search</button>
                </form>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th class="py-3 px-4">#</th>
                            <th class="py-3 px-4">Patient Name</th>
                            <th class="py-3 px-4">Contact</th>
                            <th class="py-3 px-4">Registered Date</th>
                            <th class="py-3 px-4">Total Serials</th>
                            <th class="py-3 px-4">Status</th>
                            <th class="py-3 px-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($patients)): ?>
                            <tr><td colspan="7" class="py-8 text-center text-slate-400">No patients found.</td></tr>
                        <?php else: ?>
                            <?php foreach ($patients as $idx => $p): ?>
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td class="py-3 px-4 text-slate-400"><?= $idx + 1 ?></td>
                                    <td class="py-3 px-4 font-bold text-slate-900"><?= e($p['name']) ?></td>
                                    <td class="py-3 px-4">
                                        <div class="text-slate-700"><?= e($p['phone']) ?></div>
                                        <div class="text-slate-400 text-[11px]"><?= e($p['email']) ?></div>
                                    </td>
                                    <td class="py-3 px-4 text-slate-500"><?= date('d M, Y', strtotime($p['created_at'])) ?></td>
                                    <td class="py-3 px-4 font-semibold text-emerald-600"><?= (int)($p['booking_count'] ?? 0) ?> bookings</td>
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[10px] <?= $p['status'] === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200' ?>">
                                            <?= ucfirst(e($p['status'])) ?>
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <form action="/admin/patient/<?= $p['id'] ?>/toggle-status" method="POST" class="inline">
                                            <?= csrf_field() ?>
                                            <button type="submit" class="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition cursor-pointer">
                                                <?= $p['status'] === 'active' ? 'Suspend' : 'Activate' ?>
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

    <!-- 3. Global Appointments Tab -->
    <?php elseif ($activeTab === 'appointments'): ?>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-4 border-b border-slate-100">
                <form action="/admin/dashboard" method="GET" class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs">
                    <input type="hidden" name="tab" value="appointments">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Date</label>
                        <input type="date" name="appt_date" class="w-full px-3 py-1.5 rounded-xl border border-slate-200 outline-none" value="<?= e($_GET['appt_date'] ?? '') ?>">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Status</label>
                        <select name="appt_status" class="w-full px-3 py-1.5 rounded-xl border border-slate-200 outline-none bg-white">
                            <option value="">All Statuses</option>
                            <option value="confirmed" <?= ($_GET['appt_status'] ?? '') === 'confirmed' ? 'selected' : '' ?>>Confirmed</option>
                            <option value="waiting" <?= ($_GET['appt_status'] ?? '') === 'waiting' ? 'selected' : '' ?>>Waiting</option>
                            <option value="in_consultation" <?= ($_GET['appt_status'] ?? '') === 'in_consultation' ? 'selected' : '' ?>>In Consultation</option>
                            <option value="completed" <?= ($_GET['appt_status'] ?? '') === 'completed' ? 'selected' : '' ?>>Completed</option>
                            <option value="cancelled" <?= ($_GET['appt_status'] ?? '') === 'cancelled' ? 'selected' : '' ?>>Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Search Patient or Doctor</label>
                        <input type="text" name="appt_search" class="w-full px-3 py-1.5 rounded-xl border border-slate-200 outline-none" placeholder="Name or phone..." value="<?= e($_GET['appt_search'] ?? '') ?>">
                    </div>
                    <div>
                        <button type="submit" class="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">Apply Filter</button>
                    </div>
                </form>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th class="py-3 px-4">Serial</th>
                            <th class="py-3 px-4">Patient</th>
                            <th class="py-3 px-4">Doctor</th>
                            <th class="py-3 px-4">Chamber</th>
                            <th class="py-3 px-4">Date & Time</th>
                            <th class="py-3 px-4">Fee</th>
                            <th class="py-3 px-4">Status</th>
                            <th class="py-3 px-4 text-right">Slip</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($appointments)): ?>
                            <tr><td colspan="8" class="py-8 text-center text-slate-400">No appointments found.</td></tr>
                        <?php else: ?>
                            <?php foreach ($appointments as $a): ?>
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200">
                                            #<?= $a['serial_number'] ?>
                                        </span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <strong class="text-slate-900 block"><?= e($a['patient_name']) ?></strong>
                                        <span class="text-slate-400 text-[11px]"><?= e($a['patient_phone']) ?></span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="font-semibold text-slate-900"><?= e($a['doctor_title'] . ' ' . $a['doctor_name']) ?></div>
                                        <span class="text-emerald-600 text-[11px]"><?= e($a['specialty_name']) ?></span>
                                    </td>
                                    <td class="py-3 px-4 text-slate-600"><?= e($a['chamber_name']) ?></td>
                                    <td class="py-3 px-4 text-slate-600">
                                        <div><?= e($a['schedule_date']) ?></div>
                                        <span class="text-slate-400 text-[11px]"><?= e($a['appointment_time']) ?></span>
                                    </td>
                                    <td class="py-3 px-4 font-bold text-emerald-600">৳<?= number_format((float)$a['fee']) ?></td>
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                            <?= e($a['status']) ?>
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <a href="/appointment/<?= $a['id'] ?>" target="_blank" class="p-1 rounded-lg text-slate-400 hover:text-emerald-600 transition">
                                            <i data-lucide="receipt" class="w-4 h-4"></i>
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    <!-- 4. Specialties Tab -->
    <?php elseif ($activeTab === 'specialties'): ?>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-fit space-y-3">
                <h3 class="font-bold text-slate-900 text-sm"><?= t('Add New Specialty', 'নতুন স্পেশালিটি যোগ করুন') ?></h3>
                <form action="/admin/specialty/create" method="POST" class="space-y-3 text-xs">
                    <?= csrf_field() ?>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">English Name *</label>
                        <input type="text" name="name" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" required placeholder="Cardiology, Medicine, etc.">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Bangla Name</label>
                        <input type="text" name="name_bn" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" placeholder="কার্ডিওলজি, মেডিসিন...">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Icon Key</label>
                        <input type="text" name="icon" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="heart-pulse">
                    </div>
                    <button type="submit" class="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition">Save Specialty</button>
                </form>
            </div>

            <div class="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                <th class="py-3 px-4">#</th>
                                <th class="py-3 px-4">English Name</th>
                                <th class="py-3 px-4">Bangla Name</th>
                                <th class="py-3 px-4">Doctors</th>
                                <th class="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php foreach ($specialties as $s): ?>
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td class="py-3 px-4 text-slate-400">#<?= $s['id'] ?></td>
                                    <td class="py-3 px-4 font-bold text-slate-900"><?= e($s['name']) ?></td>
                                    <td class="py-3 px-4 text-slate-700"><?= e($s['name_bn']) ?></td>
                                    <td class="py-3 px-4 font-semibold text-emerald-600"><?= (int)($s['doctor_count'] ?? 0) ?> doctors</td>
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    <!-- 5. Hospitals Tab -->
    <?php elseif ($activeTab === 'hospitals'): ?>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-fit space-y-3">
                <h3 class="font-bold text-slate-900 text-sm"><?= t('Add Hospital / Diagnostic', 'নতুন হাসপাতাল যোগ করুন') ?></h3>
                <form action="/admin/hospital/create" method="POST" class="space-y-3 text-xs">
                    <?= csrf_field() ?>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Hospital Name *</label>
                        <input type="text" name="name" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" required placeholder="Square Hospital / Labaid">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Full Address *</label>
                        <input type="text" name="address" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" required placeholder="18/F, Panthapath, Dhaka">
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">City</label>
                            <input type="text" name="city" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="Dhaka" required>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Area *</label>
                            <input type="text" name="area" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" placeholder="Dhanmondi" required>
                        </div>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Helpline Phone</label>
                        <input type="text" name="phone" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" placeholder="10616">
                    </div>
                    <button type="submit" class="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition">Save Hospital</button>
                </form>
            </div>

            <div class="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                <th class="py-3 px-4">Hospital Name</th>
                                <th class="py-3 px-4">Address & Area</th>
                                <th class="py-3 px-4">Helpline</th>
                                <th class="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php foreach ($hospitals as $h): ?>
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td class="py-3 px-4 font-bold text-slate-900"><?= e($h['name']) ?></td>
                                    <td class="py-3 px-4 text-slate-600"><?= e($h['area']) ?>, <?= e($h['city']) ?></td>
                                    <td class="py-3 px-4 text-slate-600"><?= e($h['phone']) ?></td>
                                    <td class="py-3 px-4 text-right">
                                        <form action="/admin/hospital/<?= $h['id'] ?>/delete" method="POST" onsubmit="return confirm('Delete hospital?');" class="inline">
                                            <?= csrf_field() ?>
                                            <button type="submit" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    <!-- 6. Reviews Tab -->
    <?php elseif ($activeTab === 'reviews'): ?>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-4 border-b border-slate-100">
                <h2 class="font-bold text-slate-900 text-sm"><?= t('Patient Reviews & Ratings Moderation', 'রোগীদের রিভিউ ও মডারেশন') ?></h2>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th class="py-3 px-4">Patient</th>
                            <th class="py-3 px-4">Doctor</th>
                            <th class="py-3 px-4">Rating</th>
                            <th class="py-3 px-4">Comment</th>
                            <th class="py-3 px-4">Status</th>
                            <th class="py-3 px-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($reviews)): ?>
                            <tr><td colspan="6" class="py-8 text-center text-slate-400">No reviews found.</td></tr>
                        <?php else: ?>
                            <?php foreach ($reviews as $rev): ?>
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td class="py-3 px-4 font-bold text-slate-900"><?= e($rev['patient_name']) ?></td>
                                    <td class="py-3 px-4 text-slate-700"><?= e($rev['doctor_title'] . ' ' . $rev['doctor_name']) ?></td>
                                    <td class="py-3 px-4 text-amber-500 font-bold"><?= str_repeat('★', (int)$rev['rating']) ?></td>
                                    <td class="py-3 px-4 text-slate-600 max-w-xs truncate"><?= e($rev['review_text']) ?></td>
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold <?= $rev['is_approved'] ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200' ?>">
                                            <?= $rev['is_approved'] ? 'Approved' : 'Pending' ?>
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <form action="/admin/review/<?= $rev['id'] ?>/toggle" method="POST" class="inline">
                                            <?= csrf_field() ?>
                                            <input type="hidden" name="is_approved" value="<?= $rev['is_approved'] ? '0' : '1' ?>">
                                            <button type="submit" class="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">
                                                <?= $rev['is_approved'] ? 'Hide' : 'Approve' ?>
                                            </button>
                                        </form>
                                        <form action="/admin/review/<?= $rev['id'] ?>/delete" method="POST" onsubmit="return confirm('Delete review?');" class="inline ml-1">
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

    <!-- 7. Settings Tab -->
    <?php elseif ($activeTab === 'settings'): ?>
        <div class="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <h2 class="font-bold text-slate-900 text-base border-b border-slate-100 pb-3"><?= t('Platform System Settings', 'সিস্টেম ও প্ল্যাটফর্ম সেটিংস') ?></h2>
            <form action="/admin/settings" method="POST" class="space-y-4 text-xs">
                <?= csrf_field() ?>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Website Title (English)</label>
                        <input type="text" name="site_title" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($settings['site_title'] ?? 'Daktar Serial') ?>" required>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Website Title (Bangla)</label>
                        <input type="text" name="site_title_bn" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($settings['site_title_bn'] ?? 'ডাক্তার সিরিয়াল') ?>" required>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Support Helpline Phone</label>
                        <input type="text" name="hotline_phone" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($settings['hotline_phone'] ?? '+880 1700-000000') ?>">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Support Email</label>
                        <input type="email" name="support_email" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($settings['support_email'] ?? 'support@daktarserial.com') ?>">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block font-semibold text-slate-700 mb-1">Emergency Notice Banner</label>
                        <input type="text" name="emergency_notice" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" value="<?= e($settings['emergency_notice'] ?? '') ?>" placeholder="e.g. Please wear masks before entering consultation chamber...">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block font-semibold text-slate-700 mb-1">Booking Rules & Guidelines</label>
                        <textarea name="booking_rules" class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" rows="3"><?= e($settings['booking_rules'] ?? '') ?></textarea>
                    </div>
                </div>
                <div class="pt-2 flex justify-end">
                    <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        <span>Save Platform Settings</span>
                    </button>
                </div>
            </form>
        </div>

    <!-- 8. Activity Logs Tab -->
    <?php elseif ($activeTab === 'logs'): ?>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-4 border-b border-slate-100">
                <h2 class="font-bold text-slate-900 text-sm"><?= t('Audit & Activity Logs', 'অডিট ও অ্যাক্টিভিটি লগ্স') ?></h2>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th class="py-3 px-4">Timestamp</th>
                            <th class="py-3 px-4">Action</th>
                            <th class="py-3 px-4">User</th>
                            <th class="py-3 px-4">Details</th>
                            <th class="py-3 px-4">IP Address</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php foreach ($recentLogs as $log): ?>
                            <tr class="hover:bg-slate-50/50 transition">
                                <td class="py-3 px-4 text-slate-400 font-mono text-[11px]"><?= e($log['created_at']) ?></td>
                                <td class="py-3 px-4">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                                        <?= e($log['action']) ?>
                                    </span>
                                </td>
                                <td class="py-3 px-4 font-semibold text-slate-900"><?= e($log['user_name'] ?: 'Guest') ?></td>
                                <td class="py-3 px-4 text-slate-600"><?= e($log['details']) ?></td>
                                <td class="py-3 px-4 text-slate-400 font-mono text-[11px]"><?= e($log['ip_address']) ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>
</div>
