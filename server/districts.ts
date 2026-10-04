export interface District {
  id: string;
  name: string;
  name_bn: string;
  division: string;
  division_bn: string;
  aliases?: string[];
}

export const BANGLADESH_DISTRICTS: District[] = [
  // --- Dhaka Division (13 districts) ---
  { id: 'dhaka', name: 'Dhaka', name_bn: 'ঢাকা', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'gazipur', name: 'Gazipur', name_bn: 'গাজীপুর', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'narayanganj', name: 'Narayanganj', name_bn: 'নারায়ণগঞ্জ', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'tangail', name: 'Tangail', name_bn: 'টাঙ্গাইল', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'narsingdi', name: 'Narsingdi', name_bn: 'নরসিংদী', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'faridpur', name: 'Faridpur', name_bn: 'ফরিদপুর', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'manikganj', name: 'Manikganj', name_bn: 'মানিকগঞ্জ', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'munshiganj', name: 'Munshiganj', name_bn: 'মুন্সীগঞ্জ', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'kishoreganj', name: 'Kishoreganj', name_bn: 'কিশোরগঞ্জ', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'gopalganj', name: 'Gopalganj', name_bn: 'গোপালগঞ্জ', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'madaripur', name: 'Madaripur', name_bn: 'মাদারীপুর', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'rajbari', name: 'Rajbari', name_bn: 'রাজবাড়ী', division: 'Dhaka', division_bn: 'ঢাকা' },
  { id: 'shariatpur', name: 'Shariatpur', name_bn: 'শরীয়তপুর', division: 'Dhaka', division_bn: 'ঢাকা' },

  // --- Chattogram Division (11 districts) ---
  { id: 'chattogram', name: 'Chattogram', name_bn: 'চট্টগ্রাম', division: 'Chattogram', division_bn: 'চট্টগ্রাম', aliases: ['Chittagong'] },
  { id: 'coxs-bazar', name: "Cox's Bazar", name_bn: 'কক্সবাজার', division: 'Chattogram', division_bn: 'চট্টগ্রাম', aliases: ['Coxs Bazar', 'Coxsbazar'] },
  { id: 'cumilla', name: 'Cumilla', name_bn: 'কুমিল্লা', division: 'Chattogram', division_bn: 'চট্টগ্রাম', aliases: ['Comilla'] },
  { id: 'brahmanbaria', name: 'Brahmanbaria', name_bn: 'ব্রাহ্মণবাড়িয়া', division: 'Chattogram', division_bn: 'চট্টগ্রাম' },
  { id: 'chandpur', name: 'Chandpur', name_bn: 'চাঁদপুর', division: 'Chattogram', division_bn: 'চট্টগ্রাম' },
  { id: 'feni', name: 'Feni', name_bn: 'ফেনী', division: 'Chattogram', division_bn: 'চট্টগ্রাম' },
  { id: 'noakhali', name: 'Noakhali', name_bn: 'নোয়াখালী', division: 'Chattogram', division_bn: 'চট্টগ্রাম' },
  { id: 'lakshmipur', name: 'Lakshmipur', name_bn: 'লক্ষ্মীপুর', division: 'Chattogram', division_bn: 'চট্টগ্রাম', aliases: ['Laxmipur'] },
  { id: 'khagrachhari', name: 'Khagrachhari', name_bn: 'খাগড়াছড়ি', division: 'Chattogram', division_bn: 'চট্টগ্রাম', aliases: ['Khagrachari'] },
  { id: 'rangamati', name: 'Rangamati', name_bn: 'রাঙ্গামাটি', division: 'Chattogram', division_bn: 'চট্টগ্রাম' },
  { id: 'bandarban', name: 'Bandarban', name_bn: 'বান্দরবান', division: 'Chattogram', division_bn: 'চট্টগ্রাম' },

  // --- Rajshahi Division (8 districts) ---
  { id: 'rajshahi', name: 'Rajshahi', name_bn: 'রাজশাহী', division: 'Rajshahi', division_bn: 'রাজশাহী' },
  { id: 'bogura', name: 'Bogura', name_bn: 'বগুড়া', division: 'Rajshahi', division_bn: 'রাজশাহী', aliases: ['Bogra'] },
  { id: 'pabna', name: 'Pabna', name_bn: 'পাবনা', division: 'Rajshahi', division_bn: 'রাজশাহী' },
  { id: 'sirajganj', name: 'Sirajganj', name_bn: 'সিরাজগঞ্জ', division: 'Rajshahi', division_bn: 'রাজশাহী' },
  { id: 'naogaon', name: 'Naogaon', name_bn: 'নওগাঁ', division: 'Rajshahi', division_bn: 'রাজশাহী' },
  { id: 'natore', name: 'Natore', name_bn: 'নাটোর', division: 'Rajshahi', division_bn: 'রাজশাহী' },
  { id: 'chapainawabganj', name: 'Chapainawabganj', name_bn: 'চাঁপাইনবাবগঞ্জ', division: 'Rajshahi', division_bn: 'রাজশাহী', aliases: ['Nawabganj'] },
  { id: 'joypurhat', name: 'Joypurhat', name_bn: 'জয়পুরহাট', division: 'Rajshahi', division_bn: 'রাজশাহী' },

  // --- Khulna Division (10 districts) ---
  { id: 'khulna', name: 'Khulna', name_bn: 'খুলনা', division: 'Khulna', division_bn: 'খুলনা' },
  { id: 'jashore', name: 'Jashore', name_bn: 'যশোর', division: 'Khulna', division_bn: 'খুলনা', aliases: ['Jessore'] },
  { id: 'kushtia', name: 'Kushtia', name_bn: 'কুষ্টিয়া', division: 'Khulna', division_bn: 'খুলনা' },
  { id: 'jhenaidah', name: 'Jhenaidah', name_bn: 'ঝিনাইদহ', division: 'Khulna', division_bn: 'খুলনা' },
  { id: 'satkhira', name: 'Satkhira', name_bn: 'সাতক্ষীরা', division: 'Khulna', division_bn: 'খুলনা' },
  { id: 'bagerhat', name: 'Bagerhat', name_bn: 'বাগেরহাট', division: 'Khulna', division_bn: 'খুলনা' },
  { id: 'chuadanga', name: 'Chuadanga', name_bn: 'চুয়াডাঙ্গা', division: 'Khulna', division_bn: 'খুলনা' },
  { id: 'magura', name: 'Magura', name_bn: 'মাগুরা', division: 'Khulna', division_bn: 'খুলনা' },
  { id: 'meherpur', name: 'Meherpur', name_bn: 'মেহেরপুর', division: 'Khulna', division_bn: 'খুলনা' },
  { id: 'narail', name: 'Narail', name_bn: 'নড়াইল', division: 'Khulna', division_bn: 'খুলনা' },

  // --- Barishal Division (6 districts) ---
  { id: 'barishal', name: 'Barishal', name_bn: 'বরিশাল', division: 'Barishal', division_bn: 'বরিশাল', aliases: ['Barisal'] },
  { id: 'patuakhali', name: 'Patuakhali', name_bn: 'পটুয়াখালী', division: 'Barishal', division_bn: 'বরিশাল' },
  { id: 'bhola', name: 'Bhola', name_bn: 'ভোলা', division: 'Barishal', division_bn: 'বরিশাল' },
  { id: 'pirojpur', name: 'Pirojpur', name_bn: 'পিরোজপুর', division: 'Barishal', division_bn: 'বরিশাল' },
  { id: 'barguna', name: 'Barguna', name_bn: 'বরগুনা', division: 'Barishal', division_bn: 'বরিশাল' },
  { id: 'jhalokathi', name: 'Jhalokathi', name_bn: 'ঝালকাঠি', division: 'Barishal', division_bn: 'বরিশাল', aliases: ['Jhalakati'] },

  // --- Sylhet Division (4 districts) ---
  { id: 'sylhet', name: 'Sylhet', name_bn: 'সিলেট', division: 'Sylhet', division_bn: 'সিলেট' },
  { id: 'moulvibazar', name: 'Moulvibazar', name_bn: 'মৌলভীবাজার', division: 'Sylhet', division_bn: 'সিলেট', aliases: ['Maulvibazar'] },
  { id: 'habiganj', name: 'Habiganj', name_bn: 'হবিগঞ্জ', division: 'Sylhet', division_bn: 'সিলেট' },
  { id: 'sunamganj', name: 'Sunamganj', name_bn: 'সুনামগঞ্জ', division: 'Sylhet', division_bn: 'সিলেট' },

  // --- Rangpur Division (8 districts) ---
  { id: 'rangpur', name: 'Rangpur', name_bn: 'রংপুর', division: 'Rangpur', division_bn: 'রংপুর' },
  { id: 'dinajpur', name: 'Dinajpur', name_bn: 'দিনাজপুর', division: 'Rangpur', division_bn: 'রংপুর' },
  { id: 'kurigram', name: 'Kurigram', name_bn: 'কুড়িগ্রাম', division: 'Rangpur', division_bn: 'রংপুর' },
  { id: 'gaibandha', name: 'Gaibandha', name_bn: 'গাইবান্ধা', division: 'Rangpur', division_bn: 'রংপুর' },
  { id: 'nilphamari', name: 'Nilphamari', name_bn: 'নীলফামারী', division: 'Rangpur', division_bn: 'রংপুর' },
  { id: 'lalmonirhat', name: 'Lalmonirhat', name_bn: 'লালমনিরহাট', division: 'Rangpur', division_bn: 'রংপুর' },
  { id: 'panchagarh', name: 'Panchagarh', name_bn: 'পঞ্চগড়', division: 'Rangpur', division_bn: 'রংপুর' },
  { id: 'thakurgaon', name: 'Thakurgaon', name_bn: 'ঠাকুরগাঁও', division: 'Rangpur', division_bn: 'রংপুর' },

  // --- Mymensingh Division (4 districts) ---
  { id: 'mymensingh', name: 'Mymensingh', name_bn: 'ময়মনসিংহ', division: 'Mymensingh', division_bn: 'ময়মনসিংহ' },
  { id: 'jamalpur', name: 'Jamalpur', name_bn: 'জামালপুর', division: 'Mymensingh', division_bn: 'ময়মনসিংহ' },
  { id: 'netrokona', name: 'Netrokona', name_bn: 'নেত্রকোনা', division: 'Mymensingh', division_bn: 'ময়মনসিংহ' },
  { id: 'sherpur', name: 'Sherpur', name_bn: 'শেরপুর', division: 'Mymensingh', division_bn: 'ময়মনসিংহ' },
];

export function findDistrict(term: string): District | undefined {
  if (!term) return undefined;
  const clean = term.trim().toLowerCase();
  return BANGLADESH_DISTRICTS.find(
    (d) =>
      d.id === clean ||
      d.name.toLowerCase() === clean ||
      d.name_bn === term.trim() ||
      (d.aliases && d.aliases.some((a) => a.toLowerCase() === clean))
  );
}

export function getDistrictSearchTerms(term: string): string[] {
  const district = findDistrict(term);
  if (!district) return [term.trim()];
  const terms = [district.name, district.name_bn, ...(district.aliases || [])];
  return Array.from(new Set(terms));
}

export async function ensureDistrictsTableInDb(dbPool: any): Promise<void> {
  try {
    // 1. First test if table already exists and has records
    try {
      const [testRows]: any = await dbPool.query('SELECT COUNT(*) as c FROM districts');
      const currentCount = Number(testRows?.[0]?.c ?? testRows?.[0]?.count ?? 0);
      if (currentCount >= 64) {
        return; // Table exists and is populated
      }
    } catch {
      // Table doesn't exist yet, proceed to create it
    }

    // 2. Try creating table with MySQL / MariaDB syntax
    let tableCreated = false;
    try {
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS districts (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          name_bn VARCHAR(100) NOT NULL,
          division VARCHAR(50) NOT NULL,
          division_bn VARCHAR(50) NOT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          sort_order INT NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      tableCreated = true;
    } catch (mysqlErr: any) {
      console.warn('[Districts] MySQL create table notice (trying portable syntax):', mysqlErr.message);
    }

    // 3. Fallback portable syntax (for SQLite or basic MySQL)
    if (!tableCreated) {
      try {
        await dbPool.query(`
          CREATE TABLE IF NOT EXISTS districts (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            name_bn VARCHAR(100) NOT NULL,
            division VARCHAR(50) NOT NULL,
            division_bn VARCHAR(50) NOT NULL,
            is_active INT NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } catch (portErr: any) {
        console.error('[Districts] Fatal: Could not create districts table:', portErr.message);
        throw portErr;
      }
    }

    // 4. Verify table now exists
    const [countRows]: any = await dbPool.query('SELECT COUNT(*) as c FROM districts');
    const count = Number(countRows?.[0]?.c ?? countRows?.[0]?.count ?? 0);

    // 5. Populate missing districts
    if (count < 64) {
      console.log(`[Districts] Initializing/syncing ${BANGLADESH_DISTRICTS.length} Bangladesh districts in database...`);
      for (let i = 0; i < BANGLADESH_DISTRICTS.length; i++) {
        const d = BANGLADESH_DISTRICTS[i];
        try {
          // Attempt MySQL INSERT ... ON DUPLICATE KEY UPDATE
          await dbPool.execute(
            `INSERT INTO districts (id, name, name_bn, division, division_bn, is_active, sort_order)
             VALUES (?, ?, ?, ?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), name_bn = VALUES(name_bn), division = VALUES(division), division_bn = VALUES(division_bn)`,
            [d.id, d.name, d.name_bn, d.division, d.division_bn, i + 1]
          );
        } catch {
          // Fallback for SQLite / generic DB: check if exists, otherwise insert
          try {
            const [existsRows]: any = await dbPool.query('SELECT id FROM districts WHERE id = ?', [d.id]);
            if (!existsRows || existsRows.length === 0) {
              await dbPool.execute(
                `INSERT INTO districts (id, name, name_bn, division, division_bn, is_active, sort_order)
                 VALUES (?, ?, ?, ?, ?, 1, ?)`,
                [d.id, d.name, d.name_bn, d.division, d.division_bn, i + 1]
              );
            }
          } catch (innerErr: any) {
            console.warn(`[Districts] Notice inserting district ${d.id}:`, innerErr.message);
          }
        }
      }
      console.log('[Districts] 64 Bangladesh districts populated successfully.');
    }
  } catch (err: any) {
    console.error('[Districts] ensureDistrictsTableInDb error:', err.message);
    throw err;
  }
}

