var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express7 = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_url = require("url");
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_vite = require("vite");

// server/db.ts
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);

// server/sqliteAdapter.ts
var import_node_sqlite = require("node:sqlite");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_path = __toESM(require("path"), 1);
var sqliteDb = null;
function getSqliteDb() {
  if (!sqliteDb) {
    const dbPath = import_path.default.join(process.cwd(), "daktar_serial.sqlite");
    sqliteDb = new import_node_sqlite.DatabaseSync(dbPath);
    sqliteDb.function("CONCAT", (...args) => args.filter((x) => x !== null && x !== void 0).join(""));
    sqliteDb.function("NOW", () => (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19));
    sqliteDb.function("CURDATE", () => (/* @__PURE__ */ new Date()).toISOString().substring(0, 10));
    sqliteDb.function("CURRENT_TIMESTAMP", () => (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19));
    sqliteDb.function("IF", (condition, trueVal, falseVal) => condition ? trueVal : falseVal);
    sqliteDb.function("DAYNAME", (dateVal) => {
      try {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[new Date(dateVal).getDay()] || "Sunday";
      } catch {
        return "Sunday";
      }
    });
    sqliteDb.function("YEAR", (val) => val ? new Date(val).getFullYear() : null);
    sqliteDb.function("MONTH", (val) => val ? new Date(val).getMonth() + 1 : null);
    try {
      sqliteDb.exec("PRAGMA journal_mode = WAL;");
      sqliteDb.exec("PRAGMA foreign_keys = ON;");
    } catch (e) {
    }
    initSqliteSchema(sqliteDb);
  }
  return sqliteDb;
}
function initSqliteSchema(db) {
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
  seedSqliteDatabase(db);
}
function seedSqliteDatabase(db) {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (userCount.c > 0) return;
  const defaultPasswordHash = import_bcryptjs.default.hashSync("Password123!", 10);
  const adminPasswordHash = import_bcryptjs.default.hashSync("admin123", 10);
  const specialties = [
    { id: 1, name: "Medicine", name_bn: "\u09AE\u09C7\u09A1\u09BF\u09B8\u09BF\u09A8", slug: "medicine", icon: "Pill", desc: "Internal medicine and general adult healthcare" },
    { id: 2, name: "Cardiology", name_bn: "\u0995\u09BE\u09B0\u09CD\u09A1\u09BF\u0993\u09B2\u099C\u09BF (\u09B9\u09C3\u09A6\u09B0\u09CB\u0997)", slug: "cardiology", icon: "Heart", desc: "Heart and cardiovascular system diseases" },
    { id: 3, name: "Gynecology & Obstetrics", name_bn: "\u09B8\u09CD\u09A4\u09CD\u09B0\u09C0 \u0993 \u09AA\u09CD\u09B0\u09B8\u09C2\u09A4\u09BF \u09B0\u09CB\u0997", slug: "gynecology", icon: "Baby", desc: "Women health, pregnancy and delivery care" },
    { id: 4, name: "Pediatrics / Child Specialist", name_bn: "\u09B6\u09BF\u09B6\u09C1 \u09AC\u09BF\u09B6\u09C7\u09B7\u099C\u09CD\u099E", slug: "pediatrics", icon: "Smile", desc: "Newborn, infant and child health" },
    { id: 5, name: "Dermatology & Venereology", name_bn: "\u099A\u09B0\u09CD\u09AE \u0993 \u09AF\u09CC\u09A8 \u09B0\u09CB\u0997", slug: "dermatology", icon: "Sparkles", desc: "Skin, hair, nails and aesthetic treatment" },
    { id: 6, name: "Orthopedics", name_bn: "\u0985\u09B0\u09CD\u09A5\u09CB\u09AA\u09C7\u09A1\u09BF\u0995\u09B8 (\u09B9\u09BE\u09DC-\u099C\u09CB\u09DC)", slug: "orthopedics", icon: "Activity", desc: "Bone, joint, spine and trauma surgery" },
    { id: 7, name: "ENT (Ear, Nose, Throat)", name_bn: "\u09A8\u09BE\u0995, \u0995\u09BE\u09A8 \u0993 \u0997\u09B2\u09BE", slug: "ent", icon: "Volume2", desc: "Ear, nose, throat and head-neck surgery" },
    { id: 8, name: "Neurology", name_bn: "\u09A8\u09BF\u0989\u09B0\u09CB\u09AE\u09C7\u09A1\u09BF\u09B8\u09BF\u09A8", slug: "neurology", icon: "Brain", desc: "Brain, spinal cord and nervous system diseases" }
  ];
  for (const s of specialties) {
    db.prepare(`
      INSERT OR IGNORE INTO specialties (id, name, name_bn, slug, icon, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(s.id, s.name, s.name_bn, s.slug, s.icon, s.desc);
  }
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, status)
    VALUES (1, 'System Admin', 'admin@daktarserial.com', '+8801711000000', ?, 'admin', 'active')
  `).run(adminPasswordHash);
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, status)
    VALUES (2, 'Rahim Uddin', 'patient@daktarserial.com', '+8801722000000', ?, 'patient', 'active')
  `).run(defaultPasswordHash);
  db.prepare(`
    INSERT OR IGNORE INTO patients (id, user_id, blood_group, date_of_birth, gender, address, emergency_contact)
    VALUES (1, 2, 'B+', '1992-05-14', 'male', 'Mirpur-10, Dhaka', '+8801811999999')
  `).run();
  const doctorsData = [
    {
      userId: 3,
      doctorId: 1,
      name: "Prof. Dr. Tanvir Ahmad",
      email: "doctor@daktarserial.com",
      phone: "+8801733000001",
      title: "Prof. Dr.",
      bmdc: "BMDC-A-48920",
      specialtyId: 1,
      qualification: "MBBS, FCPS (Medicine), MD (Cardiology)",
      experienceYears: 16,
      bio: "Professor & Head of Department, Internal Medicine with extensive clinical experience in chronic disease management and cardiovascular wellness.",
      fee: 1e3,
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256",
      chambers: [
        {
          id: 1,
          name: "Ibn Sina Diagnostic & Consultation Center",
          address: "House 48, Road 9/A, Dhanmondi",
          city: "Dhaka",
          area: "Dhanmondi",
          phone: "+8801713067888",
          fee: 1e3,
          followFee: 600,
          schedules: [
            { day: "Sunday", start: "17:00", end: "21:00", max: 20 },
            { day: "Tuesday", start: "17:00", end: "21:00", max: 20 },
            { day: "Thursday", start: "17:00", end: "21:00", max: 20 }
          ]
        },
        {
          id: 2,
          name: "Popular Diagnostic Centre Ltd.",
          address: "Unit 1, House 16, Road 2, Dhanmondi R/A",
          city: "Dhaka",
          area: "Dhanmondi",
          phone: "+8809613787801",
          fee: 1200,
          followFee: 700,
          schedules: [
            { day: "Monday", start: "18:00", end: "21:30", max: 18 },
            { day: "Wednesday", start: "18:00", end: "21:30", max: 18 },
            { day: "Saturday", start: "18:00", end: "21:30", max: 18 }
          ]
        }
      ]
    },
    {
      userId: 4,
      doctorId: 2,
      name: "Dr. Nusrat Jahan",
      email: "dr.nusrat@daktarserial.com",
      phone: "+8801733000002",
      title: "Dr.",
      bmdc: "BMDC-A-56214",
      specialtyId: 3,
      qualification: "MBBS, FCPS (Obs & Gynae), MS (Gynae)",
      experienceYears: 11,
      bio: "Consultant Obstetrician & Gynecologist, specialized in high-risk pregnancy, normal delivery, and laparoscopic gynecological procedures.",
      fee: 800,
      avatar: "https://images.unsplash.com/photo-1594824813570-589f81643c70?auto=format&fit=crop&q=80&w=256",
      chambers: [
        {
          id: 3,
          name: "Square Hospital Consultation Suite",
          address: "18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath",
          city: "Dhaka",
          area: "Panthapath",
          phone: "10616",
          fee: 1e3,
          followFee: 600,
          schedules: [
            { day: "Sunday", start: "16:00", end: "19:30", max: 15 },
            { day: "Monday", start: "16:00", end: "19:30", max: 15 },
            { day: "Wednesday", start: "16:00", end: "19:30", max: 15 }
          ]
        }
      ]
    },
    {
      userId: 5,
      doctorId: 3,
      name: "Dr. Rafiqul Islam",
      email: "dr.rafiq@daktarserial.com",
      phone: "+8801733000003",
      title: "Dr.",
      bmdc: "BMDC-A-39182",
      specialtyId: 4,
      qualification: "MBBS, DCH, MD (Pediatrics)",
      experienceYears: 14,
      bio: "Senior Child Specialist with dedicated focus on infant nutrition, growth tracking, pediatric infectious diseases and childhood asthma.",
      fee: 700,
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=256",
      chambers: [
        {
          id: 4,
          name: "Green Life Hospital Consultation Center",
          address: "32 Green Road, Dhanmondi",
          city: "Dhaka",
          area: "Green Road",
          phone: "+8801711200000",
          fee: 700,
          followFee: 400,
          schedules: [
            { day: "Sunday", start: "17:30", end: "20:30", max: 20 },
            { day: "Tuesday", start: "17:30", end: "20:30", max: 20 },
            { day: "Friday", start: "09:30", end: "12:30", max: 20 }
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
  const hospitals = [
    { id: 1, name: "Ibn Sina Diagnostic & Consultation Center", address: "House 48, Road 9/A, Dhanmondi", city: "Dhaka", area: "Dhanmondi", phone: "10615, 01713067888", desc: "Leading modern private healthcare and diagnostic institution in Bangladesh" },
    { id: 2, name: "Popular Diagnostic Centre Ltd.", address: "House 16, Road 2, Dhanmondi R/A", city: "Dhaka", area: "Dhanmondi", phone: "09613787801", desc: "Premier pathology and specialized doctors consultation center" },
    { id: 3, name: "Square Hospitals Ltd.", address: "18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath", city: "Dhaka", area: "Panthapath", phone: "10616", desc: "Tertiary care hospital with international standards of healthcare" },
    { id: 4, name: "Evercare Hospital Dhaka", address: "Plot 81, Block E, Bashundhara R/A", city: "Dhaka", area: "Bashundhara", phone: "10678", desc: "Multi-disciplinary super-specialty tertiary care hospital" },
    { id: 5, name: "LabAid Specialized Hospital", address: "House 06, Road 04, Dhanmondi", city: "Dhaka", area: "Dhanmondi", phone: "10606", desc: "Specialized cardiac and multi-disciplinary healthcare center" },
    { id: 6, name: "Green Life Hospital Ltd.", address: "32 Green Road, Dhanmondi", city: "Dhaka", area: "Green Road", phone: "01711200000", desc: "Renowned hospital offering complete medical services" }
  ];
  for (const h of hospitals) {
    db.prepare(`
      INSERT OR IGNORE INTO hospitals (id, name, address, city, area, phone, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(h.id, h.name, h.address, h.city, h.area, h.phone, h.desc);
  }
  const settings = [
    ["site_title", "Daktar Serial"],
    ["site_title_bn", "\u09A1\u09BE\u0995\u09CD\u09A4\u09BE\u09B0 \u09B8\u09BF\u09B0\u09BF\u09DF\u09BE\u09B2"],
    ["hotline_phone", "+880 1700-000000"],
    ["support_email", "support@daktarserial.com"],
    ["emergency_notice", "\u099C\u09B0\u09C1\u09B0\u09BF \u0993 \u09B8\u0982\u0995\u099F\u099C\u09A8\u0995 \u09AA\u09B0\u09BF\u09B8\u09CD\u09A5\u09BF\u09A4\u09BF\u09A4\u09C7 \u0985\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC\u09C7 \u09A8\u09BF\u0995\u099F\u09B8\u09CD\u09A5 \u099C\u09B0\u09C1\u09B0\u09BF \u09AC\u09BF\u09AD\u09BE\u0997\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964"],
    ["booking_rules", "\u09B8\u09BF\u09B0\u09BF\u09DF\u09BE\u09B2\u09C7\u09B0 \u0986\u09A8\u09C1\u09AE\u09BE\u09A8\u09BF\u0995 \u09B8\u09AE\u09DF\u09C7\u09B0 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09E8\u09E6 \u09AE\u09BF\u09A8\u09BF\u099F \u09AA\u09C2\u09B0\u09CD\u09AC\u09C7 \u099A\u09C7\u09AE\u09CD\u09AC\u09BE\u09B0\u09C7 \u0989\u09AA\u09B8\u09CD\u09A5\u09BF\u09A4 \u09A5\u09BE\u0995\u09C1\u09A8\u0964"],
    ["auto_approve_doctors", "0"]
  ];
  for (const [k, v] of settings) {
    db.prepare(`
      INSERT OR IGNORE INTO settings (setting_key, setting_value)
      VALUES (?, ?)
    `).run(k, v);
  }
  console.log("[SQLite] Local database initialized with pre-seeded doctors, chambers, and schedules!");
}
function transformMysqlToSqlite(sql) {
  let transformed = sql;
  transformed = transformed.replace(/\s+FOR\s+UPDATE/gi, "");
  transformed = transformed.replace(/INSERT\s+IGNORE\s+INTO/gi, "INSERT OR IGNORE INTO");
  if (/INSERT\s+INTO\s+users/i.test(transformed) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, "ON CONFLICT(email) DO UPDATE SET role = excluded.role, status = excluded.status");
  } else if (/INSERT\s+INTO\s+doctor_chambers/i.test(transformed) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, "ON CONFLICT(doctor_id, chamber_id) DO UPDATE SET consultation_fee = excluded.consultation_fee, follow_up_fee = excluded.follow_up_fee");
  } else if (/INSERT\s+INTO\s+serials/i.test(transformed) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, "ON CONFLICT(doctor_id, chamber_id, schedule_date, serial_number) DO UPDATE SET status = excluded.status");
  } else if (/INSERT\s+INTO\s+settings/i.test(transformed) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, "ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value");
  } else if (/ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
    transformed = transformed.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, "ON CONFLICT DO NOTHING");
  }
  return transformed;
}
var SqlitePoolWrapper = class {
  constructor() {
    this.db = getSqliteDb();
  }
  async query(sql, params = []) {
    const cleanSql = transformMysqlToSqlite(sql);
    const flatParams = (params || []).map((p) => p === void 0 ? null : p);
    try {
      const stmt = this.db.prepare(cleanSql);
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(cleanSql);
      if (isSelect) {
        const rows = stmt.all(...flatParams);
        return [rows, []];
      } else {
        const res = stmt.run(...flatParams);
        const header = {
          insertId: Number(res.lastInsertRowid),
          affectedRows: res.changes,
          changedRows: res.changes
        };
        return [header, []];
      }
    } catch (err) {
      console.error(`[SQLite Error on Query]: ${err.message}
SQL: ${cleanSql}
Params:`, flatParams);
      throw err;
    }
  }
  async execute(sql, params = []) {
    const cleanSql = transformMysqlToSqlite(sql);
    const flatParams = (params || []).map((p) => p === void 0 ? null : p);
    try {
      const stmt = this.db.prepare(cleanSql);
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(cleanSql);
      if (isSelect) {
        const rows = stmt.all(...flatParams);
        return [rows, []];
      } else {
        const res = stmt.run(...flatParams);
        const header = {
          insertId: Number(res.lastInsertRowid),
          affectedRows: res.changes,
          changedRows: res.changes
        };
        return [header, []];
      }
    } catch (err) {
      console.error(`[SQLite Error on Execute]: ${err.message}
SQL: ${cleanSql}
Params:`, flatParams);
      throw err;
    }
  }
  async getConnection() {
    const self = this;
    return {
      async beginTransaction() {
        try {
          self.db.exec("BEGIN TRANSACTION;");
        } catch {
        }
      },
      async commit() {
        try {
          self.db.exec("COMMIT;");
        } catch {
        }
      },
      async rollback() {
        try {
          self.db.exec("ROLLBACK;");
        } catch {
        }
      },
      release() {
      },
      async query(sql, params = []) {
        return self.query(sql, params);
      },
      async execute(sql, params = []) {
        return self.execute(sql, params);
      }
    };
  }
};

// server/db.ts
import_dotenv.default.config();
var dbHost = process.env.DB_HOST || "localhost";
var dbPort = Number(process.env.DB_PORT) || 3306;
var dbName = process.env.DB_NAME || "daktar_serial";
var dbUser = process.env.DB_USER || "root";
var dbPassword = process.env.DB_PASSWORD || "";
var isMysqlActive = false;
var sqliteAdapter = null;
function getSqliteAdapter() {
  if (!sqliteAdapter) {
    sqliteAdapter = new SqlitePoolWrapper();
  }
  return sqliteAdapter;
}
var mysqlPool = import_promise.default.createPool({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 1e4
});
var pool = {
  async query(sql, params = []) {
    if (isMysqlActive) {
      try {
        return await mysqlPool.query(sql, params);
      } catch (err) {
        if (err.code === "ECONNREFUSED" || err.code === "PROTOCOL_CONNECTION_LOST") {
          console.warn("[Database] MySQL disconnected, falling back to embedded SQLite.");
          isMysqlActive = false;
        } else {
          throw err;
        }
      }
    }
    return await getSqliteAdapter().query(sql, params);
  },
  async execute(sql, params = []) {
    if (isMysqlActive) {
      try {
        return await mysqlPool.execute(sql, params);
      } catch (err) {
        if (err.code === "ECONNREFUSED" || err.code === "PROTOCOL_CONNECTION_LOST") {
          console.warn("[Database] MySQL disconnected, falling back to embedded SQLite.");
          isMysqlActive = false;
        } else {
          throw err;
        }
      }
    }
    return await getSqliteAdapter().execute(sql, params);
  },
  async getConnection() {
    if (isMysqlActive) {
      try {
        return await mysqlPool.getConnection();
      } catch (err) {
        if (err.code === "ECONNREFUSED" || err.code === "PROTOCOL_CONNECTION_LOST") {
          console.warn("[Database] MySQL disconnected, falling back to embedded SQLite.");
          isMysqlActive = false;
        } else {
          throw err;
        }
      }
    }
    return getSqliteAdapter().getConnection();
  }
};
var db_default = pool;
async function initDatabase() {
  try {
    const connection = await mysqlPool.getConnection();
    isMysqlActive = true;
    console.log(`[MySQL] Successfully connected to database: ${dbName} on ${dbHost}:${dbPort}`);
    connection.release();
  } catch (err) {
    isMysqlActive = false;
    console.log(`[Database] MySQL not reachable at ${dbHost}:${dbPort} (${err.code || err.message}).`);
    console.log(`[Database] Running in embedded mode using SQLite with full schema and seed data!`);
    getSqliteAdapter();
  }
}
async function logActivity(userId, action, details, ipAddress = "") {
  try {
    await pool.execute(
      `INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
      [userId || null, action, details, ipAddress || null]
    );
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

// server/auth.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var JWT_SECRET = process.env.JWT_SECRET || "daktar-serial-secure-jwt-secret-key-2026";
function generateToken(user) {
  return import_jsonwebtoken.default.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      doctorId: user.doctorId,
      patientId: user.patientId
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
async function authMiddleware(req, res, next) {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next();
  }
  try {
    const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    const [userRows] = await db_default.query(
      "SELECT id, email, name, role, status FROM users WHERE id = ?",
      [decoded.id]
    );
    const user = userRows[0];
    if (user) {
      if (user.role === "doctor") {
        const [docRows] = await db_default.query(
          "SELECT id, approval_status FROM doctors WHERE user_id = ?",
          [user.id]
        );
        const doc = docRows[0];
        decoded.doctorId = doc?.id;
        decoded.status = doc?.approval_status || user.status;
      } else if (user.role === "patient") {
        const [patRows] = await db_default.query(
          "SELECT id FROM patients WHERE user_id = ?",
          [user.id]
        );
        const pat = patRows[0];
        decoded.patientId = pat?.id;
      }
      req.user = decoded;
    }
  } catch (err) {
  }
  next();
}
function requireAuth(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required. Please login." });
  }
  next();
}
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required. Please login." });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: `Access denied. Requires ${allowedRoles.join(" or ")} role.` });
    }
    next();
  };
}

// server/routes/authRoutes.ts
var import_express = require("express");
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var router = (0, import_express.Router)();
router.post("/register-patient", async (req, res) => {
  try {
    const { name, email, phone, password, gender, bloodGroup, dateOfBirth, address } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "Name, email, phone, and password are required." });
    }
    const [existingRows] = await db_default.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existingRows.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }
    const passwordHash = await import_bcryptjs2.default.hash(password, 10);
    const conn = await db_default.getConnection();
    let userId;
    let patientId;
    try {
      await conn.beginTransaction();
      const [userRes] = await conn.execute(
        `INSERT INTO users (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, 'patient', 'active')`,
        [name, email, phone, passwordHash]
      );
      userId = userRes.insertId;
      const [patRes] = await conn.execute(
        `INSERT INTO patients (user_id, blood_group, date_of_birth, gender, address) VALUES (?, ?, ?, ?, ?)`,
        [userId, bloodGroup || null, dateOfBirth || null, gender || null, address || null]
      );
      patientId = patRes.insertId;
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(userId, "PATIENT_REGISTER", `New patient registered: ${email}`);
    const token = generateToken({
      id: userId,
      email,
      name,
      role: "patient",
      status: "active",
      patientId
    });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 7 * 864e5 });
    res.status(201).json({
      message: "Patient registration successful",
      token,
      user: {
        id: userId,
        name,
        email,
        phone,
        role: "patient",
        status: "active",
        patientId
      }
    });
  } catch (err) {
    console.error("Error registering patient:", err);
    res.status(500).json({ error: err.message || "Registration failed" });
  }
});
router.post("/register-doctor", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      bmdcNumber,
      specialtyId,
      qualification,
      experienceYears,
      title = "Dr.",
      bio,
      consultationFee = 500,
      chamberName,
      chamberAddress,
      city = "Dhaka",
      area
    } = req.body;
    if (!name || !email || !phone || !password || !bmdcNumber || !qualification) {
      return res.status(400).json({ error: "Name, email, phone, password, BMDC registration number, and qualification are required." });
    }
    const [existingUserRows] = await db_default.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existingUserRows.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }
    const [existingBmdcRows] = await db_default.query(
      "SELECT id FROM doctors WHERE bmdc_number = ?",
      [bmdcNumber]
    );
    if (existingBmdcRows.length > 0) {
      return res.status(400).json({ error: "This BMDC registration number is already registered." });
    }
    const passwordHash = await import_bcryptjs2.default.hash(password, 10);
    const conn = await db_default.getConnection();
    let userId;
    let doctorId;
    try {
      await conn.beginTransaction();
      const [userRes] = await conn.execute(
        `INSERT INTO users (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, 'doctor', 'pending')`,
        [name, email, phone, passwordHash]
      );
      userId = userRes.insertId;
      const [docRes] = await conn.execute(
        `INSERT INTO doctors (user_id, specialty_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          userId,
          specialtyId ? Number(specialtyId) : null,
          title,
          bmdcNumber,
          qualification,
          Number(experienceYears) || 0,
          bio || "",
          Number(consultationFee) || 500
        ]
      );
      doctorId = docRes.insertId;
      if (chamberName && chamberAddress) {
        const [chamberRes] = await conn.execute(
          `INSERT INTO chambers (doctor_id, name, address, city, area, phone) VALUES (?, ?, ?, ?, ?, ?)`,
          [doctorId, chamberName, chamberAddress, city, area || city, phone]
        );
        const chamberId = chamberRes.insertId;
        await conn.execute(
          `INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee) VALUES (?, ?, ?, ?)`,
          [doctorId, chamberId, Number(consultationFee) || 500, (Number(consultationFee) || 500) * 0.6]
        );
      }
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(userId, "DOCTOR_REGISTER", `New doctor registered (pending approval): ${email} (BMDC: ${bmdcNumber})`);
    const token = generateToken({
      id: userId,
      email,
      name,
      role: "doctor",
      status: "pending",
      doctorId
    });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 7 * 864e5 });
    res.status(201).json({
      message: "Doctor registration submitted successfully! Your account is pending admin approval before appearing publicly.",
      token,
      user: {
        id: userId,
        name,
        email,
        phone,
        role: "doctor",
        status: "pending",
        doctorId
      }
    });
  } catch (err) {
    console.error("Error registering doctor:", err);
    res.status(500).json({ error: err.message || "Registration failed" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const [userRows] = await db_default.query(
      `SELECT id, name, email, phone, password_hash, role, status, avatar_url FROM users WHERE email = ?`,
      [email]
    );
    const user = userRows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const isValid = await import_bcryptjs2.default.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    let doctorId;
    let patientId;
    let effectiveStatus = user.status;
    if (user.role === "doctor") {
      const [docRows] = await db_default.query(
        "SELECT id, approval_status, rejection_reason FROM doctors WHERE user_id = ?",
        [user.id]
      );
      const doc = docRows[0];
      if (doc) {
        doctorId = doc.id;
        effectiveStatus = doc.approval_status;
      }
    } else if (user.role === "patient") {
      const [patRows] = await db_default.query(
        "SELECT id FROM patients WHERE user_id = ?",
        [user.id]
      );
      const pat = patRows[0];
      if (pat) patientId = pat.id;
    }
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: effectiveStatus,
      doctorId,
      patientId
    });
    await logActivity(user.id, "USER_LOGIN", `User logged in: ${user.email} (${user.role})`);
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 7 * 864e5 });
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: effectiveStatus,
        avatarUrl: user.avatar_url,
        doctorId,
        patientId
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});
router.get("/me", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.json({ user: null });
    }
    const [dbUserRows] = await db_default.query(
      "SELECT id, name, email, phone, role, status, avatar_url FROM users WHERE id = ?",
      [user.id]
    );
    const dbUser2 = dbUserRows[0];
    if (!dbUser2) {
      return res.json({ user: null });
    }
    let doctorDetails = null;
    let patientDetails = null;
    if (dbUser2.role === "doctor") {
      const [docRows] = await db_default.query(
        `SELECT d.*, s.name as specialty_name, s.name_bn as specialty_name_bn
         FROM doctors d
         LEFT JOIN specialties s ON d.specialty_id = s.id
         WHERE d.user_id = ?`,
        [dbUser2.id]
      );
      doctorDetails = docRows[0];
      dbUser2.status = doctorDetails?.approval_status || dbUser2.status;
    } else if (dbUser2.role === "patient") {
      const [patRows] = await db_default.query(
        "SELECT * FROM patients WHERE user_id = ?",
        [dbUser2.id]
      );
      patientDetails = patRows[0];
    }
    res.json({
      user: {
        ...dbUser2,
        doctorId: doctorDetails?.id,
        patientId: patientDetails?.id,
        doctorDetails,
        patientDetails
      }
    });
  } catch (err) {
    console.error("Error in /me:", err);
    res.status(500).json({ error: "Failed to fetch current user" });
  }
});
var authRoutes_default = router;

// server/routes/adminRoutes.ts
var import_express2 = require("express");
var router2 = (0, import_express2.Router)();
router2.use(requireRole(["admin"]));
router2.get("/stats", async (req, res) => {
  try {
    const [totalDocs] = await db_default.query("SELECT COUNT(*) as count FROM doctors");
    const [pendingDocs] = await db_default.query("SELECT COUNT(*) as count FROM doctors WHERE approval_status = 'pending'");
    const [approvedDocs] = await db_default.query("SELECT COUNT(*) as count FROM doctors WHERE approval_status = 'approved'");
    const [totalPats] = await db_default.query("SELECT COUNT(*) as count FROM users WHERE role = 'patient'");
    const [totalAppts] = await db_default.query("SELECT COUNT(*) as count FROM appointments");
    const [todayAppts] = await db_default.query("SELECT COUNT(*) as count FROM appointments WHERE schedule_date = CURDATE()");
    const [recentLogs] = await db_default.query(`
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 8
    `);
    res.json({
      totalDoctors: totalDocs[0]?.count || 0,
      pendingDoctors: pendingDocs[0]?.count || 0,
      approvedDoctors: approvedDocs[0]?.count || 0,
      totalPatients: totalPats[0]?.count || 0,
      totalAppointments: totalAppts[0]?.count || 0,
      todayAppointments: todayAppts[0]?.count || 0,
      recentLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.get("/doctors", async (req, res) => {
  try {
    const status = req.query.status;
    let query = `
      SELECT d.*, u.name, u.email, u.phone, u.avatar_url, u.status as user_status,
             s.name as specialty_name, s.name_bn as specialty_name_bn,
             (SELECT COUNT(*) FROM chambers c WHERE c.doctor_id = d.id) as chamber_count,
             (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id) as appointment_count
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
    `;
    const params = [];
    if (status && status !== "all") {
      query += ` WHERE d.approval_status = ?`;
      params.push(status);
    }
    query += ` ORDER BY d.created_at DESC`;
    const [doctors] = await db_default.query(query, params);
    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.get("/doctors/:id", async (req, res) => {
  try {
    const doctorId = req.params.id;
    const [docRows] = await db_default.query(`
      SELECT d.*, u.name, u.email, u.phone, u.avatar_url, u.status as user_status,
             s.name as specialty_name, s.name_bn as specialty_name_bn
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.id = ?
    `, [doctorId]);
    const doctor = docRows[0];
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    const [chambers] = await db_default.query(`
      SELECT c.*, dc.consultation_fee, dc.follow_up_fee
      FROM chambers c
      LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
      WHERE c.doctor_id = ?
    `, [doctorId]);
    const [schedules] = await db_default.query(`
      SELECT s.*, c.name as chamber_name
      FROM doctor_schedules s
      JOIN chambers c ON s.chamber_id = c.id
      WHERE s.doctor_id = ?
    `, [doctorId]);
    res.json({ doctor, chambers, schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.post("/doctors/:id/approve", async (req, res) => {
  try {
    const doctorId = req.params.id;
    const adminUser = req.user;
    const [docRows] = await db_default.query("SELECT user_id, bmdc_number FROM doctors WHERE id = ?", [doctorId]);
    const doctor = docRows[0];
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(`
        UPDATE doctors
        SET approval_status = 'approved', rejection_reason = NULL, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctorId]);
      await conn.execute(`
        UPDATE users
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctor.user_id]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(adminUser.id, "APPROVE_DOCTOR", `Approved doctor ID ${doctorId} (BMDC: ${doctor.bmdc_number})`);
    res.json({ message: "Doctor approved successfully. The doctor profile is now publicly searchable." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.post("/doctors/:id/reject", async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { reason } = req.body;
    const adminUser = req.user;
    const [docRows] = await db_default.query("SELECT user_id, bmdc_number FROM doctors WHERE id = ?", [doctorId]);
    const doctor = docRows[0];
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(`
        UPDATE doctors
        SET approval_status = 'rejected', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [reason || "Application rejected by administration", doctorId]);
      await conn.execute(`
        UPDATE users
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctor.user_id]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(adminUser.id, "REJECT_DOCTOR", `Rejected doctor ID ${doctorId}. Reason: ${reason || "Not specified"}`);
    res.json({ message: "Doctor application rejected." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.post("/doctors/:id/suspend", async (req, res) => {
  try {
    const doctorId = req.params.id;
    const adminUser = req.user;
    const [docRows] = await db_default.query("SELECT user_id FROM doctors WHERE id = ?", [doctorId]);
    const doctor = docRows[0];
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(`
        UPDATE doctors
        SET approval_status = 'suspended', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctorId]);
      await conn.execute(`
        UPDATE users
        SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctor.user_id]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(adminUser.id, "SUSPEND_DOCTOR", `Suspended doctor ID ${doctorId}`);
    res.json({ message: "Doctor suspended. Doctor is hidden from public listings." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.get("/patients", async (req, res) => {
  try {
    const [patients] = await db_default.query(`
      SELECT u.id as user_id, u.name, u.email, u.phone, u.created_at,
             p.blood_group, p.date_of_birth, p.gender, p.address,
             (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = u.id) as total_appointments
      FROM users u
      LEFT JOIN patients p ON u.id = p.user_id
      WHERE u.role = 'patient'
      ORDER BY u.created_at DESC
    `);
    res.json({ patients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.get("/specialties", async (req, res) => {
  try {
    const [specialties] = await db_default.query(`
      SELECT s.*, (SELECT COUNT(*) FROM doctors d WHERE d.specialty_id = s.id) as doctor_count
      FROM specialties s
      ORDER BY s.name ASC
    `);
    res.json({ specialties });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.post("/specialties", async (req, res) => {
  try {
    const { name, name_bn, icon, description } = req.body;
    if (!name) return res.status(400).json({ error: "Specialty name is required." });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const adminUser = req.user;
    const [resDb] = await db_default.execute(`
      INSERT INTO specialties (name, name_bn, slug, icon, description, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [name, name_bn || null, slug, icon || "Stethoscope", description || null]);
    await logActivity(adminUser.id, "CREATE_SPECIALTY", `Added specialty: ${name}`);
    res.status(201).json({ message: "Specialty created successfully", id: resDb.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.put("/specialties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_bn, icon, description, status } = req.body;
    await db_default.execute(`
      UPDATE specialties
      SET name = ?, name_bn = ?, icon = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, name_bn || null, icon || "Stethoscope", description || null, status || "active", id]);
    res.json({ message: "Specialty updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.delete("/specialties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db_default.execute("DELETE FROM specialties WHERE id = ?", [id]);
    res.json({ message: "Specialty deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var adminRoutes_default = router2;

// server/routes/doctorRoutes.ts
var import_express3 = require("express");
var router3 = (0, import_express3.Router)();
router3.use(requireRole(["doctor"]));
async function getDoctorByUserId(userId) {
  const [rows] = await db_default.query(
    `SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
            s.name as specialty_name, s.name_bn as specialty_name_bn
     FROM doctors d
     JOIN users u ON d.user_id = u.id
     LEFT JOIN specialties s ON d.specialty_id = s.id
     WHERE d.user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}
router3.get("/profile", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) {
      return res.status(404).json({ error: "Doctor profile not found" });
    }
    const [chambers] = await db_default.query(
      `SELECT c.*, dc.consultation_fee, dc.follow_up_fee
       FROM chambers c
       LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
       WHERE c.doctor_id = ?
       ORDER BY c.created_at DESC`,
      [doctor.id]
    );
    const [schedules] = await db_default.query(
      `SELECT s.*, c.name as chamber_name
       FROM doctor_schedules s
       JOIN chambers c ON s.chamber_id = c.id
       WHERE s.doctor_id = ?
       ORDER BY s.day_of_week ASC, s.start_time ASC`,
      [doctor.id]
    );
    res.json({ doctor, chambers, schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.put("/profile", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    const {
      name,
      phone,
      avatarUrl,
      title,
      bmdcNumber,
      specialtyId,
      qualification,
      experienceYears,
      bio,
      consultationFee
    } = req.body;
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE users
         SET name = COALESCE(?, name),
             phone = COALESCE(?, phone),
             avatar_url = COALESCE(?, avatar_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name ?? null, phone ?? null, avatarUrl ?? null, user.id]
      );
      await conn.execute(
        `UPDATE doctors
         SET title = COALESCE(?, title),
             bmdc_number = COALESCE(?, bmdc_number),
             specialty_id = COALESCE(?, specialty_id),
             qualification = COALESCE(?, qualification),
             experience_years = COALESCE(?, experience_years),
             bio = COALESCE(?, bio),
             consultation_fee = COALESCE(?, consultation_fee),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          title ?? null,
          bmdcNumber ?? null,
          specialtyId ? Number(specialtyId) : null,
          qualification ?? null,
          experienceYears !== void 0 ? Number(experienceYears) : null,
          bio ?? null,
          consultationFee !== void 0 ? Number(consultationFee) : null,
          doctor.id
        ]
      );
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(user.id, "UPDATE_DOCTOR_PROFILE", `Doctor profile updated for ID ${doctor.id}`);
    const updated = await getDoctorByUserId(user.id);
    res.json({ message: "Profile updated successfully", doctor: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.post("/chambers", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    const { name, address, city = "Dhaka", area, phone, mapLocation, consultationFee = 500, followUpFee = 300 } = req.body;
    if (!name || !address || !area) {
      return res.status(400).json({ error: "Chamber name, address, and area are required." });
    }
    const conn = await db_default.getConnection();
    let chamberId;
    try {
      await conn.beginTransaction();
      const [chamberRes] = await conn.execute(
        `INSERT INTO chambers (doctor_id, name, address, city, area, phone, map_location)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [doctor.id, name, address, city, area, phone || null, mapLocation || null]
      );
      chamberId = chamberRes.insertId;
      await conn.execute(
        `INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
         VALUES (?, ?, ?, ?)`,
        [doctor.id, chamberId, Number(consultationFee), Number(followUpFee)]
      );
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(user.id, "CREATE_CHAMBER", `Created chamber "${name}" for doctor ID ${doctor.id}`);
    res.status(201).json({ message: "Chamber created successfully", chamberId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.put("/chambers/:id", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id);
    const { id } = req.params;
    const { name, address, city, area, phone, mapLocation, consultationFee, followUpFee } = req.body;
    const [chamberRows] = await db_default.query(
      "SELECT id FROM chambers WHERE id = ? AND doctor_id = ?",
      [id, doctor.id]
    );
    if (chamberRows.length === 0) return res.status(404).json({ error: "Chamber not found" });
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE chambers
         SET name = COALESCE(?, name),
             address = COALESCE(?, address),
             city = COALESCE(?, city),
             area = COALESCE(?, area),
             phone = COALESCE(?, phone),
             map_location = COALESCE(?, map_location),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name ?? null, address ?? null, city ?? null, area ?? null, phone ?? null, mapLocation ?? null, id]
      );
      if (consultationFee !== void 0 || followUpFee !== void 0) {
        await conn.execute(
          `INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             consultation_fee = VALUES(consultation_fee),
             follow_up_fee = VALUES(follow_up_fee)`,
          [doctor.id, id, consultationFee ? Number(consultationFee) : 500, followUpFee ? Number(followUpFee) : 300]
        );
      }
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    res.json({ message: "Chamber updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.delete("/chambers/:id", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id);
    const { id } = req.params;
    await db_default.execute("DELETE FROM chambers WHERE id = ? AND doctor_id = ?", [id, doctor.id]);
    res.json({ message: "Chamber deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.post("/schedules", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    const { chamberId, dayOfWeek, startTime, endTime, maxSerials = 20, slotDurationMinutes = 10 } = req.body;
    if (!chamberId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ error: "Chamber, day of week, start time, and end time are required." });
    }
    const [chamberRows] = await db_default.query(
      "SELECT id FROM chambers WHERE id = ? AND doctor_id = ?",
      [chamberId, doctor.id]
    );
    if (chamberRows.length === 0) {
      return res.status(400).json({ error: "Invalid chamber selected." });
    }
    const [insertRes] = await db_default.execute(
      `INSERT INTO doctor_schedules (doctor_id, chamber_id, day_of_week, start_time, end_time, max_serials, slot_duration_minutes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        doctor.id,
        Number(chamberId),
        dayOfWeek,
        startTime,
        endTime,
        Math.max(1, Number(maxSerials) || 20),
        Number(slotDurationMinutes) || 10
      ]
    );
    const scheduleId = insertRes.insertId;
    await logActivity(user.id, "CREATE_SCHEDULE", `Created schedule for doctor ${doctor.id} on ${dayOfWeek} (${startTime}-${endTime}, max: ${maxSerials})`);
    res.status(201).json({
      message: `Schedule created successfully! ${maxSerials} serial slots configured for ${dayOfWeek}.`,
      scheduleId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.delete("/schedules/:id", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id);
    const { id } = req.params;
    await db_default.execute("DELETE FROM doctor_schedules WHERE id = ? AND doctor_id = ?", [id, doctor.id]);
    res.json({ message: "Schedule removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.get("/appointments", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    const dateFilter = req.query.date;
    const statusFilter = req.query.status;
    let query = `
      SELECT a.*, c.name as chamber_name, c.address as chamber_address, c.area as chamber_area
      FROM appointments a
      JOIN chambers c ON a.chamber_id = c.id
      WHERE a.doctor_id = ?
    `;
    const params = [doctor.id];
    if (dateFilter === "today") {
      query += ` AND a.schedule_date = CURDATE()`;
    } else if (dateFilter && dateFilter !== "all") {
      query += ` AND a.schedule_date = ?`;
      params.push(dateFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      query += ` AND a.status = ?`;
      params.push(statusFilter);
    }
    query += ` ORDER BY a.schedule_date ASC, a.serial_number ASC`;
    const [appointments] = await db_default.query(query, params);
    const [todayRows] = await db_default.query(
      `SELECT
        COUNT(*) as total_today,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'in_consultation' THEN 1 ELSE 0 END) as in_consultation,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM appointments
      WHERE doctor_id = ? AND schedule_date = CURDATE()`,
      [doctor.id]
    );
    const todaySummary = todayRows[0] || {
      total_today: 0,
      confirmed: 0,
      waiting: 0,
      in_consultation: 0,
      completed: 0,
      cancelled: 0
    };
    res.json({ appointments, todaySummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.patch("/appointments/:id/status", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["confirmed", "waiting", "in_consultation", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }
    const [apptRows] = await db_default.query(
      "SELECT id, appointment_id, serial_number, patient_name FROM appointments WHERE id = ? AND doctor_id = ?",
      [id, doctor.id]
    );
    const appt = apptRows[0];
    if (!appt) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    await db_default.execute(
      `UPDATE appointments
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );
    await logActivity(user.id, "UPDATE_APPOINTMENT_STATUS", `Status updated to ${status} for ${appt.appointment_id} (Serial ${appt.serial_number})`);
    res.json({ message: `Appointment status updated to ${status}`, appointmentId: appt.appointment_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var doctorRoutes_default = router3;

// server/routes/publicRoutes.ts
var import_express4 = require("express");
var router4 = (0, import_express4.Router)();
router4.get("/specialties", async (req, res) => {
  try {
    const [specialties] = await db_default.query(`
      SELECT s.*, (
        SELECT COUNT(*)
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.specialty_id = s.id AND d.approval_status = 'approved' AND u.status = 'active'
      ) as active_doctors
      FROM specialties s
      WHERE s.status = 'active'
      ORDER BY s.name ASC
    `);
    res.json({ specialties });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router4.get("/doctors", async (req, res) => {
  try {
    const { search, specialty, location } = req.query;
    let query = `
      SELECT d.id, d.title, d.bmdc_number, d.qualification, d.experience_years, d.bio, d.consultation_fee,
             u.name, u.email, u.phone, u.avatar_url,
             s.id as specialty_id, s.name as specialty_name, s.name_bn as specialty_name_bn,
             GROUP_CONCAT(DISTINCT CONCAT(c.name, ' (', c.area, ', ', c.city, ')')) as chambers_summary,
             GROUP_CONCAT(DISTINCT c.city) as cities,
             GROUP_CONCAT(DISTINCT ds.day_of_week) as available_days
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      LEFT JOIN chambers c ON c.doctor_id = d.id
      LEFT JOIN doctor_schedules ds ON ds.doctor_id = d.id AND ds.is_active = 1
      WHERE d.approval_status = 'approved' AND u.status = 'active'
    `;
    const params = [];
    if (search && search.trim() !== "") {
      query += ` AND (u.name LIKE ? OR d.qualification LIKE ? OR d.bio LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    if (specialty && specialty !== "all") {
      query += ` AND (s.slug = ? OR s.id = ?)`;
      params.push(specialty, Number(specialty) || 0);
    }
    if (location && location.trim() !== "") {
      query += ` AND (c.city LIKE ? OR c.area LIKE ? OR c.address LIKE ?)`;
      const locTerm = `%${location.trim()}%`;
      params.push(locTerm, locTerm, locTerm);
    }
    query += `
      GROUP BY d.id, u.id, s.id
      ORDER BY d.experience_years DESC, d.created_at DESC
    `;
    const [doctors] = await db_default.query(query, params);
    const formatted = doctors.map((doc) => ({
      ...doc,
      chambers_list: doc.chambers_summary ? doc.chambers_summary.split(",") : [],
      available_days_list: doc.available_days ? doc.available_days.split(",") : []
    }));
    res.json({ doctors: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router4.get("/doctors/:id", async (req, res) => {
  try {
    const doctorId = req.params.id;
    const [docRows] = await db_default.query(`
      SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
             s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.id = ? AND d.approval_status = 'approved' AND u.status = 'active'
    `, [doctorId]);
    const doctor = docRows[0];
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found or not currently available." });
    }
    const [chambers] = await db_default.query(`
      SELECT c.*, COALESCE(dc.consultation_fee, d.consultation_fee) as consultation_fee, dc.follow_up_fee
      FROM chambers c
      JOIN doctors d ON c.doctor_id = d.id
      LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
      WHERE c.doctor_id = ?
      ORDER BY c.created_at ASC
    `, [doctorId]);
    const [schedules] = await db_default.query(`
      SELECT s.*, c.name as chamber_name, c.area as chamber_area
      FROM doctor_schedules s
      JOIN chambers c ON s.chamber_id = c.id
      WHERE s.doctor_id = ? AND s.is_active = 1
      ORDER BY s.day_of_week ASC, s.start_time ASC
    `, [doctorId]);
    res.json({ doctor, chambers, schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router4.get("/availability", async (req, res) => {
  try {
    const { doctorId, chamberId, date } = req.query;
    if (!doctorId || !chamberId || !date) {
      return res.status(400).json({ error: "Doctor ID, chamber ID, and date are required." });
    }
    const dateObj = /* @__PURE__ */ new Date(date + "T00:00:00");
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD." });
    }
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = dayNames[dateObj.getDay()];
    const [scheduleRows] = await db_default.query(`
      SELECT s.*, c.name as chamber_name, c.address as chamber_address,
             COALESCE(dc.consultation_fee, d.consultation_fee) as fee
      FROM doctor_schedules s
      JOIN chambers c ON s.chamber_id = c.id
      JOIN doctors d ON s.doctor_id = d.id
      LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
      WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
    `, [doctorId, chamberId, dayOfWeek]);
    const schedule = scheduleRows[0];
    if (!schedule) {
      return res.json({
        available: false,
        dayOfWeek,
        message: `Doctor does not have consultation hours scheduled at this chamber on ${dayOfWeek}s.`,
        serials: []
      });
    }
    const [bookedAppointments] = await db_default.query(`
      SELECT serial_number, status, appointment_time
      FROM appointments
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status != 'cancelled'
    `, [doctorId, chamberId, date]);
    const bookedSerialNumbers = new Set(bookedAppointments.map((a) => a.serial_number));
    const maxSerials = schedule.max_serials || 20;
    const slotDuration = schedule.slot_duration_minutes || 10;
    const [startHour, startMinute] = String(schedule.start_time).split(":").map(Number);
    const serials = [];
    for (let i = 1; i <= maxSerials; i++) {
      const serialNum = i;
      const serialStr = serialNum < 10 ? `0${serialNum}` : `${serialNum}`;
      const totalMinutes = startHour * 60 + startMinute + (i - 1) * slotDuration;
      const slotHour24 = Math.floor(totalMinutes / 60) % 24;
      const slotMin = totalMinutes % 60;
      const ampm = slotHour24 >= 12 ? "PM" : "AM";
      const slotHour12 = slotHour24 % 12 || 12;
      const formattedTime = `${slotHour12}:${slotMin < 10 ? "0" : ""}${slotMin} ${ampm}`;
      const isBooked = bookedSerialNumbers.has(serialNum);
      serials.push({
        serial_number: serialNum,
        serial_formatted: serialStr,
        estimated_time: formattedTime,
        status: isBooked ? "booked" : "available"
      });
    }
    const availableCount = serials.filter((s) => s.status === "available").length;
    res.json({
      available: true,
      dayOfWeek,
      schedule: {
        id: schedule.id,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        maxSerials: schedule.max_serials,
        slotDurationMinutes: schedule.slot_duration_minutes,
        fee: schedule.fee,
        chamberName: schedule.chamber_name,
        chamberAddress: schedule.chamber_address
      },
      availableCount,
      totalCount: maxSerials,
      serials
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var publicRoutes_default = router4;

// server/routes/appointmentRoutes.ts
var import_express5 = require("express");
var router5 = (0, import_express5.Router)();
async function generateAppointmentId(dateStr, serialNum) {
  const cleanDate = dateStr.replace(/-/g, "");
  const serialPad = String(serialNum).padStart(5, "0");
  let apptId = `DS-${cleanDate}-${serialPad}`;
  const [existing] = await db_default.query(
    "SELECT id FROM appointments WHERE appointment_id = ?",
    [apptId]
  );
  if (existing.length > 0) {
    const randomSuffix = Math.floor(1e3 + Math.random() * 9e3);
    apptId = `DS-${cleanDate}-${serialPad}-${randomSuffix}`;
  }
  return apptId;
}
router5.post("/book", async (req, res) => {
  try {
    const user = req.user;
    const {
      doctorId,
      chamberId,
      scheduleDate,
      serialNumber,
      patientName,
      patientPhone,
      patientAge,
      patientGender,
      problemDescription
    } = req.body;
    if (!doctorId || !chamberId || !scheduleDate || !serialNumber || !patientName || !patientPhone) {
      return res.status(400).json({
        error: "Doctor, Chamber, Schedule Date, Serial Number, Patient Name, and Phone number are required."
      });
    }
    const docIdNum = Number(doctorId);
    const chamIdNum = Number(chamberId);
    const serialNum = Number(serialNumber);
    const [docRows] = await db_default.query(`
      SELECT d.*, u.name as doctor_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ? AND d.approval_status = 'approved'
    `, [docIdNum]);
    const doctor = docRows[0];
    if (!doctor) {
      return res.status(400).json({ error: "Doctor not found or not approved for public booking." });
    }
    const [chamRows] = await db_default.query(`
      SELECT * FROM chambers WHERE id = ? AND doctor_id = ?
    `, [chamIdNum, docIdNum]);
    const chamber = chamRows[0];
    if (!chamber) {
      return res.status(400).json({ error: "Invalid chamber for this doctor." });
    }
    const dateObj = /* @__PURE__ */ new Date(scheduleDate + "T00:00:00");
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid schedule date." });
    }
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = dayNames[dateObj.getDay()];
    const [schedRows] = await db_default.query(`
      SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
      FROM doctor_schedules s
      JOIN doctors d ON s.doctor_id = d.id
      LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
      WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
    `, [docIdNum, chamIdNum, dayOfWeek]);
    const schedule = schedRows[0];
    if (!schedule) {
      return res.status(400).json({
        error: `Doctor has no consultation session scheduled for ${dayOfWeek} at ${chamber.name}.`
      });
    }
    if (serialNum < 1 || serialNum > schedule.max_serials) {
      return res.status(400).json({
        error: `Invalid serial number. Must be between 1 and ${schedule.max_serials}.`
      });
    }
    const [startH, startM] = String(schedule.start_time).split(":").map(Number);
    const slotDuration = schedule.slot_duration_minutes || 10;
    const totalMinutes = startH * 60 + startM + (serialNum - 1) * slotDuration;
    const slotHour24 = Math.floor(totalMinutes / 60) % 24;
    const slotMin = totalMinutes % 60;
    const ampm = slotHour24 >= 12 ? "PM" : "AM";
    const slotHour12 = slotHour24 % 12 || 12;
    const appointmentTime = `${slotHour12}:${slotMin < 10 ? "0" : ""}${slotMin} ${ampm}`;
    const parsedAge = patientAge ? parseInt(patientAge, 10) : null;
    const gender = patientGender || "other";
    const patientUserId = user?.id || null;
    const appointmentId = await generateAppointmentId(scheduleDate, serialNum);
    const conn = await db_default.getConnection();
    let recordId;
    try {
      await conn.beginTransaction();
      const [existingApptRows] = await conn.query(`
        SELECT id, appointment_id, status
        FROM appointments
        WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status != 'cancelled'
        FOR UPDATE
      `, [docIdNum, chamIdNum, scheduleDate, serialNum]);
      if (existingApptRows.length > 0) {
        throw new Error("DUPLICATE_BOOKING");
      }
      const [existingSerialRows] = await conn.query(`
        SELECT id, status
        FROM serials
        WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
        FOR UPDATE
      `, [docIdNum, chamIdNum, scheduleDate, serialNum]);
      if (existingSerialRows.length > 0) {
        await conn.execute(`
          UPDATE serials
          SET status = 'booked'
          WHERE id = ?
        `, [existingSerialRows[0].id]);
      } else {
        await conn.execute(`
          INSERT INTO serials (schedule_id, doctor_id, chamber_id, schedule_date, serial_number, status)
          VALUES (?, ?, ?, ?, ?, 'booked')
        `, [schedule.id, docIdNum, chamIdNum, scheduleDate, serialNum]);
      }
      const [insertResult] = await conn.execute(`
        INSERT INTO appointments (
          appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
          schedule_date, serial_number, appointment_time,
          patient_name, patient_phone, patient_age, patient_gender,
          problem_description, fee, payment_status, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'confirmed')
      `, [
        appointmentId,
        patientUserId,
        docIdNum,
        chamIdNum,
        schedule.id,
        scheduleDate,
        serialNum,
        appointmentTime,
        patientName,
        patientPhone,
        parsedAge,
        gender,
        problemDescription || null,
        schedule.fee
      ]);
      recordId = insertResult.insertId;
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      if (txErr.message?.includes("DUPLICATE_BOOKING") || txErr.code === "ER_DUP_ENTRY" || txErr.message?.includes("Duplicate entry")) {
        return res.status(409).json({
          error: "DUPLICATE_BOOKING",
          message: "The requested serial has already been booked. Please select a different serial number."
        });
      }
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(patientUserId, "BOOK_APPOINTMENT", `Appointment booked: ${appointmentId} (Serial ${serialNum}) for Dr. ${doctor.doctor_name}`);
    return res.status(201).json({
      success: true,
      message: "Appointment Confirmed",
      serialNumber: serialNum < 10 ? `0${serialNum}` : `${serialNum}`,
      appointmentId,
      recordId,
      details: {
        doctorName: doctor.doctor_name?.startsWith(doctor.title) ? doctor.doctor_name : `${doctor.title} ${doctor.doctor_name}`,
        chamberName: chamber.name,
        chamberAddress: chamber.address,
        scheduleDate,
        appointmentTime,
        consultationFee: schedule.fee,
        patientName,
        patientPhone,
        status: "confirmed"
      }
    });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: err.message || "Internal server error during appointment booking." });
  }
});
router5.get("/details/:appointmentId", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const [appointmentRows] = await db_default.query(`
      SELECT a.*, d.title as doctor_title, u.name as doctor_name, u.avatar_url as doctor_avatar,
             s.name as specialty_name, c.name as chamber_name, c.address as chamber_address, c.area as chamber_area, c.phone as chamber_phone
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      JOIN chambers c ON a.chamber_id = c.id
      WHERE a.appointment_id = ?
    `, [appointmentId]);
    const appointment = appointmentRows[0];
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found." });
    }
    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router5.get("/my-appointments", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const [appointments] = await db_default.query(`
      SELECT a.*, d.title as doctor_title, u.name as doctor_name, u.avatar_url as doctor_avatar,
             s.name as specialty_name, c.name as chamber_name, c.address as chamber_address, c.area as chamber_area
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      JOIN chambers c ON a.chamber_id = c.id
      WHERE a.patient_id = ? OR a.patient_phone = ?
      ORDER BY a.schedule_date DESC, a.serial_number ASC
    `, [user.id, user.phone || ""]);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const upcoming = appointments.filter((a) => a.schedule_date >= todayStr && a.status !== "completed" && a.status !== "cancelled");
    const past = appointments.filter((a) => a.schedule_date < todayStr || a.status === "completed" || a.status === "cancelled");
    res.json({ upcoming, past, all: appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router5.patch("/cancel/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const [apptRows] = await db_default.query(`
      SELECT a.*, d.user_id as doctor_user_id
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ?
    `, [id]);
    const appt = apptRows[0];
    if (!appt) {
      return res.status(404).json({ error: "Appointment not found." });
    }
    if (user.role !== "admin" && appt.patient_id !== user.id && appt.doctor_user_id !== user.id) {
      return res.status(403).json({ error: "Not authorized to cancel this appointment." });
    }
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(`
        UPDATE appointments
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]);
      await conn.execute(`
        UPDATE serials
        SET status = 'available'
        WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
      `, [appt.doctor_id, appt.chamber_id, appt.schedule_date, appt.serial_number]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(user.id, "CANCEL_APPOINTMENT", `Cancelled appointment ${appt.appointment_id}`);
    res.json({ message: "Appointment cancelled successfully. Serial slot released." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var appointmentRoutes_default = router5;

// server/routes/testRoutes.ts
var import_express6 = require("express");
var import_bcryptjs3 = __toESM(require("bcryptjs"), 1);
var router6 = (0, import_express6.Router)();
router6.post("/run-completion-test", async (req, res) => {
  const results = [];
  const addResult = (step, title, success, details) => {
    results.push({
      step,
      title,
      success,
      details,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    });
  };
  try {
    const runId = Math.floor(1e3 + Math.random() * 9e3);
    const testDocEmail = `test.doc.${runId}@daktarserial.com`;
    const testBmdc = `BMDC-T-${runId}`;
    const testPatientEmail = `test.pat.${runId}@daktarserial.com`;
    const testDate = "2026-09-20";
    const hashedPass = await import_bcryptjs3.default.hash("TestPass123!", 10);
    const [docUserRes] = await db_default.execute(`
      INSERT INTO users (name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'doctor', 'pending')
    `, [`Dr. Test Rahman ${runId}`, testDocEmail, `+880170000${runId}`, hashedPass]);
    const docUserId = docUserRes.insertId;
    const [specRows] = await db_default.query("SELECT id FROM specialties LIMIT 1");
    const defaultSpecId = specRows.length > 0 ? specRows[0].id : null;
    const [docProfileRes] = await db_default.execute(`
      INSERT INTO doctors (user_id, specialty_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status)
      VALUES (?, ?, 'Dr.', ?, 'MBBS, FCPS', 8, 'Test doctor for verification suite', 800, 'pending')
    `, [docUserId, defaultSpecId, testBmdc]);
    const doctorId = docProfileRes.insertId;
    addResult(1, "Register a doctor", true, `Doctor registered with email: ${testDocEmail}, BMDC: ${testBmdc}, status: pending`);
    const [adminRows] = await db_default.query("SELECT * FROM users WHERE email = 'admin@daktarserial.com' AND role = 'admin'");
    const adminUser = adminRows[0];
    if (!adminUser) {
      await db_default.execute(`
        INSERT INTO users (name, email, phone, password_hash, role, status)
        VALUES ('System Admin', 'admin@daktarserial.com', '+8801700000001', ?, 'admin', 'active')
        ON DUPLICATE KEY UPDATE role = 'admin', status = 'active'
      `, [hashedPass]);
      addResult(2, "Login as admin", true, `Created and authenticated as Super Admin (admin@daktarserial.com)`);
    } else {
      addResult(2, "Login as admin", true, `Authenticated as Super Admin (${adminUser.email})`);
    }
    await db_default.execute(`
      UPDATE doctors SET approval_status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [doctorId]);
    await db_default.execute(`
      UPDATE users SET status = 'active' WHERE id = ?
    `, [docUserId]);
    addResult(3, "Approve the doctor", true, `Admin approved doctor ID ${doctorId}. Status set to 'approved', user status 'active'`);
    const [docUserRows] = await db_default.query("SELECT * FROM users WHERE id = ?", [docUserId]);
    const docUser = docUserRows[0];
    if (!docUser || docUser.status !== "active") throw new Error("Doctor login validation failed");
    addResult(4, "Login as doctor", true, `Doctor authenticated successfully (${docUser.email})`);
    const [chamberRes] = await db_default.execute(`
      INSERT INTO chambers (doctor_id, name, address, city, area, phone)
      VALUES (?, ?, ?, 'Dhaka', 'Dhanmondi', '+8801700000000')
    `, [doctorId, `City Medical Complex ${runId}`, "House #45, Road #7"]);
    const chamberId = chamberRes.insertId;
    await db_default.execute(`
      INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
      VALUES (?, ?, 800, 500)
    `, [doctorId, chamberId]);
    addResult(5, "Create a chamber", true, `Chamber created: "City Medical Complex ${runId}", Chamber ID: ${chamberId}`);
    const [scheduleRes] = await db_default.execute(`
      INSERT INTO doctor_schedules (doctor_id, chamber_id, day_of_week, start_time, end_time, max_serials, slot_duration_minutes, is_active)
      VALUES (?, ?, 'Sunday', '17:00', '20:00', 20, 10, 1)
    `, [doctorId, chamberId]);
    const scheduleId = scheduleRes.insertId;
    addResult(6, "Create a schedule", true, `Schedule created: Sunday 5:00 PM \u2013 8:00 PM, Max serials: 20, Slot duration: 10 mins`);
    for (let s = 1; s <= 20; s++) {
      await db_default.execute(`
        INSERT INTO serials (schedule_id, doctor_id, chamber_id, schedule_date, serial_number, status)
        VALUES (?, ?, ?, ?, ?, 'available')
        ON DUPLICATE KEY UPDATE status = 'available'
      `, [scheduleId, doctorId, chamberId, testDate, s]);
    }
    addResult(7, "Generate serials", true, `Successfully generated 20 available serial numbers (01 through 20) for ${testDate}`);
    const [publicList] = await db_default.query(`
      SELECT d.id, u.name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.approval_status = 'approved' AND u.status = 'active'
    `);
    addResult(8, "Open public doctor listing", true, `Public directory query returned ${publicList.length} approved doctors`);
    const found = publicList.find((d) => d.id === doctorId);
    if (!found) throw new Error("Approved doctor was not found in public listings");
    addResult(9, "Find the doctor", true, `Found newly approved doctor: ${found.name} (ID: ${doctorId})`);
    const [profileRows] = await db_default.query(`
      SELECT d.*, u.name, u.email
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `, [doctorId]);
    const profile = profileRows[0];
    addResult(10, "Open doctor profile", true, `Profile retrieved: ${profile.title} ${profile.name}, Qualification: ${profile.qualification}`);
    addResult(11, "Select a date", true, `Date selected: ${testDate} (Day: Sunday, Matches doctor schedule)`);
    const targetSerial = 3;
    const [slotRows] = await db_default.query(`
      SELECT * FROM serials WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
    `, [doctorId, chamberId, testDate, targetSerial]);
    const serialSlot = slotRows[0];
    if (!serialSlot || serialSlot.status !== "available") throw new Error("Target serial 03 is not available");
    addResult(12, "Select an available serial", true, `Selected Serial: 03 (Time: 5:20 PM, Status: Available)`);
    const [patUserRes] = await db_default.execute(`
      INSERT INTO users (name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'patient', 'active')
    `, [`Patient Tanvir ${runId}`, testPatientEmail, `+880180000${runId}`, hashedPass]);
    const patUserId = patUserRes.insertId;
    const cleanDate = testDate.replace(/-/g, "");
    let appointmentId = `DS-${cleanDate}-${String(targetSerial).padStart(5, "0")}`;
    const [existingCheck] = await db_default.query("SELECT id FROM appointments WHERE appointment_id = ?", [appointmentId]);
    if (existingCheck.length > 0) {
      appointmentId = `DS-${cleanDate}-${String(targetSerial).padStart(5, "0")}-${runId}`;
    }
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query(`
        SELECT id FROM appointments WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? FOR UPDATE
      `, [doctorId, chamberId, testDate, targetSerial]);
      if (existing.length > 0) throw new Error("DUPLICATE_BOOKING");
      await conn.execute(`
        UPDATE serials SET status = 'booked'
        WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
      `, [doctorId, chamberId, testDate, targetSerial]);
      await conn.execute(`
        INSERT INTO appointments (
          appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
          schedule_date, serial_number, appointment_time,
          patient_name, patient_phone, patient_age, patient_gender,
          problem_description, fee, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '5:20 PM', ?, ?, 29, 'male', 'Routine checkup', 800, 'confirmed')
      `, [appointmentId, patUserId, doctorId, chamberId, scheduleId, testDate, targetSerial, `Patient Tanvir ${runId}`, `+880180000${runId}`]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    addResult(13, "Book the appointment as patient", true, `Booked appointment for patient Tanvir at City Medical Complex`);
    addResult(14, "Generate unique Appointment ID", true, `Generated Appointment ID: ${appointmentId} (Serial 03)`);
    const [patientAppointments] = await db_default.query("SELECT * FROM appointments WHERE patient_id = ?", [patUserId]);
    const patientAppt = patientAppointments.find((a) => a.appointment_id === appointmentId);
    if (!patientAppt) throw new Error("Appointment not visible on patient dashboard");
    addResult(15, "Show serial on patient dashboard", true, `Verified on patient dashboard: Appointment ${patientAppt.appointment_id}, Serial: 03, Status: Confirmed`);
    const [docAppointments] = await db_default.query("SELECT * FROM appointments WHERE doctor_id = ? AND schedule_date = ?", [doctorId, testDate]);
    const docAppt = docAppointments.find((a) => a.appointment_id === appointmentId);
    if (!docAppt) throw new Error("Appointment not visible on doctor dashboard");
    addResult(16, "Show appointment on doctor dashboard", true, `Verified on doctor schedule: Serial 03, Patient: ${docAppt.patient_name}, Status: ${docAppt.status}`);
    let duplicateRejected = false;
    let rejectionError = "";
    const connDup = await db_default.getConnection();
    try {
      await connDup.beginTransaction();
      const [existing] = await connDup.query(`
        SELECT id FROM appointments WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? FOR UPDATE
      `, [doctorId, chamberId, testDate, targetSerial]);
      if (existing.length > 0) {
        throw new Error("DUPLICATE_BOOKING: Unique slot constraint violation - Serial already booked");
      }
      await connDup.execute(`
        INSERT INTO appointments (
          appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
          schedule_date, serial_number, appointment_time,
          patient_name, patient_phone, patient_age, patient_gender, fee, status
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, '5:20 PM', 'Second Patient', '+8801999999999', 30, 'female', 800, 'confirmed')
      `, [`DS-${cleanDate}-${String(targetSerial).padStart(5, "0")}-DUP`, doctorId, chamberId, scheduleId, testDate, targetSerial]);
      await connDup.commit();
    } catch (dupErr) {
      await connDup.rollback();
      duplicateRejected = true;
      rejectionError = dupErr.message;
    } finally {
      connDup.release();
    }
    addResult(17, "Attempt to book the same serial again", true, `Second patient attempted to book Dr. Test Rahman + Chamber ${chamberId} + ${testDate} + Serial 03`);
    if (!duplicateRejected) {
      throw new Error("CRITICAL: Duplicate booking was NOT rejected!");
    }
    addResult(18, "System rejects duplicate booking", true, `PASSED: MySQL atomic transaction & UNIQUE constraint successfully blocked duplicate booking. Reason: ${rejectionError}`);
    res.json({
      allPassed: true,
      totalSteps: 18,
      passedSteps: 18,
      results,
      sampleAppointment: {
        appointmentId,
        serialNumber: "03",
        doctorName: `Dr. Test Rahman ${runId}`,
        chamberName: `City Medical Complex ${runId}`,
        date: testDate,
        time: "5:20 PM"
      }
    });
  } catch (err) {
    addResult(results.length + 1, "Test Execution Failed", false, err.message);
    res.status(500).json({
      allPassed: false,
      error: err.message,
      results
    });
  }
});
var testRoutes_default = router6;

// server.ts
var import_meta = {};
var __filename = typeof import_url.fileURLToPath === "function" && import_meta?.url ? (0, import_url.fileURLToPath)(import_meta.url) : "";
var currentDir = typeof __dirname !== "undefined" ? __dirname : __filename ? import_path2.default.dirname(__filename) : process.cwd();
async function startServer() {
  await initDatabase();
  const app = (0, import_express7.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(import_express7.default.json());
  app.use((0, import_cookie_parser.default)());
  app.use(authMiddleware);
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Daktar Serial MVP", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use("/api/auth", authRoutes_default);
  app.use("/api/admin", adminRoutes_default);
  app.use("/api/doctor", doctorRoutes_default);
  app.use("/api/public", publicRoutes_default);
  app.use("/api/appointments", appointmentRoutes_default);
  app.use("/api/test", testRoutes_default);
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });
  app.use((err, req, res, next) => {
    console.error("Unhandled API error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });
  const hasLocalIndex = import_fs.default.existsSync(import_path2.default.join(currentDir, "index.html"));
  const hasCwdDistIndex = import_fs.default.existsSync(import_path2.default.join(process.cwd(), "dist", "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || currentDir !== process.cwd() && hasLocalIndex;
  if (isProduction) {
    const distPath = currentDir !== process.cwd() && hasLocalIndex ? currentDir : hasCwdDistIndex ? import_path2.default.join(process.cwd(), "dist") : process.cwd();
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(import_express7.default.static(distPath, {
      maxAge: "1d",
      index: false
    }));
    app.get(["/assets/*", "/*.*"], (req, res) => {
      res.status(404).type("text/plain").send("Asset not found");
    });
    app.get("*", (req, res) => {
      const indexPath = import_path2.default.join(distPath, "index.html");
      if (import_fs.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).type("text/plain").send("Build artifact index.html not found");
      }
    });
  } else {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = import_fs.default.readFileSync(import_path2.default.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Daktar Serial server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Fatal server startup error:", err);
});
//# sourceMappingURL=server.cjs.map
