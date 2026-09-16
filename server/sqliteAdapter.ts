import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

let sqliteDb: DatabaseSync | null = null;

export function getSqliteDb(): DatabaseSync {
  if (!sqliteDb) {
    const dbPath = path.join(process.cwd(), 'daktar_serial.sqlite');
    sqliteDb = new DatabaseSync(dbPath);

    // Register MySQL compatibility functions
    sqliteDb.function('CONCAT', (...args: any[]) => args.filter((x) => x !== null && x !== undefined).join(''));
    sqliteDb.function('NOW', () => new Date().toISOString().replace('T', ' ').substring(0, 19));
    sqliteDb.function('CURDATE', () => new Date().toISOString().substring(0, 10));
    sqliteDb.function('CURRENT_TIMESTAMP', () => new Date().toISOString().replace('T', ' ').substring(0, 19));
    sqliteDb.function('IF', (condition: any, trueVal: any, falseVal: any) => (condition ? trueVal : falseVal));
    sqliteDb.function('DAYNAME', (dateVal: string) => {
      try {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateVal).getDay()] || 'Sunday';
      } catch {
        return 'Sunday';
      }
    });
    sqliteDb.function('YEAR', (val: string) => (val ? new Date(val).getFullYear() : null));
    sqliteDb.function('MONTH', (val: string) => (val ? new Date(val).getMonth() + 1 : null));

    // Enable WAL mode for high performance concurrency
    try {
      sqliteDb.exec('PRAGMA journal_mode = WAL;');
      sqliteDb.exec('PRAGMA foreign_keys = ON;');
    } catch (e) {
      // ignore
    }

    initSqliteSchema(sqliteDb);
  }
  return sqliteDb;
}

function initSqliteSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient',
      status TEXT NOT NULL DEFAULT 'active',
      avatar_url TEXT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      name_bn TEXT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT NULL,
      description TEXT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      specialty_id INTEGER NULL,
      title TEXT NOT NULL DEFAULT 'Dr.',
      bmdc_number TEXT NOT NULL UNIQUE,
      qualification TEXT NOT NULL,
      experience_years INTEGER NOT NULL DEFAULT 0,
      bio TEXT NULL,
      consultation_fee NUMERIC NOT NULL DEFAULT 500.00,
      approval_status TEXT NOT NULL DEFAULT 'pending',
      rejection_reason TEXT NULL,
      approved_at TEXT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      blood_group TEXT NULL,
      date_of_birth TEXT NULL,
      gender TEXT NULL,
      address TEXT NULL,
      emergency_contact TEXT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chambers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      hospital_id INTEGER NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Dhaka',
      area TEXT NOT NULL,
      phone TEXT NULL,
      map_location TEXT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_chambers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      chamber_id INTEGER NOT NULL,
      consultation_fee NUMERIC NOT NULL DEFAULT 500.00,
      follow_up_fee NUMERIC NOT NULL DEFAULT 300.00,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(doctor_id, chamber_id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      chamber_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_serials INTEGER NOT NULL DEFAULT 20,
      slot_duration_minutes INTEGER NOT NULL DEFAULT 10,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS serials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      chamber_id INTEGER NOT NULL,
      schedule_date TEXT NOT NULL,
      serial_number INTEGER NOT NULL,
      estimated_time TEXT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(doctor_id, chamber_id, schedule_date, serial_number),
      FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id TEXT NOT NULL UNIQUE,
      patient_id INTEGER NULL,
      doctor_id INTEGER NOT NULL,
      chamber_id INTEGER NOT NULL,
      schedule_id INTEGER NOT NULL,
      schedule_date TEXT NOT NULL,
      serial_number INTEGER NOT NULL,
      appointment_time TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      patient_phone TEXT NOT NULL,
      patient_age INTEGER NOT NULL,
      patient_gender TEXT NOT NULL,
      problem_description TEXT NULL,
      doctor_notes TEXT NULL,
      fee NUMERIC NOT NULL DEFAULT 0.00,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(doctor_id, chamber_id, schedule_date, serial_number),
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
      FOREIGN KEY (chamber_id) REFERENCES chambers(id) ON DELETE RESTRICT,
      FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NULL,
      action TEXT NOT NULL,
      details TEXT NULL,
      ip_address TEXT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hospitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Dhaka',
      area TEXT NOT NULL,
      phone TEXT NULL,
      description TEXT NULL,
      image_url TEXT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default data if database is empty
  seedSqliteDatabase(db);
}

function seedSqliteDatabase(db: DatabaseSync) {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c > 0) return;

  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);

  // 1. Seed Specialties
  const specialties = [
    { id: 1, name: 'Medicine', name_bn: 'মেডিসিন', slug: 'medicine', icon: 'Pill', desc: 'Internal medicine and general adult healthcare' },
    { id: 2, name: 'Cardiology', name_bn: 'কার্ডিওলজি (হৃদরোগ)', slug: 'cardiology', icon: 'Heart', desc: 'Heart and cardiovascular system diseases' },
    { id: 3, name: 'Gynecology & Obstetrics', name_bn: 'স্ত্রী ও প্রসূতি রোগ', slug: 'gynecology', icon: 'Baby', desc: 'Women health, pregnancy and delivery care' },
    { id: 4, name: 'Pediatrics / Child Specialist', name_bn: 'শিশু বিশেষজ্ঞ', slug: 'pediatrics', icon: 'Smile', desc: 'Newborn, infant and child health' },
    { id: 5, name: 'Dermatology & Venereology', name_bn: 'চর্ম ও যৌন রোগ', slug: 'dermatology', icon: 'Sparkles', desc: 'Skin, hair, nails and aesthetic treatment' },
    { id: 6, name: 'Orthopedics', name_bn: 'অর্থোপেডিকস (হাড়-জোড়)', slug: 'orthopedics', icon: 'Activity', desc: 'Bone, joint, spine and trauma surgery' },
    { id: 7, name: 'ENT (Ear, Nose, Throat)', name_bn: 'নাক, কান ও গলা', slug: 'ent', icon: 'Volume2', desc: 'Ear, nose, throat and head-neck surgery' },
    { id: 8, name: 'Neurology', name_bn: 'নিউরোমেডিসিন', slug: 'neurology', icon: 'Brain', desc: 'Brain, spinal cord and nervous system diseases' },
  ];

  for (const s of specialties) {
    db.prepare(`
      INSERT OR IGNORE INTO specialties (id, name, name_bn, slug, icon, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(s.id, s.name, s.name_bn, s.slug, s.icon, s.desc);
  }

  // 2. Seed Admin User
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, status)
    VALUES (1, 'System Admin', 'admin@daktarserial.com', '+8801711000000', ?, 'admin', 'active')
  `).run(adminPasswordHash);

  // 3. Seed Patient User
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, status)
    VALUES (2, 'Rahim Uddin', 'patient@daktarserial.com', '+8801722000000', ?, 'patient', 'active')
  `).run(defaultPasswordHash);

  db.prepare(`
    INSERT OR IGNORE INTO patients (id, user_id, blood_group, date_of_birth, gender, address, emergency_contact)
    VALUES (1, 2, 'B+', '1992-05-14', 'male', 'Mirpur-10, Dhaka', '+8801811999999')
  `).run();

  // 4. Seed Doctors
  const doctorsData = [
    {
      userId: 3,
      doctorId: 1,
      name: 'Prof. Dr. Tanvir Ahmad',
      email: 'doctor@daktarserial.com',
      phone: '+8801733000001',
      title: 'Prof. Dr.',
      bmdc: 'BMDC-A-48920',
      specialtyId: 1,
      qualification: 'MBBS, FCPS (Medicine), MD (Cardiology)',
      experienceYears: 16,
      bio: 'Professor & Head of Department, Internal Medicine with extensive clinical experience in chronic disease management and cardiovascular wellness.',
      fee: 1000,
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256',
      chambers: [
        {
          id: 1,
          name: 'Ibn Sina Diagnostic & Consultation Center',
          address: 'House 48, Road 9/A, Dhanmondi',
          city: 'Dhaka',
          area: 'Dhanmondi',
          phone: '+8801713067888',
          fee: 1000,
          followFee: 600,
          schedules: [
            { day: 'Sunday', start: '17:00', end: '21:00', max: 20 },
            { day: 'Tuesday', start: '17:00', end: '21:00', max: 20 },
            { day: 'Thursday', start: '17:00', end: '21:00', max: 20 },
          ]
        },
        {
          id: 2,
          name: 'Popular Diagnostic Centre Ltd.',
          address: 'Unit 1, House 16, Road 2, Dhanmondi R/A',
          city: 'Dhaka',
          area: 'Dhanmondi',
          phone: '+8809613787801',
          fee: 1200,
          followFee: 700,
          schedules: [
            { day: 'Monday', start: '18:00', end: '21:30', max: 18 },
            { day: 'Wednesday', start: '18:00', end: '21:30', max: 18 },
            { day: 'Saturday', start: '18:00', end: '21:30', max: 18 },
          ]
        }
      ]
    },
    {
      userId: 4,
      doctorId: 2,
      name: 'Dr. Nusrat Jahan',
      email: 'dr.nusrat@daktarserial.com',
      phone: '+8801733000002',
      title: 'Dr.',
      bmdc: 'BMDC-A-56214',
      specialtyId: 3,
      qualification: 'MBBS, FCPS (Obs & Gynae), MS (Gynae)',
      experienceYears: 11,
      bio: 'Consultant Obstetrician & Gynecologist, specialized in high-risk pregnancy, normal delivery, and laparoscopic gynecological procedures.',
      fee: 800,
      avatar: 'https://images.unsplash.com/photo-1594824813570-589f81643c70?auto=format&fit=crop&q=80&w=256',
      chambers: [
        {
          id: 3,
          name: 'Square Hospital Consultation Suite',
          address: '18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath',
          city: 'Dhaka',
          area: 'Panthapath',
          phone: '10616',
          fee: 1000,
          followFee: 600,
          schedules: [
            { day: 'Sunday', start: '16:00', end: '19:30', max: 15 },
            { day: 'Monday', start: '16:00', end: '19:30', max: 15 },
            { day: 'Wednesday', start: '16:00', end: '19:30', max: 15 },
          ]
        }
      ]
    },
    {
      userId: 5,
      doctorId: 3,
      name: 'Dr. Rafiqul Islam',
      email: 'dr.rafiq@daktarserial.com',
      phone: '+8801733000003',
      title: 'Dr.',
      bmdc: 'BMDC-A-39182',
      specialtyId: 4,
      qualification: 'MBBS, DCH, MD (Pediatrics)',
      experienceYears: 14,
      bio: 'Senior Child Specialist with dedicated focus on infant nutrition, growth tracking, pediatric infectious diseases and childhood asthma.',
      fee: 700,
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=256',
      chambers: [
        {
          id: 4,
          name: 'Green Life Hospital Consultation Center',
          address: '32 Green Road, Dhanmondi',
          city: 'Dhaka',
          area: 'Green Road',
          phone: '+8801711200000',
          fee: 700,
          followFee: 400,
          schedules: [
            { day: 'Sunday', start: '17:30', end: '20:30', max: 20 },
            { day: 'Tuesday', start: '17:30', end: '20:30', max: 20 },
            { day: 'Friday', start: '09:30', end: '12:30', max: 20 },
          ]
        }
      ]
    }
  ];

  let schedAutoId = 1;
  for (const doc of doctorsData) {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, status, avatar_url)
      VALUES (?, ?, ?, ?, ?, 'doctor', 'active', ?)
    `).run(doc.userId, doc.name, doc.email, doc.phone, defaultPasswordHash, doc.avatar);

    db.prepare(`
      INSERT OR IGNORE INTO doctors (id, user_id, specialty_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status, approved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', datetime('now'))
    `).run(doc.doctorId, doc.userId, doc.specialtyId, doc.title, doc.bmdc, doc.qualification, doc.experienceYears, doc.bio, doc.fee);

    for (const cham of doc.chambers) {
      db.prepare(`
        INSERT OR IGNORE INTO chambers (id, doctor_id, name, address, city, area, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(cham.id, doc.doctorId, cham.name, cham.address, cham.city, cham.area, cham.phone);

      db.prepare(`
        INSERT OR IGNORE INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
        VALUES (?, ?, ?, ?)
      `).run(doc.doctorId, cham.id, cham.fee, cham.followFee);

      for (const sc of cham.schedules) {
        db.prepare(`
          INSERT OR IGNORE INTO doctor_schedules (id, doctor_id, chamber_id, day_of_week, start_time, end_time, max_serials, slot_duration_minutes, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 10, 1)
        `).run(schedAutoId++, doc.doctorId, cham.id, sc.day, sc.start, sc.end, sc.max);
      }
    }
  }

  // 5. Seed Hospitals
  const hospitals = [
    { id: 1, name: 'Ibn Sina Diagnostic & Consultation Center', address: 'House 48, Road 9/A, Dhanmondi', city: 'Dhaka', area: 'Dhanmondi', phone: '10615, 01713067888', desc: 'Leading modern private healthcare and diagnostic institution in Bangladesh' },
    { id: 2, name: 'Popular Diagnostic Centre Ltd.', address: 'House 16, Road 2, Dhanmondi R/A', city: 'Dhaka', area: 'Dhanmondi', phone: '09613787801', desc: 'Premier pathology and specialized doctors consultation center' },
    { id: 3, name: 'Square Hospitals Ltd.', address: '18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath', city: 'Dhaka', area: 'Panthapath', phone: '10616', desc: 'Tertiary care hospital with international standards of healthcare' },
    { id: 4, name: 'Evercare Hospital Dhaka', address: 'Plot 81, Block E, Bashundhara R/A', city: 'Dhaka', area: 'Bashundhara', phone: '10678', desc: 'Multi-disciplinary super-specialty tertiary care hospital' },
    { id: 5, name: 'LabAid Specialized Hospital', address: 'House 06, Road 04, Dhanmondi', city: 'Dhaka', area: 'Dhanmondi', phone: '10606', desc: 'Specialized cardiac and multi-disciplinary healthcare center' },
    { id: 6, name: 'Green Life Hospital Ltd.', address: '32 Green Road, Dhanmondi', city: 'Dhaka', area: 'Green Road', phone: '01711200000', desc: 'Renowned hospital offering complete medical services' }
  ];

  for (const h of hospitals) {
    db.prepare(`
      INSERT OR IGNORE INTO hospitals (id, name, address, city, area, phone, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(h.id, h.name, h.address, h.city, h.area, h.phone, h.desc);
  }

  // 6. Seed System Settings
  const settings = [
    ['site_title', 'Daktar Serial'],
    ['site_title_bn', 'ডাক্তার সিরিয়াল'],
    ['hotline_phone', '+880 1700-000000'],
    ['support_email', 'support@daktarserial.com'],
    ['emergency_notice', 'জরুরি ও সংকটজনক পরিস্থিতিতে অবিলম্বে নিকটস্থ জরুরি বিভাগে যোগাযোগ করুন।'],
    ['booking_rules', 'সিরিয়ালের আনুমানিক সময়ের কমপক্ষে ২০ মিনিট পূর্বে চেম্বারে উপস্থিত থাকুন।'],
    ['auto_approve_doctors', '0']
  ];

  for (const [k, v] of settings) {
    db.prepare(`
      INSERT OR IGNORE INTO settings (setting_key, setting_value)
      VALUES (?, ?)
    `).run(k, v);
  }

  console.log('[SQLite] Local database initialized with pre-seeded doctors, chambers, and schedules!');
}

/**
 * Clean & transform MySQL queries to SQLite compatible format
 */
export function transformMysqlToSqlite(sql: string): string {
  let transformed = sql;

  // 1. Remove MySQL FOR UPDATE lock clauses
  transformed = transformed.replace(/\s+FOR\s+UPDATE/gi, '');

  // 2. Replace INSERT IGNORE with INSERT OR IGNORE
  transformed = transformed.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT OR IGNORE INTO');

  // 3. Handle ON DUPLICATE KEY UPDATE
  // Users table email duplicate
  if (/INSERT\s+INTO\s+users/i.test(transformed) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, 'ON CONFLICT(email) DO UPDATE SET role = excluded.role, status = excluded.status');
  } else if (/INSERT\s+INTO\s+doctor_chambers/i.test(transformed) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, 'ON CONFLICT(doctor_id, chamber_id) DO UPDATE SET consultation_fee = excluded.consultation_fee, follow_up_fee = excluded.follow_up_fee');
  } else if (/INSERT\s+INTO\s+serials/i.test(transformed) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, 'ON CONFLICT(doctor_id, chamber_id, schedule_date, serial_number) DO UPDATE SET status = excluded.status');
  } else if (/INSERT\s+INTO\s+settings/i.test(transformed) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, 'ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value');
  } else if (/ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    // Fallback: replace with ON CONFLICT DO NOTHING
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, 'ON CONFLICT DO NOTHING');
  }

  return transformed;
}

/**
 * Drop-in MySQL pool replacement that runs against SQLite
 */
export class SqlitePoolWrapper {
  private db: DatabaseSync;

  constructor() {
    this.db = getSqliteDb();
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<[T[], any[]]> {
    const cleanSql = transformMysqlToSqlite(sql);
    const flatParams = (params || []).map((p) => (p === undefined ? null : p));

    try {
      const stmt = this.db.prepare(cleanSql);
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(cleanSql);

      if (isSelect) {
        const rows = stmt.all(...flatParams);
        return [rows as T[], []];
      } else {
        const res = stmt.run(...flatParams);
        const header = {
          insertId: Number(res.lastInsertRowid),
          affectedRows: res.changes,
          changedRows: res.changes,
        };
        return [header as unknown as T[], []];
      }
    } catch (err: any) {
      console.error(`[SQLite Error on Query]: ${err.message}\nSQL: ${cleanSql}\nParams:`, flatParams);
      throw err;
    }
  }

  async execute<T = any>(sql: string, params: any[] = []): Promise<[T, any[]]> {
    const cleanSql = transformMysqlToSqlite(sql);
    const flatParams = (params || []).map((p) => (p === undefined ? null : p));

    try {
      const stmt = this.db.prepare(cleanSql);
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(cleanSql);

      if (isSelect) {
        const rows = stmt.all(...flatParams);
        return [rows as unknown as T, []];
      } else {
        const res = stmt.run(...flatParams);
        const header = {
          insertId: Number(res.lastInsertRowid),
          affectedRows: res.changes,
          changedRows: res.changes,
        };
        return [header as unknown as T, []];
      }
    } catch (err: any) {
      console.error(`[SQLite Error on Execute]: ${err.message}\nSQL: ${cleanSql}\nParams:`, flatParams);
      throw err;
    }
  }

  async getConnection(): Promise<any> {
    const self = this;
    return {
      async beginTransaction() {
        try {
          self.db.exec('BEGIN TRANSACTION;');
        } catch {
          // already in transaction
        }
      },
      async commit() {
        try {
          self.db.exec('COMMIT;');
        } catch {
          // ignore
        }
      },
      async rollback() {
        try {
          self.db.exec('ROLLBACK;');
        } catch {
          // ignore
        }
      },
      release() {
        // no-op for embedded database
      },
      async query<T = any>(sql: string, params: any[] = []) {
        return self.query<T>(sql, params);
      },
      async execute<T = any>(sql: string, params: any[] = []) {
        return self.execute<T>(sql, params);
      }
    };
  }
}
