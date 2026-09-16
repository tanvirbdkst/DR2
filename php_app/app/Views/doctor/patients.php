<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-xl font-bold text-slate-900"><?= t('My Patients & Visit History', 'আমার রোগী তালিকা ও ভিজিট হিস্ট্রি') ?></h1>
            <p class="text-xs text-slate-500 mt-0.5"><?= t('Patients who have visited or booked consultations in your chamber', 'আপনার চেম্বারে সাক্ষাৎ গ্রহণকারী রোগীদের তালিকা') ?></p>
        </div>
        <a href="/doctor/dashboard" class="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span><?= t('Back to Dashboard', 'ড্যাশবোর্ডে ফিরে যান') ?></span>
        </a>
    </div>

    <!-- Search Box -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <form action="/doctor/patients" method="GET" class="flex flex-col sm:flex-row gap-2">
            <div class="relative flex-1">
                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                <input type="text" name="search" class="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none text-xs" placeholder="<?= t('Search by patient name or mobile phone...', 'রোগীর নাম বা মোবাইল নম্বর দিয়ে খুঁজুন...') ?>" value="<?= e($search ?? '') ?>">
            </div>
            <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer">
                <?= t('Search', 'সার্চ করুন') ?>
            </button>
        </form>
    </div>

    <!-- Patient Records Table -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th class="py-3 px-4">#</th>
                        <th class="py-3 px-4"><?= t('Patient Name', 'রোগীর নাম') ?></th>
                        <th class="py-3 px-4"><?= t('Mobile Phone', 'মোবাইল নম্বর') ?></th>
                        <th class="py-3 px-4"><?= t('Gender / Blood', 'লিঙ্গ / রক্ত') ?></th>
                        <th class="py-3 px-4"><?= t('Last Visit', 'সর্বশেষ সাক্ষাৎ') ?></th>
                        <th class="py-3 px-4"><?= t('Total Visits', 'মোট ভিজিট') ?></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($patients)): ?>
                        <tr>
                            <td colspan="6" class="py-12 text-center text-slate-400">
                                <i data-lucide="users" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                                <?= t('No patient records found.', 'কোনো রোগী পাওয়া যায়নি।') ?>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($patients as $idx => $p): ?>
                            <tr class="hover:bg-slate-50/50 transition">
                                <td class="py-3 px-4 text-slate-400"><?= $idx + 1 ?></td>
                                <td class="py-3 px-4">
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                                            <?= strtoupper(substr($p['name'] ?: 'P', 0, 1)) ?>
                                        </div>
                                        <div>
                                            <strong class="text-slate-900 block font-bold"><?= e($p['name']) ?></strong>
                                            <span class="text-slate-400 text-[11px]"><?= e($p['email'] ?? '') ?></span>
                                        </div>
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-slate-700 font-mono"><?= e($p['phone']) ?></td>
                                <td class="py-3 px-4 text-slate-600">
                                    <span class="capitalize"><?= e($p['gender'] ?? 'N/A') ?></span>
                                    <?php if (!empty($p['blood_group'])): ?>
                                        <span class="ml-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200"><?= e($p['blood_group']) ?></span>
                                    <?php endif; ?>
                                </td>
                                <td class="py-3 px-4 text-slate-600 font-medium">
                                    <?= !empty($p['last_visit']) ? date('d M, Y', strtotime($p['last_visit'])) : '-' ?>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <?= (int)($p['visit_count'] ?? 1) ?> <?= t('visits', 'ভিজিট') ?>
                                    </span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
