import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { BANGLADESH_DISTRICTS } from './districts.js';

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
    sqliteDb.function('RIGHT', (str: any, len: any) => {
      if (!str) return '';
      const s = String(str);
      const l = Number(len) || 0;
      return l <= 0 ? '' : s.slice(-l);
    });

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
      doctor_id INTEGER NULL,
      last_login_at TEXT NULL,
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

    CREATE TABLE IF NOT EXISTS doctor_specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      specialty_id INTEGER NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(doctor_id, specialty_id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS compounders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      doctor_id INTEGER NOT NULL,
      created_by INTEGER NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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
      patient_age INTEGER NULL,
      patient_gender TEXT NOT NULL,
      problem_description TEXT NULL,
      doctor_notes TEXT NULL,
      fee NUMERIC NOT NULL DEFAULT 0.00,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      booking_source TEXT NOT NULL DEFAULT 'online',
      created_by INTEGER NULL,
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

    CREATE TABLE IF NOT EXISTS districts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      division TEXT NOT NULL,
      division_bn TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default data if database is empty
  ensureSqliteColumns(db);
  seedSqliteDatabase(db);
}

/**
 * Adds columns introduced by later migrations to an already-existing SQLite file,
 * so upgrades do not require deleting the local database.
 */
function ensureSqliteColumns(db: DatabaseSync) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS districts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_bn TEXT NOT NULL,
        division TEXT NOT NULL,
        division_bn TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    const distCount = (db.prepare('SELECT COUNT(*) as c FROM districts').get() as { c: number })?.c || 0;
    if (distCount < BANGLADESH_DISTRICTS.length) {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO districts (id, name, name_bn, division, division_bn, is_active, sort_order)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `);
      BANGLADESH_DISTRICTS.forEach((d, idx) => {
        stmt.run(d.id, d.name, d.name_bn, d.division, d.division_bn, idx + 1);
      });
    }
  } catch {
    // ignore
  }
  const addColumnIfMissing = (table: string, column: string, definition: string) => {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      if (!cols.some((c) => c.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    } catch {
      // table may not exist yet
    }
  };

  addColumnIfMissing('users', 'doctor_id', 'INTEGER NULL');
  addColumnIfMissing('users', 'last_login_at', 'TEXT NULL');
  addColumnIfMissing('appointments', 'booking_source', "TEXT NOT NULL DEFAULT 'online'");
  addColumnIfMissing('appointments', 'created_by', 'INTEGER NULL');
  addColumnIfMissing('appointments', 'hospital_id', 'INTEGER NULL');
  addColumnIfMissing('appointments', 'external_booking_id', 'TEXT NULL');
  addColumnIfMissing('chambers', 'hospital_id', 'INTEGER NULL');

  // Hospitals table columns
  addColumnIfMissing('hospitals', 'hospital_code', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'contact_person', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'email', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('hospitals', 'website_url', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'status', "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing('hospitals', 'integration_status', "TEXT NOT NULL DEFAULT 'pending'");
  addColumnIfMissing('hospitals', 'api_status', "TEXT NOT NULL DEFAULT 'pending'");
  addColumnIfMissing('hospitals', 'webhook_url', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'webhook_secret', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'webhook_enabled', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing('hospitals', 'total_hospital_serials', 'INTEGER NOT NULL DEFAULT 100');
  addColumnIfMissing('hospitals', 'online_quota', 'INTEGER NOT NULL DEFAULT 20');
  addColumnIfMissing('hospitals', 'notes', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'last_sync_at', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'last_api_request_at', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'last_webhook_at', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'last_error_message', 'TEXT NULL');
  addColumnIfMissing('hospitals', 'successful_syncs_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('hospitals', 'failed_syncs_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('hospitals', 'updated_at', 'TEXT NULL');

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS hospital_api_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospital_id INTEGER NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        api_secret_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        last_used_at TEXT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS hospital_doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospital_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        chamber_id INTEGER NOT NULL,
        total_serials INTEGER NOT NULL DEFAULT 100,
        online_quota INTEGER NOT NULL DEFAULT 20,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(hospital_id, doctor_id, chamber_id)
      );

      CREATE TABLE IF NOT EXISTS hospital_external_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospital_id INTEGER NOT NULL,
        external_booking_id TEXT NOT NULL,
        appointment_id TEXT NOT NULL,
        idempotency_key TEXT NULL,
        doctor_id INTEGER NOT NULL,
        chamber_id INTEGER NOT NULL,
        schedule_date TEXT NOT NULL,
        serial_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'BOOKED',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(hospital_id, external_booking_id)
      );

      CREATE TABLE IF NOT EXISTS hospital_sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospital_id INTEGER NOT NULL,
        direction TEXT NOT NULL,
        event TEXT NOT NULL,
        doctor_id INTEGER NULL,
        chamber_id INTEGER NULL,
        schedule_date TEXT NULL,
        serial_number INTEGER NULL,
        booking_id TEXT NULL,
        external_booking_id TEXT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        http_status INTEGER NULL,
        request_payload TEXT NULL,
        response_payload TEXT NULL,
        error_message TEXT NULL,
        idempotency_key TEXT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        data TEXT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        read_at TEXT NULL
      );

      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        device_type TEXT NOT NULL DEFAULT 'web',
        user_agent TEXT NULL,
        last_used_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {
    // ignore
  }

  try {
    db.prepare(`
      UPDATE users
      SET name = 'Dr. Test Rahman', avatar_url = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800'
      WHERE id = 5;
    `).run();
    db.prepare(`
      UPDATE doctors
      SET bmdc_number = '3292'
      WHERE id = 3;
    `).run();
  } catch {
    // ignore
  }

  try {
    const allHosp = db.prepare('SELECT id, hospital_code FROM hospitals').all() as { id: number; hospital_code: string | null }[];
    for (const hosp of allHosp) {
      const code = hosp.hospital_code || `HOSP-${String(hosp.id).padStart(4, '0')}`;
      const email = `contact@hosp-${hosp.id}.example.com`;
      const webhookSecret = `whsec_${hosp.id}_${bcrypt.hashSync(code, 6).slice(-16).replace(/[^a-zA-Z0-9]/g, '')}`;

      db.prepare(`
        UPDATE hospitals
        SET hospital_code = COALESCE(hospital_code, ?),
            email = CASE WHEN email IS NULL OR email = '' THEN ? ELSE email END,
            status = 'active',
            api_status = 'active',
            webhook_enabled = 1,
            webhook_secret = COALESCE(webhook_secret, ?)
        WHERE id = ?
      `).run(code, email, webhookSecret, hosp.id);

      const credExists = db.prepare('SELECT id FROM hospital_api_credentials WHERE hospital_id = ?').get(hosp.id);
      if (!credExists) {
        const apiKey = `ds_live_${code.toLowerCase().replace(/[^a-z0-9]/g, '')}_${hosp.id}a9f4c`;
        const secretHash = bcrypt.hashSync('default_secret_' + hosp.id, 10);
        db.prepare(`
          INSERT INTO hospital_api_credentials (hospital_id, api_key, api_secret_hash, status)
          VALUES (?, ?, ?, 'active')
        `).run(hosp.id, apiKey, secretHash);
      }
    }
  } catch (err) {
    // ignore
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS doctor_specialties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        specialty_id INTEGER NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(doctor_id, specialty_id),
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE CASCADE
      );
      INSERT OR IGNORE INTO doctor_specialties (doctor_id, specialty_id, is_primary)
      SELECT id, specialty_id, 1 FROM doctors WHERE specialty_id IS NOT NULL;

      INSERT OR IGNORE INTO specialties (name, name_bn, slug, icon, description, status) VALUES
      ('Allergy & Immunology', 'অ্যালার্জি ও ইমিউনোলজি', 'allergy-immunology', 'Stethoscope', 'Allergic conditions and immune disorders', 'active'),
      ('Cardiology', 'হৃদরোগ', 'cardiology', 'Heart', 'Heart and cardiovascular diseases', 'active'),
      ('Clinical Nutrition', 'ক্লিনিক্যাল পুষ্টি', 'clinical-nutrition', 'Apple', 'Dietetics and clinical nutrition', 'active'),
      ('Dental Surgery', 'দন্ত সার্জারি', 'dental-surgery', 'Smile', 'Teeth and oral surgery', 'active'),
      ('Dermatology', 'চর্মরোগ', 'dermatology', 'Sparkles', 'Skin, hair, and nail treatments', 'active'),
      ('Diabetology', 'ডায়াবেটিস', 'diabetology', 'Activity', 'Diabetes care and hormone control', 'active'),
      ('Endocrinology', 'হরমোন রোগ', 'endocrinology', 'Stethoscope', 'Hormonal and thyroid diseases', 'active'),
      ('ENT', 'নাক কান গলা', 'ent', 'Volume2', 'Ear, nose, and throat treatments', 'active'),
      ('Gastroenterology', 'পরিপাকতন্ত্রের রোগ', 'gastroenterology', 'Activity', 'Digestive and liver health', 'active'),
      ('General Medicine', 'সাধারণ চিকিৎসা', 'general-medicine', 'Pill', 'General adult healthcare and internal medicine', 'active'),
      ('General Surgery', 'সাধারণ সার্জারি', 'general-surgery', 'Activity', 'General surgical procedures', 'active'),
      ('Hematology', 'রক্তরোগ', 'hematology', 'Droplets', 'Blood disorders and hematology care', 'active'),
      ('Gynecology & Obstetrics', 'স্ত্রী ও প্রসূতি রোগ', 'gynecology', 'Baby', 'Women health and maternity care', 'active'),
      ('Nephrology', 'কিডনি রোগ', 'nephrology', 'Activity', 'Kidney diseases and hypertension', 'active'),
      ('Neurology', 'নিউরোমেডিসিন', 'neurology', 'Brain', 'Brain and nervous system disorders', 'active'),
      ('Oncology', 'ক্যান্সার বিশেষজ্ঞ', 'oncology', 'Shield', 'Cancer treatments and oncology care', 'active'),
      ('Ophthalmology', 'চক্ষুরোগ', 'ophthalmology', 'Eye', 'Eye care and vision health', 'active'),
      ('Orthopedics', 'হাড়-জোড় ও অর্থোপেডিকস', 'orthopedics', 'Activity', 'Bone and joint surgery', 'active'),
      ('Pediatrics / Child Specialist', 'শিশু বিশেষজ্ঞ', 'pediatrics', 'Smile', 'Child and infant healthcare', 'active'),
      ('Psychiatry', 'মানসিক রোগ', 'psychiatry', 'Brain', 'Mental health and psychological care', 'active'),
      ('Pulmonology', 'বক্ষব্যাধি ও অ্যাজমা', 'pulmonology', 'Wind', 'Respiratory and lung health', 'active'),
      ('Urology', 'ইউরোলজি', 'urology', 'Activity', 'Urinary tract and urological care', 'active');
    `);
  } catch {
    // ignore
  }
}

function seedSqliteDatabase(db: DatabaseSync) {
  const adminPasswordHash = bcrypt.hashSync('Admin123!', 10);
  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

  // Ensure admin user always exists with valid credentials
  try {
    const adminUser = db.prepare("SELECT id FROM users WHERE email = 'admin@daktarserial.com'").get() as { id: number } | undefined;
    if (!adminUser) {
      db.prepare(`
        INSERT INTO users (name, email, phone, password_hash, role, status)
        VALUES ('System Admin', 'admin@daktarserial.com', '+8801711000000', ?, 'admin', 'active')
      `).run(adminPasswordHash);
    } else {
      db.prepare("UPDATE users SET password_hash = ?, role = 'admin', status = 'active' WHERE email = 'admin@daktarserial.com'").run(adminPasswordHash);
    }
  } catch (adminErr) {
    console.error('Error ensuring admin user in sqlite:', adminErr);
  }

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c > 1) return;

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
      name: 'Dr. Test Rahman',
      email: 'dr.test@daktarserial.com',
      phone: '+8801733000003',
      title: 'Dr.',
      bmdc: '3292',
      specialtyId: 4,
      qualification: 'MBBS, DCH, MD (Pediatrics)',
      experienceYears: 14,
      bio: 'Senior Child Specialist with dedicated focus on infant nutrition, growth tracking, pediatric infectious diseases and childhood asthma.',
      fee: 700,
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800',
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

  // 5. Seed a Compounder (Chamber Staff) bound to doctor 1 for demo/testing
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, status, doctor_id)
    VALUES (6, 'Karim Hossain', 'compounder@daktarserial.com', '+8801744000001', ?, 'compounder', 'active', 1)
  `).run(defaultPasswordHash);
  db.prepare(`
    INSERT OR IGNORE INTO compounders (id, user_id, doctor_id, created_by)
    VALUES (1, 6, 1, 1)
  `).run();

  // 6. Seed Hospitals
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

  // Ensure all seeded hospitals have codes, active status, and API credentials
  try {
    const allHosp = db.prepare('SELECT id, hospital_code FROM hospitals').all() as { id: number; hospital_code: string | null }[];
    for (const hosp of allHosp) {
      const code = hosp.hospital_code || `HOSP-${String(hosp.id).padStart(4, '0')}`;
      const email = `contact@hosp-${hosp.id}.example.com`;
      const webhookSecret = `whsec_${hosp.id}_${bcrypt.hashSync(code, 6).slice(-16).replace(/[^a-zA-Z0-9]/g, '')}`;

      db.prepare(`
        UPDATE hospitals
        SET hospital_code = COALESCE(hospital_code, ?),
            email = CASE WHEN email IS NULL OR email = '' THEN ? ELSE email END,
            status = 'active',
            api_status = 'active',
            webhook_enabled = 1,
            webhook_secret = COALESCE(webhook_secret, ?)
        WHERE id = ?
      `).run(code, email, webhookSecret, hosp.id);

      const credExists = db.prepare('SELECT id FROM hospital_api_credentials WHERE hospital_id = ?').get({ hospital_id: hosp.id });
      if (!credExists) {
        const apiKey = `ds_live_${code.toLowerCase().replace(/[^a-z0-9]/g, '')}_${hosp.id}a9f4c`;
        const secretHash = bcrypt.hashSync('default_secret_' + hosp.id, 10);
        db.prepare(`
          INSERT INTO hospital_api_credentials (hospital_id, api_key, api_secret_hash, status)
          VALUES (?, ?, ?, 'active')
        `).run(hosp.id, apiKey, secretHash);
      }
    }
  } catch (err) {
    // ignore
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

  // 4. Handle MySQL FIELD(col, 'v1', 'v2', ...) function for SQLite
  transformed = transformed.replace(/FIELD\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/gi, (match, col, listStr) => {
    const items = listStr.split(',').map((s: string) => s.trim());
    const cases = items.map((val: string, idx: number) => `WHEN ${val} THEN ${idx + 1}`).join(' ');
    return `CASE ${col.trim()} ${cases} ELSE ${items.length + 1} END`;
  });

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
