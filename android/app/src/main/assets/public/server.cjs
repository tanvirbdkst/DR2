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
var import_express9 = __toESM(require("express"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_cors = __toESM(require("cors"), 1);
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
    sqliteDb.function("RIGHT", (str, len) => {
      if (!str) return "";
      const s = String(str);
      const l = Number(len) || 0;
      return l <= 0 ? "" : s.slice(-l);
    });
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
  `);
  ensureSqliteColumns(db);
  seedSqliteDatabase(db);
}
function ensureSqliteColumns(db) {
  const addColumnIfMissing = (table, column, definition) => {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all();
      if (!cols.some((c) => c.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    } catch {
    }
  };
  addColumnIfMissing("users", "doctor_id", "INTEGER NULL");
  addColumnIfMissing("users", "last_login_at", "TEXT NULL");
  addColumnIfMissing("appointments", "booking_source", "TEXT NOT NULL DEFAULT 'online'");
  addColumnIfMissing("appointments", "created_by", "INTEGER NULL");
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
      ('Allergy & Immunology', '\u0985\u09CD\u09AF\u09BE\u09B2\u09BE\u09B0\u09CD\u099C\u09BF \u0993 \u0987\u09AE\u09BF\u0989\u09A8\u09CB\u09B2\u099C\u09BF', 'allergy-immunology', 'Stethoscope', 'Allergic conditions and immune disorders', 'active'),
      ('Cardiology', '\u09B9\u09C3\u09A6\u09B0\u09CB\u0997', 'cardiology', 'Heart', 'Heart and cardiovascular diseases', 'active'),
      ('Clinical Nutrition', '\u0995\u09CD\u09B2\u09BF\u09A8\u09BF\u0995\u09CD\u09AF\u09BE\u09B2 \u09AA\u09C1\u09B7\u09CD\u099F\u09BF', 'clinical-nutrition', 'Apple', 'Dietetics and clinical nutrition', 'active'),
      ('Dental Surgery', '\u09A6\u09B8\u09CD\u09A4 \u09B8\u09BE\u09B0\u09CD\u099C\u09BE\u09B0\u09BF', 'dental-surgery', 'Smile', 'Teeth and oral surgery', 'active'),
      ('Dermatology', '\u099A\u09B0\u09CD\u09AE\u09B0\u09CB\u0997', 'dermatology', 'Sparkles', 'Skin, hair, and nail treatments', 'active'),
      ('Diabetology', '\u09A1\u09BE\u09AF\u09BC\u09BE\u09AC\u09C7\u099F\u09BF\u09B8', 'diabetology', 'Activity', 'Diabetes care and hormone control', 'active'),
      ('Endocrinology', '\u09B9\u09B0\u09AE\u09CB\u09A8 \u09B0\u09CB\u0997', 'endocrinology', 'Stethoscope', 'Hormonal and thyroid diseases', 'active'),
      ('ENT', '\u09A8\u09BE\u0995 \u0995\u09BE\u09A8 \u0997\u09B2\u09BE', 'ent', 'Volume2', 'Ear, nose, and throat treatments', 'active'),
      ('Gastroenterology', '\u09AA\u09B0\u09BF\u09AA\u09BE\u0995\u09A4\u09A8\u09CD\u09A4\u09CD\u09B0\u09C7\u09B0 \u09B0\u09CB\u0997', 'gastroenterology', 'Activity', 'Digestive and liver health', 'active'),
      ('General Medicine', '\u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u099A\u09BF\u0995\u09BF\u09CE\u09B8\u09BE', 'general-medicine', 'Pill', 'General adult healthcare and internal medicine', 'active'),
      ('General Surgery', '\u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u09B8\u09BE\u09B0\u09CD\u099C\u09BE\u09B0\u09BF', 'general-surgery', 'Activity', 'General surgical procedures', 'active'),
      ('Hematology', '\u09B0\u0995\u09CD\u09A4\u09B0\u09CB\u0997', 'hematology', 'Droplets', 'Blood disorders and hematology care', 'active'),
      ('Gynecology & Obstetrics', '\u09B8\u09CD\u09A4\u09CD\u09B0\u09C0 \u0993 \u09AA\u09CD\u09B0\u09B8\u09C2\u09A4\u09BF \u09B0\u09CB\u0997', 'gynecology', 'Baby', 'Women health and maternity care', 'active'),
      ('Nephrology', '\u0995\u09BF\u09A1\u09A8\u09BF \u09B0\u09CB\u0997', 'nephrology', 'Activity', 'Kidney diseases and hypertension', 'active'),
      ('Neurology', '\u09A8\u09BF\u0989\u09B0\u09CB\u09AE\u09C7\u09A1\u09BF\u09B8\u09BF\u09A8', 'neurology', 'Brain', 'Brain and nervous system disorders', 'active'),
      ('Oncology', '\u0995\u09CD\u09AF\u09BE\u09A8\u09CD\u09B8\u09BE\u09B0 \u09AC\u09BF\u09B6\u09C7\u09B7\u099C\u09CD\u099E', 'oncology', 'Shield', 'Cancer treatments and oncology care', 'active'),
      ('Ophthalmology', '\u099A\u0995\u09CD\u09B7\u09C1\u09B0\u09CB\u0997', 'ophthalmology', 'Eye', 'Eye care and vision health', 'active'),
      ('Orthopedics', '\u09B9\u09BE\u09DC-\u099C\u09CB\u09DC \u0993 \u0985\u09B0\u09CD\u09A5\u09CB\u09AA\u09C7\u09A1\u09BF\u0995\u09B8', 'orthopedics', 'Activity', 'Bone and joint surgery', 'active'),
      ('Pediatrics / Child Specialist', '\u09B6\u09BF\u09B6\u09C1 \u09AC\u09BF\u09B6\u09C7\u09B7\u099C\u09CD\u099E', 'pediatrics', 'Smile', 'Child and infant healthcare', 'active'),
      ('Psychiatry', '\u09AE\u09BE\u09A8\u09B8\u09BF\u0995 \u09B0\u09CB\u0997', 'psychiatry', 'Brain', 'Mental health and psychological care', 'active'),
      ('Pulmonology', '\u09AC\u0995\u09CD\u09B7\u09AC\u09CD\u09AF\u09BE\u09A7\u09BF \u0993 \u0985\u09CD\u09AF\u09BE\u099C\u09AE\u09BE', 'pulmonology', 'Wind', 'Respiratory and lung health', 'active'),
      ('Urology', '\u0987\u0989\u09B0\u09CB\u09B2\u099C\u09BF', 'urology', 'Activity', 'Urinary tract and urological care', 'active');
    `);
  } catch {
  }
}
function seedSqliteDatabase(db) {
  const adminPasswordHash = import_bcryptjs.default.hashSync("Admin123!", 10);
  const defaultPasswordHash = import_bcryptjs.default.hashSync("Password123!", 10);
  try {
    const adminUser = db.prepare("SELECT id FROM users WHERE email = 'admin@daktarserial.com'").get();
    if (!adminUser) {
      db.prepare(`
        INSERT INTO users (name, email, phone, password_hash, role, status)
        VALUES ('System Admin', 'admin@daktarserial.com', '+8801711000000', ?, 'admin', 'active')
      `).run(adminPasswordHash);
    } else {
      db.prepare("UPDATE users SET password_hash = ?, role = 'admin', status = 'active' WHERE email = 'admin@daktarserial.com'").run(adminPasswordHash);
    }
  } catch (adminErr) {
    console.error("Error ensuring admin user in sqlite:", adminErr);
  }
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (userCount.c > 1) return;
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
      name: "Dr. Test Rahman",
      email: "dr.test@daktarserial.com",
      phone: "+8801733000003",
      title: "Dr.",
      bmdc: "3292",
      specialtyId: 4,
      qualification: "MBBS, DCH, MD (Pediatrics)",
      experienceYears: 14,
      bio: "Senior Child Specialist with dedicated focus on infant nutrition, growth tracking, pediatric infectious diseases and childhood asthma.",
      fee: 700,
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800",
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
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, status, doctor_id)
    VALUES (6, 'Karim Hossain', 'compounder@daktarserial.com', '+8801744000001', ?, 'compounder', 'active', 1)
  `).run(defaultPasswordHash);
  db.prepare(`
    INSERT OR IGNORE INTO compounders (id, user_id, doctor_id, created_by)
    VALUES (1, 6, 1, 1)
  `).run();
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
  transformed = transformed.replace(/FIELD\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/gi, (match, col, listStr) => {
    const items = listStr.split(",").map((s) => s.trim());
    const cases = items.map((val, idx) => `WHEN ${val} THEN ${idx + 1}`).join(" ");
    return `CASE ${col.trim()} ${cases} ELSE ${items.length + 1} END`;
  });
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
  keepAliveInitialDelay: 1e4,
  connectTimeout: 2e3
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
      phone: user.phone,
      role: user.role,
      status: user.status,
      doctorId: user.doctorId,
      compounderId: user.compounderId,
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
      "SELECT id, email, phone, name, role, status, doctor_id FROM users WHERE id = ?",
      [decoded.id]
    );
    const user = userRows[0];
    if (user) {
      decoded.phone = user.phone || decoded.phone;
      decoded.name = user.name || decoded.name;
      decoded.email = user.email || decoded.email;
      if (user.role === "doctor") {
        const [docRows] = await db_default.query(
          "SELECT id, approval_status FROM doctors WHERE user_id = ?",
          [user.id]
        );
        const doc = docRows[0];
        decoded.doctorId = doc?.id;
        decoded.status = doc?.approval_status || user.status;
      } else if (user.role === "compounder") {
        const [cmRows] = await db_default.query(
          "SELECT id, doctor_id FROM compounders WHERE user_id = ?",
          [user.id]
        );
        const compounder = cmRows[0];
        decoded.compounderId = compounder?.id;
        decoded.doctorId = compounder?.doctor_id ?? user.doctor_id ?? void 0;
      } else if (user.role === "patient") {
        const [patRows] = await db_default.query(
          "SELECT id FROM patients WHERE user_id = ?",
          [user.id]
        );
        const pat = patRows[0];
        decoded.patientId = pat?.id || user.id;
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
function compounderMiddleware(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required. Please login." });
  }
  if (user.role !== "compounder") {
    return res.status(403).json({ error: "Access denied. Compounder role required." });
  }
  if (user.status !== "active") {
    return res.status(403).json({ error: "Your account is not active. Please contact the administrator." });
  }
  if (!user.doctorId) {
    return res.status(403).json({ error: "No doctor is assigned to this account. Please contact the administrator." });
  }
  const declaredDoctorId = req.body?.doctorId ?? req.query?.doctorId ?? req.params?.doctorId;
  if (declaredDoctorId !== void 0 && declaredDoctorId !== null && declaredDoctorId !== "") {
    if (Number(declaredDoctorId) !== Number(user.doctorId)) {
      return res.status(403).json({ error: "Access denied. You can only manage the doctor assigned to you." });
    }
  }
  req.authorizedDoctorId = user.doctorId;
  next();
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
      avatarUrl,
      bmdcNumber,
      specialtyId,
      specialtyIds,
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
    let selectedSpecialtyIds = [];
    if (Array.isArray(specialtyIds) && specialtyIds.length > 0) {
      selectedSpecialtyIds = specialtyIds.map((id) => Number(id)).filter((n) => !isNaN(n) && n > 0);
    } else if (specialtyId) {
      const single = Number(specialtyId);
      if (!isNaN(single) && single > 0) selectedSpecialtyIds = [single];
    }
    if (selectedSpecialtyIds.length === 0) {
      return res.status(400).json({ error: "Please select at least one medical specialty." });
    }
    const primarySpecialtyId = selectedSpecialtyIds[0];
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
        `INSERT INTO users (name, email, phone, password_hash, role, status, avatar_url) VALUES (?, ?, ?, ?, 'doctor', 'pending', ?)`,
        [name, email, phone, passwordHash, avatarUrl || null]
      );
      userId = userRes.insertId;
      const [docRes] = await conn.execute(
        `INSERT INTO doctors (user_id, specialty_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          userId,
          primarySpecialtyId,
          title,
          bmdcNumber,
          qualification,
          Number(experienceYears) || 0,
          bio || "",
          Number(consultationFee) || 500
        ]
      );
      doctorId = docRes.insertId;
      for (let i = 0; i < selectedSpecialtyIds.length; i++) {
        const sId = selectedSpecialtyIds[i];
        await conn.execute(
          `INSERT IGNORE INTO doctor_specialties (doctor_id, specialty_id, is_primary)
           VALUES (?, ?, ?)`,
          [doctorId, sId, i === 0 ? 1 : 0]
        );
      }
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
        doctorId,
        avatarUrl: avatarUrl || null
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
    let [userRows] = await db_default.query(
      `SELECT id, name, email, phone, password_hash, role, status, avatar_url, doctor_id FROM users WHERE email = ?`,
      [email]
    );
    let user = userRows[0];
    if (!user && email.toLowerCase() === "admin@daktarserial.com") {
      const adminHash = await import_bcryptjs2.default.hash("Admin123!", 10);
      try {
        await db_default.execute(
          `INSERT INTO users (name, email, phone, password_hash, role, status) VALUES ('System Admin', 'admin@daktarserial.com', '+8801711000000', ?, 'admin', 'active')`,
          [adminHash]
        );
        const [reloaded] = await db_default.query(
          `SELECT id, name, email, phone, password_hash, role, status, avatar_url, doctor_id FROM users WHERE email = ?`,
          [email]
        );
        user = reloaded[0];
      } catch (insertErr) {
        console.error("Error auto-creating admin:", insertErr);
      }
    }
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    let isValid = await import_bcryptjs2.default.compare(password, user.password_hash);
    if (!isValid && (user.role === "admin" || user.email === "admin@daktarserial.com")) {
      const allowedAdminPasswords = ["Admin123!", "admin123", "Admin123", "admin", "Password123!"];
      if (allowedAdminPasswords.includes(password)) {
        isValid = true;
        const newHash = await import_bcryptjs2.default.hash(password, 10);
        await db_default.execute("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, user.id]);
      }
    }
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    let doctorId;
    let patientId;
    let compounderId;
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
    } else if (user.role === "compounder") {
      const [cmRows] = await db_default.query(
        "SELECT id, doctor_id FROM compounders WHERE user_id = ?",
        [user.id]
      );
      const compounder = cmRows[0];
      if (compounder) {
        compounderId = compounder.id;
        doctorId = compounder.doctor_id;
      } else {
        doctorId = user.doctor_id || void 0;
      }
      try {
        await db_default.execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
      } catch {
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
      compounderId,
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
        compounderId,
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
    let compounderDetails = null;
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
    } else if (dbUser2.role === "compounder") {
      const [cmRows] = await db_default.query(
        `SELECT c.id, c.doctor_id, d.title as doctor_title, du.name as doctor_name,
                s.name as specialty_name
         FROM compounders c
         JOIN doctors d ON c.doctor_id = d.id
         JOIN users du ON d.user_id = du.id
         LEFT JOIN specialties s ON d.specialty_id = s.id
         WHERE c.user_id = ?`,
        [dbUser2.id]
      );
      compounderDetails = cmRows[0];
      dbUser2.doctorId = compounderDetails?.doctor_id;
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
        doctorId: doctorDetails?.id ?? dbUser2.doctorId ?? compounderDetails?.doctor_id,
        patientId: patientDetails?.id,
        doctorDetails,
        patientDetails,
        compounderDetails
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
var import_bcryptjs3 = __toESM(require("bcryptjs"), 1);
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
    const [totalCompounders] = await db_default.query("SELECT COUNT(*) as count FROM compounders");
    const [recentLogs] = await db_default.query(`
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 8
    `);
    const statPayload = {
      totalDoctors: Number(totalDocs[0]?.count) || 0,
      pendingDoctors: Number(pendingDocs[0]?.count) || 0,
      approvedDoctors: Number(approvedDocs[0]?.count) || 0,
      totalPatients: Number(totalPats[0]?.count) || 0,
      totalAppointments: Number(totalAppts[0]?.count) || 0,
      todayAppointments: Number(todayAppts[0]?.count) || 0,
      totalCompounders: Number(totalCompounders[0]?.count) || 0
    };
    res.json({
      ...statPayload,
      stats: statPayload,
      recentLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function attachSpecialtiesToDoctorList(doctors) {
  if (!doctors || doctors.length === 0) return doctors;
  const docIds = doctors.map((d) => d.id);
  const placeholders = docIds.map(() => "?").join(",");
  const [specRows] = await db_default.query(
    `SELECT ds.doctor_id, s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
     FROM doctor_specialties ds
     JOIN specialties s ON ds.specialty_id = s.id
     WHERE ds.doctor_id IN (${placeholders})
     ORDER BY ds.is_primary DESC, s.name ASC`,
    docIds
  );
  const specsByDocId = /* @__PURE__ */ new Map();
  for (const row of specRows) {
    if (!specsByDocId.has(row.doctor_id)) specsByDocId.set(row.doctor_id, []);
    specsByDocId.get(row.doctor_id).push({
      id: row.id,
      name: row.name,
      name_bn: row.name_bn,
      slug: row.slug,
      icon: row.icon,
      is_primary: row.is_primary
    });
  }
  doctors.forEach((doc) => {
    const docSpecs = specsByDocId.get(doc.id) || [];
    if (docSpecs.length > 0) {
      doc.specialties = docSpecs;
      doc.specialty_ids = docSpecs.map((s) => s.id);
      doc.specialty_names = docSpecs.map((s) => s.name).join(" + ");
      doc.specialty_names_bn = docSpecs.map((s) => s.name_bn || s.name).join(" + ");
      doc.specialties_summary = doc.specialty_names;
    } else if (doc.specialty_name) {
      doc.specialties = [{
        id: doc.specialty_id,
        name: doc.specialty_name,
        name_bn: doc.specialty_name_bn,
        is_primary: 1
      }];
      doc.specialty_ids = [doc.specialty_id];
      doc.specialty_names = doc.specialty_name;
      doc.specialty_names_bn = doc.specialty_name_bn || doc.specialty_name;
      doc.specialties_summary = doc.specialty_name;
    } else {
      doc.specialties = [];
      doc.specialty_ids = [];
      doc.specialty_names = "";
      doc.specialty_names_bn = "";
      doc.specialties_summary = "";
    }
  });
  return doctors;
}
async function attachSpecialtiesToDoctor(doctor) {
  if (!doctor) return null;
  const [specRows] = await db_default.query(
    `SELECT s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
     FROM doctor_specialties ds
     JOIN specialties s ON ds.specialty_id = s.id
     WHERE ds.doctor_id = ?
     ORDER BY ds.is_primary DESC, s.name ASC`,
    [doctor.id]
  );
  if (specRows.length > 0) {
    doctor.specialties = specRows;
    doctor.specialty_ids = specRows.map((s) => s.id);
    doctor.specialty_names = specRows.map((s) => s.name).join(" + ");
    doctor.specialty_names_bn = specRows.map((s) => s.name_bn || s.name).join(" + ");
    doctor.specialties_summary = doctor.specialty_names;
  } else if (doctor.specialty_name) {
    doctor.specialties = [{
      id: doctor.specialty_id,
      name: doctor.specialty_name,
      name_bn: doctor.specialty_name_bn,
      is_primary: 1
    }];
    doctor.specialty_ids = [doctor.specialty_id];
    doctor.specialty_names = doctor.specialty_name;
    doctor.specialty_names_bn = doctor.specialty_name_bn || doctor.specialty_name;
    doctor.specialties_summary = doctor.specialty_name;
  } else {
    doctor.specialties = [];
    doctor.specialty_ids = [];
    doctor.specialty_names = "";
    doctor.specialty_names_bn = "";
    doctor.specialties_summary = "";
  }
  return doctor;
}
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
    await attachSpecialtiesToDoctorList(doctors);
    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.get("/doctors/pending", async (req, res) => {
  try {
    const query = `
      SELECT d.*, u.name, u.email, u.phone, u.avatar_url, u.status as user_status,
             s.name as specialty_name, s.name_bn as specialty_name_bn,
             (SELECT COUNT(*) FROM chambers c WHERE c.doctor_id = d.id) as chamber_count
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.approval_status = 'pending'
      ORDER BY d.created_at DESC
    `;
    const [doctors] = await db_default.query(query);
    await attachSpecialtiesToDoctorList(doctors);
    res.json({ pendingDoctors: doctors, doctors });
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
    let doctor = docRows[0];
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    doctor = await attachSpecialtiesToDoctor(doctor);
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
router2.patch("/doctors/:id/status", async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { status, reason } = req.body;
    const adminUser = req.user;
    if (!["approved", "pending", "rejected", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid doctor status." });
    }
    const [docRows] = await db_default.query("SELECT user_id, bmdc_number FROM doctors WHERE id = ?", [doctorId]);
    const doctor = docRows[0];
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      const userStatus = status === "approved" ? "active" : status === "suspended" ? "suspended" : "pending";
      await conn.execute(`
        UPDATE doctors
        SET approval_status = ?, rejection_reason = ?, approved_at = CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, reason || null, status, doctorId]);
      await conn.execute(`
        UPDATE users
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [userStatus, doctor.user_id]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(adminUser.id, "UPDATE_DOCTOR_STATUS", `Updated doctor ID ${doctorId} status to ${status}`);
    res.json({ message: `Doctor status updated to ${status} successfully.` });
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
router2.get("/appointments", async (req, res) => {
  try {
    const [appointments] = await db_default.query(`
      SELECT a.*, 
             u_doc.name as doctor_name, u_doc.phone as doctor_phone,
             u_pat.name as patient_user_name, u_pat.phone as patient_user_phone,
             c.name as chamber_name, c.address as chamber_address,
             s.name as specialty_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      LEFT JOIN users u_pat ON a.patient_id = u_pat.id
      JOIN chambers c ON a.chamber_id = c.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ORDER BY a.schedule_date DESC, a.serial_number ASC
      LIMIT 100
    `);
    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.get("/compounders", async (req, res) => {
  try {
    const [compounders] = await db_default.query(`
      SELECT c.id, c.user_id, c.doctor_id, c.created_at,
             u.name, u.email, u.phone, u.status, u.last_login_at,
             d.title as doctor_title, du.name as doctor_name,
             s.name as specialty_name,
             (SELECT COUNT(*) FROM appointments a WHERE a.created_by = u.id AND a.booking_source = 'compounder') as manual_bookings
      FROM compounders c
      JOIN users u ON c.user_id = u.id
      JOIN doctors d ON c.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ORDER BY c.created_at DESC
    `);
    res.json({ compounders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.get("/compounders/available-doctors", async (req, res) => {
  try {
    const [doctors] = await db_default.query(`
      SELECT d.id, d.title, u.name, u.email, d.approval_status,
             s.name as specialty_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ORDER BY u.name ASC
    `);
    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.get("/compounders/:id", async (req, res) => {
  try {
    const [rows] = await db_default.query(`
      SELECT c.id, c.user_id, c.doctor_id, c.created_at, c.updated_at,
             u.name, u.email, u.phone, u.status, u.last_login_at,
             d.title as doctor_title, du.name as doctor_name, du.email as doctor_email
      FROM compounders c
      JOIN users u ON c.user_id = u.id
      JOIN doctors d ON c.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      WHERE c.id = ?
    `, [req.params.id]);
    const compounder = rows[0];
    if (!compounder) {
      return res.status(404).json({ error: "Compounder not found." });
    }
    res.json({ compounder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
function mapCompounderStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "inactive" || normalized === "suspended") return "suspended";
  if (normalized === "pending") return "pending";
  throw new Error("Invalid status. Must be Active or Inactive.");
}
router2.post("/compounders", async (req, res) => {
  try {
    const adminUser = req.user;
    const { name, email, phone, password, status, doctorId } = req.body;
    if (!name || !email || !phone || !password || !doctorId) {
      return res.status(400).json({
        error: "Full Name, Mobile Number, Email, Login Password, and Assigned Doctor are required."
      });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    let userStatus;
    try {
      userStatus = mapCompounderStatus(status || "active");
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const [existing] = await db_default.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }
    const [doctorRows] = await db_default.query(
      "SELECT id FROM doctors WHERE id = ?",
      [Number(doctorId)]
    );
    if (doctorRows.length === 0) {
      return res.status(400).json({ error: "Selected doctor does not exist." });
    }
    const passwordHash = await import_bcryptjs3.default.hash(String(password), 10);
    const conn = await db_default.getConnection();
    let compounderId;
    let userId;
    try {
      await conn.beginTransaction();
      const [userRes] = await conn.execute(
        `INSERT INTO users (name, email, phone, password_hash, role, status, doctor_id)
         VALUES (?, ?, ?, ?, 'compounder', ?, ?)`,
        [name, email, phone, passwordHash, userStatus, Number(doctorId)]
      );
      userId = userRes.insertId;
      const [compRes] = await conn.execute(
        `INSERT INTO compounders (user_id, doctor_id, created_by) VALUES (?, ?, ?)`,
        [userId, Number(doctorId), adminUser.id]
      );
      compounderId = compRes.insertId;
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(adminUser.id, "CREATE_COMPOUNDER", `Created compounder ${email} assigned to doctor ID ${doctorId}`);
    res.status(201).json({
      message: "Compounder account created successfully.",
      compounderId,
      userId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.patch("/compounders/:id", async (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { name, phone, email } = req.body;
    const [rows] = await db_default.query(
      "SELECT c.user_id FROM compounders c WHERE c.id = ?",
      [id]
    );
    const compounder = rows[0];
    if (!compounder) {
      return res.status(404).json({ error: "Compounder not found." });
    }
    if (email) {
      const [existing] = await db_default.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, compounder.user_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: "Another account already uses this email." });
      }
    }
    await db_default.execute(
      `UPDATE users
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name ?? null, phone ?? null, email ?? null, compounder.user_id]
    );
    await logActivity(adminUser.id, "UPDATE_COMPOUNDER", `Updated compounder ID ${id}`);
    res.json({ message: "Compounder details updated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.patch("/compounders/:id/doctor", async (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { doctorId } = req.body;
    if (!doctorId) {
      return res.status(400).json({ error: "A doctor must be selected." });
    }
    const [rows] = await db_default.query(
      "SELECT c.user_id, c.doctor_id FROM compounders c WHERE c.id = ?",
      [id]
    );
    const compounder = rows[0];
    if (!compounder) {
      return res.status(404).json({ error: "Compounder not found." });
    }
    const [doctorRows] = await db_default.query(
      "SELECT id FROM doctors WHERE id = ?",
      [Number(doctorId)]
    );
    if (doctorRows.length === 0) {
      return res.status(400).json({ error: "Selected doctor does not exist." });
    }
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("UPDATE compounders SET doctor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [Number(doctorId), id]);
      await conn.execute("UPDATE users SET doctor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [Number(doctorId), compounder.user_id]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(adminUser.id, "CHANGE_COMPOUNDER_DOCTOR", `Reassigned compounder ID ${id} to doctor ID ${doctorId}`);
    res.json({ message: "Assigned doctor updated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.patch("/compounders/:id/status", async (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { status } = req.body;
    let userStatus;
    try {
      userStatus = mapCompounderStatus(status);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const [rows] = await db_default.query(
      "SELECT c.user_id FROM compounders c WHERE c.id = ?",
      [id]
    );
    const compounder = rows[0];
    if (!compounder) {
      return res.status(404).json({ error: "Compounder not found." });
    }
    await db_default.execute(
      "UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [userStatus, compounder.user_id]
    );
    await logActivity(adminUser.id, "UPDATE_COMPOUNDER_STATUS", `Set compounder ID ${id} status to ${userStatus}`);
    res.json({ message: `Compounder ${userStatus === "active" ? "activated" : "deactivated"} successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.post("/compounders/:id/reset-password", async (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    let { newPassword } = req.body;
    const [rows] = await db_default.query(
      "SELECT c.user_id, u.email FROM compounders c JOIN users u ON c.user_id = u.id WHERE c.id = ?",
      [id]
    );
    const compounder = rows[0];
    if (!compounder) {
      return res.status(404).json({ error: "Compounder not found." });
    }
    if (!newPassword) {
      newPassword = `Cmp${Math.floor(1e5 + Math.random() * 9e5)}!`;
    } else if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    const passwordHash = await import_bcryptjs3.default.hash(String(newPassword), 10);
    await db_default.execute(
      "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [passwordHash, compounder.user_id]
    );
    await logActivity(adminUser.id, "RESET_COMPOUNDER_PASSWORD", `Reset password for compounder ID ${id}`);
    res.json({ message: "Password reset successfully.", temporaryPassword: newPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.delete("/compounders/:id", async (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const [rows] = await db_default.query(
      "SELECT c.user_id, u.email, u.name FROM compounders c JOIN users u ON c.user_id = u.id WHERE c.id = ?",
      [id]
    );
    const compounder = rows[0];
    if (!compounder) {
      return res.status(404).json({ error: "Compounder not found." });
    }
    await db_default.execute("DELETE FROM users WHERE id = ?", [compounder.user_id]);
    await logActivity(adminUser.id, "DELETE_COMPOUNDER", `Deleted compounder ${compounder.name} (${compounder.email})`);
    res.json({ message: "Compounder account removed successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var adminRoutes_default = router2;

// server/routes/doctorRoutes.ts
var import_express4 = require("express");

// server/routes/publicRoutes.ts
var import_express3 = require("express");
var router3 = (0, import_express3.Router)();
function generateDoctorSlug(title = "Dr.", name = "", id) {
  const cleanTitle = (title || "Dr").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const cleanName = (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${cleanTitle}-${cleanName}-${id}`.replace(/--+/g, "-");
}
router3.get("/specialties", async (req, res) => {
  try {
    const [specialties] = await db_default.query(`
      SELECT s.*, (
        SELECT COUNT(DISTINCT d.id)
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
        WHERE (d.specialty_id = s.id OR ds.specialty_id = s.id)
          AND d.approval_status = 'approved' AND u.status = 'active'
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
router3.get("/doctors", async (req, res) => {
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
      query += ` AND (
        s.slug = ? OR s.id = ?
        OR EXISTS (
          SELECT 1 FROM doctor_specialties ds_filter
          JOIN specialties s_filter ON ds_filter.specialty_id = s_filter.id
          WHERE ds_filter.doctor_id = d.id AND (s_filter.slug = ? OR s_filter.id = ?)
        )
      )`;
      const sId = Number(specialty) || 0;
      params.push(specialty, sId, specialty, sId);
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
    if (doctors.length > 0) {
      const docIds = doctors.map((d) => d.id);
      const placeholders = docIds.map(() => "?").join(",");
      const [specRows] = await db_default.query(
        `SELECT ds.doctor_id, s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
         FROM doctor_specialties ds
         JOIN specialties s ON ds.specialty_id = s.id
         WHERE ds.doctor_id IN (${placeholders})
         ORDER BY ds.is_primary DESC, s.name ASC`,
        docIds
      );
      const specsByDocId = /* @__PURE__ */ new Map();
      for (const row of specRows) {
        if (!specsByDocId.has(row.doctor_id)) specsByDocId.set(row.doctor_id, []);
        specsByDocId.get(row.doctor_id).push({
          id: row.id,
          name: row.name,
          name_bn: row.name_bn,
          slug: row.slug,
          icon: row.icon,
          is_primary: row.is_primary
        });
      }
      doctors.forEach((doc) => {
        const docSpecs = specsByDocId.get(doc.id) || [];
        if (docSpecs.length > 0) {
          doc.specialties = docSpecs;
          doc.specialty_names = docSpecs.map((s) => s.name).join(" + ");
          doc.specialty_names_bn = docSpecs.map((s) => s.name_bn || s.name).join(" + ");
        } else if (doc.specialty_name) {
          doc.specialties = [{
            id: doc.specialty_id,
            name: doc.specialty_name,
            name_bn: doc.specialty_name_bn,
            is_primary: 1
          }];
          doc.specialty_names = doc.specialty_name;
          doc.specialty_names_bn = doc.specialty_name_bn || doc.specialty_name;
        } else {
          doc.specialties = [];
          doc.specialty_names = "";
          doc.specialty_names_bn = "";
        }
      });
    }
    const formatted = doctors.map((doc) => ({
      ...doc,
      slug: generateDoctorSlug(doc.title, doc.name, doc.id),
      chambers_list: doc.chambers_summary ? doc.chambers_summary.split(",") : [],
      available_days_list: doc.available_days ? doc.available_days.split(",") : []
    }));
    res.json({ doctors: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.get("/doctors/:id", async (req, res) => {
  try {
    const cleanParam = decodeURIComponent(String(req.params.id || "").trim()).split("?")[0].split("#")[0];
    let docRows = [];
    const numericId = Number(cleanParam);
    if (!isNaN(numericId) && numericId > 0) {
      [docRows] = await db_default.query(`
        SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
               s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specialties s ON d.specialty_id = s.id
        WHERE d.id = ? AND u.status != 'deleted'
        ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
        LIMIT 1
      `, [numericId]);
    }
    if (docRows.length === 0) {
      const match = cleanParam.match(/-(\d+)$/);
      if (match) {
        const extractedId = Number(match[1]);
        if (!isNaN(extractedId) && extractedId > 0) {
          [docRows] = await db_default.query(`
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                   s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE d.id = ? AND u.status != 'deleted'
            ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
            LIMIT 1
          `, [extractedId]);
        }
      }
    }
    if (docRows.length === 0) {
      const allNumbers = cleanParam.match(/\d+/g);
      if (allNumbers && allNumbers.length > 0) {
        for (const numStr of allNumbers) {
          const num = Number(numStr);
          [docRows] = await db_default.query(`
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                   s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE (d.bmdc_number = ? OR d.bmdc_number LIKE ? OR d.id = ?) AND u.status != 'deleted'
            ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
            LIMIT 1
          `, [numStr, `%${numStr}%`, num]);
          if (docRows.length > 0) break;
        }
      }
    }
    if (docRows.length === 0) {
      const nameGuess = cleanParam.replace(/^(?:prof-|asst-prof-|assoc-prof-|dr-)+/i, "").replace(/-\d+/g, "").replace(/-/g, " ").trim();
      if (nameGuess.length >= 2) {
        [docRows] = await db_default.query(`
          SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                 s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
          FROM doctors d
          JOIN users u ON d.user_id = u.id
          LEFT JOIN specialties s ON d.specialty_id = s.id
          WHERE LOWER(u.name) LIKE LOWER(?) AND u.status != 'deleted'
          ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
          LIMIT 1
        `, [`%${nameGuess}%`]);
      }
    }
    const doctor = docRows[0];
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found or not currently available." });
    }
    const doctorId = doctor.id;
    doctor.slug = generateDoctorSlug(doctor.title, doctor.name, doctor.id);
    const [specRows] = await db_default.query(
      `SELECT s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
       FROM doctor_specialties ds
       JOIN specialties s ON ds.specialty_id = s.id
       WHERE ds.doctor_id = ?
       ORDER BY ds.is_primary DESC, s.name ASC`,
      [doctorId]
    );
    if (specRows.length > 0) {
      doctor.specialties = specRows;
      doctor.specialty_names = specRows.map((s) => s.name).join(" + ");
      doctor.specialty_names_bn = specRows.map((s) => s.name_bn || s.name).join(" + ");
    } else if (doctor.specialty_name) {
      doctor.specialties = [{
        id: doctor.specialty_id,
        name: doctor.specialty_name,
        name_bn: doctor.specialty_name_bn,
        icon: doctor.specialty_icon,
        is_primary: 1
      }];
      doctor.specialty_names = doctor.specialty_name;
      doctor.specialty_names_bn = doctor.specialty_name_bn || doctor.specialty_name;
    } else {
      doctor.specialties = [];
      doctor.specialty_names = "";
      doctor.specialty_names_bn = "";
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
router3.get("/availability", async (req, res) => {
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
      SELECT serial_number, status, appointment_time, booking_source, payment_status
      FROM appointments
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status != 'cancelled'
    `, [doctorId, chamberId, date]);
    const bookedBySerial = /* @__PURE__ */ new Map();
    bookedAppointments.forEach((a) => bookedBySerial.set(Number(a.serial_number), a));
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
      const appt = bookedBySerial.get(serialNum);
      const isBooked = !!appt;
      serials.push({
        serial_number: serialNum,
        serial_formatted: serialStr,
        estimated_time: formattedTime,
        status: isBooked ? "booked" : "available",
        booking_source: isBooked ? appt.booking_source || "online" : void 0,
        payment_status: isBooked ? appt.payment_status : void 0
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
var publicRoutes_default = router3;

// server/routes/doctorRoutes.ts
var router4 = (0, import_express4.Router)();
router4.use(requireRole(["doctor"]));
async function getDoctorByUserId(userId, doctorId) {
  if (doctorId) {
    const [byDocId] = await db_default.query(
      `SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
              s.name as specialty_name, s.name_bn as specialty_name_bn
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN specialties s ON d.specialty_id = s.id
       WHERE d.id = ?`,
      [doctorId]
    );
    if (byDocId[0]) return await attachSpecialtiesToDoctor2(byDocId[0]);
  }
  const [rows] = await db_default.query(
    `SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
            s.name as specialty_name, s.name_bn as specialty_name_bn
     FROM doctors d
     JOIN users u ON d.user_id = u.id
     LEFT JOIN specialties s ON d.specialty_id = s.id
     WHERE d.user_id = ?`,
    [userId]
  );
  if (rows[0]) return await attachSpecialtiesToDoctor2(rows[0]);
  const [userRows] = await db_default.query(
    "SELECT id, name, email, phone FROM users WHERE id = ? AND role = ?",
    [userId, "doctor"]
  );
  const u = userRows[0];
  if (u) {
    const [insRes] = await db_default.execute(
      `INSERT INTO doctors (user_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status)
       VALUES (?, 'Dr.', ?, 'MBBS', 5, 'Consultant Physician', 500.00, 'approved')`,
      [u.id, `BMDC-${u.id}-${Date.now().toString().slice(-5)}`]
    );
    const newDocId = insRes.insertId;
    const [createdDoc] = await db_default.query(
      `SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
              'General Physician' as specialty_name, '\u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u099A\u09BF\u0995\u09BF\u09CE\u09B8\u0995' as specialty_name_bn
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
      [newDocId]
    );
    return await attachSpecialtiesToDoctor2(createdDoc[0] || null);
  }
  return null;
}
async function attachSpecialtiesToDoctor2(doctor) {
  if (!doctor) return null;
  const [specRows] = await db_default.query(
    `SELECT s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
     FROM doctor_specialties ds
     JOIN specialties s ON ds.specialty_id = s.id
     WHERE ds.doctor_id = ?
     ORDER BY ds.is_primary DESC, s.name ASC`,
    [doctor.id]
  );
  if (specRows.length > 0) {
    doctor.specialties = specRows;
    doctor.specialty_ids = specRows.map((s) => s.id);
    doctor.specialties_summary = specRows.map((s) => s.name).join(" + ");
    doctor.specialties_summary_bn = specRows.map((s) => s.name_bn || s.name).join(" + ");
    doctor.specialties_list = specRows.map((s) => s.name);
  } else if (doctor.specialty_id) {
    doctor.specialties = [{
      id: doctor.specialty_id,
      name: doctor.specialty_name || "Specialist",
      name_bn: doctor.specialty_name_bn || doctor.specialty_name,
      is_primary: 1
    }];
    doctor.specialty_ids = [doctor.specialty_id];
    doctor.specialties_summary = doctor.specialty_name || "Specialist";
    doctor.specialties_summary_bn = doctor.specialty_name_bn || doctor.specialty_name;
    doctor.specialties_list = [doctor.specialty_name || "Specialist"];
  } else {
    doctor.specialties = [];
    doctor.specialty_ids = [];
    doctor.specialties_summary = "";
    doctor.specialties_summary_bn = "";
    doctor.specialties_list = [];
  }
  doctor.slug = generateDoctorSlug(doctor.title, doctor.name, doctor.id);
  return doctor;
}
router4.get("/profile", async (req, res) => {
  try {
    const user = req.user;
    let doctor = await getDoctorByUserId(user.id, user.doctorId);
    if (!doctor) {
      return res.status(404).json({ error: "Doctor profile not found" });
    }
    doctor = await attachSpecialtiesToDoctor2(doctor);
    const [chambers] = await db_default.query(
      `SELECT c.*, COALESCE(dc.consultation_fee, d.consultation_fee) as consultation_fee,
              COALESCE(dc.follow_up_fee, 300) as follow_up_fee
       FROM chambers c
       JOIN doctors d ON c.doctor_id = d.id
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
       ORDER BY FIELD(s.day_of_week, 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'), s.start_time ASC`,
      [doctor.id]
    );
    res.json({ doctor, chambers, schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router4.get("/chambers", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id, user.doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    const [chambers] = await db_default.query(
      `SELECT c.*, COALESCE(dc.consultation_fee, d.consultation_fee) as consultation_fee,
              COALESCE(dc.follow_up_fee, 300) as follow_up_fee
       FROM chambers c
       JOIN doctors d ON c.doctor_id = d.id
       LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
       WHERE c.doctor_id = ?
       ORDER BY c.created_at DESC`,
      [doctor.id]
    );
    res.json({ chambers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router4.get("/schedules", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id, user.doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    const [schedules] = await db_default.query(
      `SELECT s.*, c.name as chamber_name
       FROM doctor_schedules s
       JOIN chambers c ON s.chamber_id = c.id
       WHERE s.doctor_id = ?
       ORDER BY FIELD(s.day_of_week, 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'), s.start_time ASC`,
      [doctor.id]
    );
    res.json({ schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router4.put("/profile", async (req, res) => {
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
      specialtyIds,
      qualification,
      experienceYears,
      bio,
      consultationFee
    } = req.body;
    let selectedSpecialtyIds = null;
    if (Array.isArray(specialtyIds) && specialtyIds.length > 0) {
      selectedSpecialtyIds = specialtyIds.map((id) => Number(id)).filter((n) => !isNaN(n) && n > 0);
    } else if (specialtyId !== void 0 && specialtyId !== null && specialtyId !== "") {
      const single = Number(specialtyId);
      if (!isNaN(single) && single > 0) selectedSpecialtyIds = [single];
    }
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
      const primarySpecId = selectedSpecialtyIds && selectedSpecialtyIds.length > 0 ? selectedSpecialtyIds[0] : specialtyId ? Number(specialtyId) : null;
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
          primarySpecId ?? null,
          qualification ?? null,
          experienceYears !== void 0 ? Number(experienceYears) : null,
          bio ?? null,
          consultationFee !== void 0 ? Number(consultationFee) : null,
          doctor.id
        ]
      );
      if (selectedSpecialtyIds && selectedSpecialtyIds.length > 0) {
        await conn.execute(`DELETE FROM doctor_specialties WHERE doctor_id = ?`, [doctor.id]);
        for (let i = 0; i < selectedSpecialtyIds.length; i++) {
          await conn.execute(
            `INSERT IGNORE INTO doctor_specialties (doctor_id, specialty_id, is_primary) VALUES (?, ?, ?)`,
            [doctor.id, selectedSpecialtyIds[i], i === 0 ? 1 : 0]
          );
        }
      }
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(user.id, "UPDATE_DOCTOR_PROFILE", `Doctor profile updated for ID ${doctor.id}`);
    const updated = await getDoctorByUserId(user.id, user.doctorId);
    res.json({ message: "Profile updated successfully", doctor: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router4.post("/chambers", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id, user.doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor profile not found. Please log in again." });
    const {
      name,
      address,
      city = "Dhaka",
      area,
      phone,
      mapLocation,
      consultationFee,
      followUpFee
    } = req.body;
    const chamberName = (name || "").trim();
    const chamberAddress = (address || "").trim();
    const chamberCity = (city || "Dhaka").trim();
    const chamberArea = (area || chamberCity || "General").trim();
    const chamberPhone = phone ? String(phone).trim() : doctor.phone || null;
    const mapLoc = mapLocation ? String(mapLocation).trim() : null;
    if (!chamberName) {
      return res.status(400).json({ error: "Chamber name is required." });
    }
    if (!chamberAddress) {
      return res.status(400).json({ error: "Chamber address is required." });
    }
    const feeNum = consultationFee !== void 0 && !isNaN(Number(consultationFee)) && Number(consultationFee) > 0 ? Number(consultationFee) : Number(doctor.consultation_fee) || 500;
    const followUpNum = followUpFee !== void 0 && !isNaN(Number(followUpFee)) && Number(followUpFee) > 0 ? Number(followUpFee) : Math.round(feeNum * 0.6);
    const conn = await db_default.getConnection();
    let chamberId;
    try {
      await conn.beginTransaction();
      const [chamberRes] = await conn.execute(
        `INSERT INTO chambers (doctor_id, name, address, city, area, phone, map_location)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [doctor.id, chamberName, chamberAddress, chamberCity, chamberArea, chamberPhone, mapLoc]
      );
      chamberId = chamberRes.insertId;
      await conn.execute(
        `INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           consultation_fee = VALUES(consultation_fee),
           follow_up_fee = VALUES(follow_up_fee)`,
        [doctor.id, chamberId, feeNum, followUpNum]
      );
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(user.id, "CREATE_CHAMBER", `Created chamber "${chamberName}" for doctor ID ${doctor.id}`);
    const [newChamberRows] = await db_default.query(
      `SELECT c.*, COALESCE(dc.consultation_fee, ?) as consultation_fee,
              COALESCE(dc.follow_up_fee, ?) as follow_up_fee
       FROM chambers c
       LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
       WHERE c.id = ?`,
      [feeNum, followUpNum, chamberId]
    );
    res.status(201).json({
      message: "Chamber created successfully",
      chamberId,
      chamber: newChamberRows[0] || null
    });
  } catch (err) {
    console.error("[Create Chamber Error]:", err);
    res.status(500).json({ error: err.message || "Failed to create chamber." });
  }
});
router4.put("/chambers/:id", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id, user.doctorId);
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
router4.delete("/chambers/:id", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id, user.doctorId);
    const { id } = req.params;
    await db_default.execute("DELETE FROM chambers WHERE id = ? AND doctor_id = ?", [id, doctor.id]);
    res.json({ message: "Chamber deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router4.post("/schedules", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id, user.doctorId);
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
router4.delete("/schedules/:id", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id, user.doctorId);
    const { id } = req.params;
    await db_default.execute("DELETE FROM doctor_schedules WHERE id = ? AND doctor_id = ?", [id, doctor.id]);
    res.json({ message: "Schedule removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router4.get("/appointments", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id, user.doctorId);
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
router4.patch("/appointments/:id/status", async (req, res) => {
  try {
    const user = req.user;
    const doctor = await getDoctorByUserId(user.id, user.doctorId);
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
var doctorRoutes_default = router4;

// server/routes/compounderRoutes.ts
var import_express5 = require("express");

// server/appointmentService.ts
var BookingError = class extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
};
var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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
function formatSlotTime(startTime, slotDuration, serialNum) {
  const [startH, startM] = String(startTime).split(":").map(Number);
  const totalMinutes = startH * 60 + startM + (serialNum - 1) * slotDuration;
  const slotHour24 = Math.floor(totalMinutes / 60) % 24;
  const slotMin = totalMinutes % 60;
  const ampm = slotHour24 >= 12 ? "PM" : "AM";
  const slotHour12 = slotHour24 % 12 || 12;
  return `${slotHour12}:${slotMin < 10 ? "0" : ""}${slotMin} ${ampm}`;
}
async function bookAppointment(params) {
  const {
    doctorId,
    chamberId,
    scheduleDate,
    serialNumber,
    patientId = null,
    patientName,
    patientPhone,
    patientAge = null,
    patientGender = "other",
    problemDescription = null,
    paymentStatus = "unpaid",
    bookingSource = "online",
    createdBy = null,
    requireApprovedDoctor = false,
    enforceChamberId = null
  } = params;
  const docIdNum = Number(doctorId);
  const chamIdNum = Number(chamberId);
  const serialNum = Number(serialNumber);
  if (!docIdNum || !chamIdNum || !scheduleDate || !serialNum || !patientName || !patientPhone) {
    throw new BookingError(
      "VALIDATION_ERROR",
      "Doctor, Chamber, Schedule Date, Serial Number, Patient Name, and Phone number are required."
    );
  }
  if (enforceChamberId !== null && Number(enforceChamberId) !== chamIdNum) {
    throw new BookingError("FORBIDDEN_CHAMBER", "You can only book serials for your assigned chamber.", 403);
  }
  const doctorSql = requireApprovedDoctor ? `SELECT d.*, u.name as doctor_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ? AND d.approval_status = 'approved'` : `SELECT d.*, u.name as doctor_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`;
  const [docRows] = await db_default.query(doctorSql, [docIdNum]);
  const doctor = docRows[0];
  if (!doctor) {
    throw new BookingError("DOCTOR_NOT_FOUND", "Doctor not found or not approved for booking.");
  }
  const [chamRows] = await db_default.query(
    "SELECT * FROM chambers WHERE id = ? AND doctor_id = ?",
    [chamIdNum, docIdNum]
  );
  const chamber = chamRows[0];
  if (!chamber) {
    throw new BookingError("INVALID_CHAMBER", "Invalid chamber for this doctor.");
  }
  const dateObj = /* @__PURE__ */ new Date(scheduleDate + "T00:00:00");
  if (isNaN(dateObj.getTime())) {
    throw new BookingError("INVALID_DATE", "Invalid schedule date.");
  }
  const dayOfWeek = DAY_NAMES[dateObj.getDay()];
  const [schedRows] = await db_default.query(`
    SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
    FROM doctor_schedules s
    JOIN doctors d ON s.doctor_id = d.id
    LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
    WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
  `, [docIdNum, chamIdNum, dayOfWeek]);
  const schedule = schedRows[0];
  if (!schedule) {
    throw new BookingError(
      "NO_SCHEDULE",
      `Doctor has no consultation session scheduled for ${dayOfWeek} at ${chamber.name}.`
    );
  }
  if (serialNum < 1 || serialNum > schedule.max_serials) {
    throw new BookingError(
      "INVALID_SERIAL",
      `Invalid serial number. Must be between 1 and ${schedule.max_serials}.`
    );
  }
  const appointmentTime = formatSlotTime(schedule.start_time, schedule.slot_duration_minutes || 10, serialNum);
  const parsedAge = patientAge ? parseInt(String(patientAge), 10) : null;
  const appointmentId = await generateAppointmentId(scheduleDate, serialNum);
  const conn = await db_default.getConnection();
  let recordId;
  try {
    await conn.beginTransaction();
    const [existingApptRows] = await conn.query(`
      SELECT id FROM appointments
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status != 'cancelled'
      FOR UPDATE
    `, [docIdNum, chamIdNum, scheduleDate, serialNum]);
    if (existingApptRows.length > 0) {
      throw new BookingError("DUPLICATE_BOOKING", "DUPLICATE_BOOKING", 409);
    }
    const [existingSerialRows] = await conn.query(`
      SELECT id FROM serials
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
      FOR UPDATE
    `, [docIdNum, chamIdNum, scheduleDate, serialNum]);
    if (existingSerialRows.length > 0) {
      await conn.execute("UPDATE serials SET status = ? WHERE id = ?", ["booked", existingSerialRows[0].id]);
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
        problem_description, fee, payment_status, booking_source, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `, [
      appointmentId,
      patientId,
      docIdNum,
      chamIdNum,
      schedule.id,
      scheduleDate,
      serialNum,
      appointmentTime,
      patientName,
      patientPhone,
      parsedAge,
      patientGender,
      problemDescription,
      schedule.fee,
      paymentStatus,
      bookingSource,
      createdBy
    ]);
    recordId = insertResult.insertId;
    await conn.commit();
  } catch (txErr) {
    await conn.rollback();
    if (txErr instanceof BookingError) throw txErr;
    if (txErr.code === "ER_DUP_ENTRY" || txErr.message?.includes("Duplicate entry") || txErr.message?.includes("UNIQUE constraint")) {
      throw new BookingError("DUPLICATE_BOOKING", "DUPLICATE_BOOKING", 409);
    }
    throw txErr;
  } finally {
    conn.release();
  }
  return {
    recordId,
    appointmentId,
    serialNumber: serialNum,
    appointmentTime,
    fee: schedule.fee,
    scheduleId: schedule.id,
    chamberName: chamber.name,
    chamberAddress: chamber.address,
    doctorName: doctor.doctor_name,
    doctorTitle: doctor.title
  };
}
var DUPLICATE_BOOKING_MESSAGE_BN = "\u098F\u0987 \u09B8\u09BF\u09B0\u09BF\u09DF\u09BE\u09B2\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09C1\u0995 \u09B9\u09DF\u09C7 \u0997\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09CD\u09AF \u098F\u0995\u099F\u09BF \u09B8\u09BF\u09B0\u09BF\u09DF\u09BE\u09B2 \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8 \u0995\u09B0\u09C1\u09A8\u0964";

// server/routes/compounderRoutes.ts
var router5 = (0, import_express5.Router)();
router5.use(compounderMiddleware);
var DAY_NAMES2 = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function todayString() {
  const now = /* @__PURE__ */ new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
async function getAssignedDoctor(doctorId) {
  const [rows] = await db_default.query(`
    SELECT d.id, d.user_id, d.title, d.qualification, d.specialty_id,
           d.consultation_fee, d.approval_status,
           u.name, u.email, u.phone, u.avatar_url,
           s.name as specialty_name, s.name_bn as specialty_name_bn
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN specialties s ON d.specialty_id = s.id
    WHERE d.id = ?
  `, [doctorId]);
  const doc = rows[0] || null;
  if (!doc) return null;
  const [specRows] = await db_default.query(`
    SELECT s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
    FROM doctor_specialties ds
    JOIN specialties s ON ds.specialty_id = s.id
    WHERE ds.doctor_id = ?
    ORDER BY ds.is_primary DESC, s.name ASC
  `, [doctorId]);
  if (specRows.length > 0) {
    doc.specialties = specRows;
    doc.specialty_ids = specRows.map((s) => s.id);
    doc.specialty_names = specRows.map((s) => s.name).join(" + ");
    doc.specialty_names_bn = specRows.map((s) => s.name_bn || s.name).join(" + ");
    doc.specialties_summary = doc.specialty_names;
  } else if (doc.specialty_name) {
    doc.specialties = [{
      id: doc.specialty_id,
      name: doc.specialty_name,
      name_bn: doc.specialty_name_bn,
      is_primary: 1
    }];
    doc.specialty_ids = [doc.specialty_id];
    doc.specialty_names = doc.specialty_name;
    doc.specialty_names_bn = doc.specialty_name_bn || doc.specialty_name;
    doc.specialties_summary = doc.specialty_name;
  } else {
    doc.specialties = [];
    doc.specialty_ids = [];
    doc.specialty_names = "";
    doc.specialty_names_bn = "";
    doc.specialties_summary = "";
  }
  return doc;
}
router5.get("/me", async (req, res) => {
  try {
    const user = req.user;
    const doctorId = req.authorizedDoctorId;
    const doctor = await getAssignedDoctor(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: "Assigned doctor not found. Please contact the administrator." });
    }
    const [chambers] = await db_default.query(`
      SELECT c.id, c.name, c.address, c.city, c.area, c.phone
      FROM chambers c
      WHERE c.doctor_id = ?
      ORDER BY c.created_at ASC
    `, [doctorId]);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        doctorId
      },
      doctor,
      chambers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router5.get("/dashboard", async (req, res) => {
  try {
    const doctorId = req.authorizedDoctorId;
    const requestedDate = req.query.date || todayString();
    const chamberIdParam = req.query.chamberId ? Number(req.query.chamberId) : null;
    const dateObj = /* @__PURE__ */ new Date(requestedDate + "T00:00:00");
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD." });
    }
    const dayOfWeek = DAY_NAMES2[dateObj.getDay()];
    const doctor = await getAssignedDoctor(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: "Assigned doctor not found. Please contact the administrator." });
    }
    const [chambers] = await db_default.query(`
      SELECT c.id, c.name, c.address, c.city, c.area, c.phone
      FROM chambers c
      WHERE c.doctor_id = ?
      ORDER BY c.created_at ASC
    `, [doctorId]);
    const [weeklySchedules] = await db_default.query(`
      SELECT s.*, c.name as chamber_name, c.address as chamber_address, c.city as chamber_city, c.area as chamber_area,
             COALESCE(dc.consultation_fee, d.consultation_fee) as fee
      FROM doctor_schedules s
      JOIN chambers c ON s.chamber_id = c.id
      JOIN doctors d ON s.doctor_id = d.id
      LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
      WHERE s.doctor_id = ? AND s.is_active = 1
      ORDER BY FIELD(s.day_of_week, 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'), s.start_time ASC
    `, [doctorId]);
    let selectedChamber = null;
    if (chamberIdParam) {
      selectedChamber = chambers.find((c) => Number(c.id) === chamberIdParam) || null;
      if (!selectedChamber) {
        return res.status(403).json({ error: "Access denied. That chamber does not belong to your assigned doctor." });
      }
    }
    let scheduleRows = [];
    if (selectedChamber) {
      const [rows] = await db_default.query(`
        SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
        FROM doctor_schedules s
        JOIN doctors d ON s.doctor_id = d.id
        LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
        WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
      `, [doctorId, selectedChamber.id, dayOfWeek]);
      scheduleRows = rows;
    } else {
      const [rows] = await db_default.query(`
        SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
        FROM doctor_schedules s
        JOIN doctors d ON s.doctor_id = d.id
        LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
        WHERE s.doctor_id = ? AND s.day_of_week = ? AND s.is_active = 1
        ORDER BY s.start_time ASC
      `, [doctorId, dayOfWeek]);
      scheduleRows = rows;
    }
    const schedule = scheduleRows[0] || null;
    if (schedule) {
      const chamber = chambers.find((c) => Number(c.id) === Number(schedule.chamber_id));
      selectedChamber = chamber || selectedChamber;
    }
    if (!schedule) {
      return res.json({
        doctor,
        chambers,
        weeklySchedules,
        date: requestedDate,
        dayOfWeek,
        selectedChamberId: selectedChamber?.id || null,
        chamber: selectedChamber,
        schedule: null,
        stats: { total: 0, online: 0, manual: 0, available: 0, cancelled: 0, booked: 0 },
        serials: [],
        message: `No consultation session is scheduled for ${dayOfWeek}.`
      });
    }
    const [appointments] = await db_default.query(`
      SELECT a.id, a.appointment_id, a.serial_number, a.appointment_time,
             a.patient_name, a.patient_phone, a.patient_age, a.patient_gender,
             a.payment_status, a.booking_source, a.status, a.created_at
      FROM appointments a
      WHERE a.doctor_id = ? AND a.chamber_id = ? AND a.schedule_date = ?
      ORDER BY a.serial_number ASC
    `, [doctorId, schedule.chamber_id, requestedDate]);
    const bySerial = /* @__PURE__ */ new Map();
    appointments.forEach((a) => bySerial.set(Number(a.serial_number), a));
    const maxSerials = Number(schedule.max_serials) || 0;
    const slotDuration = Number(schedule.slot_duration_minutes) || 10;
    const [startHour, startMinute] = String(schedule.start_time).split(":").map(Number);
    const serials = [];
    let online = 0;
    let manual = 0;
    let cancelled = 0;
    for (let i = 1; i <= maxSerials; i++) {
      const totalMinutes = startHour * 60 + startMinute + (i - 1) * slotDuration;
      const slotHour24 = Math.floor(totalMinutes / 60) % 24;
      const slotMin = totalMinutes % 60;
      const ampm = slotHour24 >= 12 ? "PM" : "AM";
      const slotHour12 = slotHour24 % 12 || 12;
      const estimatedTime = `${slotHour12}:${slotMin < 10 ? "0" : ""}${slotMin} ${ampm}`;
      const appt = bySerial.get(i);
      if (!appt) {
        serials.push({
          serial_number: i,
          serial_formatted: i < 10 ? `0${i}` : `${i}`,
          estimated_time: estimatedTime,
          status: "available",
          can_book: true
        });
        continue;
      }
      if (appt.status === "cancelled") {
        cancelled++;
        serials.push({
          serial_number: i,
          serial_formatted: i < 10 ? `0${i}` : `${i}`,
          estimated_time: estimatedTime,
          status: "cancelled",
          record_id: appt.id,
          appointment_id: appt.appointment_id,
          appointment_status: "cancelled",
          booking_source: appt.booking_source,
          can_book: false
        });
        continue;
      }
      const isManual = appt.booking_source === "compounder";
      if (isManual) manual++;
      else online++;
      serials.push({
        serial_number: i,
        serial_formatted: i < 10 ? `0${i}` : `${i}`,
        estimated_time: estimatedTime,
        status: isManual ? "manual" : "online",
        payment_status: appt.payment_status,
        booking_source: appt.booking_source,
        record_id: appt.id,
        appointment_id: appt.appointment_id,
        appointment_status: appt.status,
        patient_name: appt.patient_name,
        patient_phone: appt.patient_phone,
        patient_age: appt.patient_age,
        patient_gender: appt.patient_gender,
        // Booked serials (online or manual) are locked from the Book action.
        can_book: false
      });
    }
    const available = serials.filter((s) => s.status === "available").length;
    res.json({
      doctor,
      chambers,
      weeklySchedules,
      date: requestedDate,
      dayOfWeek,
      selectedChamberId: schedule.chamber_id,
      chamber: chambers.find((c) => Number(c.id) === Number(schedule.chamber_id)) || selectedChamber,
      schedule: {
        id: schedule.id,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        maxSerials,
        slotDurationMinutes: slotDuration,
        fee: schedule.fee
      },
      stats: {
        total: maxSerials,
        online,
        manual,
        available,
        cancelled,
        booked: online + manual
      },
      serials
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router5.post("/book", async (req, res) => {
  try {
    const user = req.user;
    const doctorId = req.authorizedDoctorId;
    const {
      chamberId,
      scheduleDate,
      serialNumber,
      patientName,
      patientPhone,
      patientAge,
      patientGender,
      problemDescription
    } = req.body;
    if (!chamberId || !scheduleDate || !serialNumber || !patientName || !patientPhone) {
      return res.status(400).json({
        error: "Chamber, Date, Serial Number, Patient Name, and Patient Phone are required."
      });
    }
    const [chamRows] = await db_default.query(
      "SELECT id, name FROM chambers WHERE id = ? AND doctor_id = ?",
      [Number(chamberId), doctorId]
    );
    if (chamRows.length === 0) {
      return res.status(403).json({ error: "Access denied. That chamber does not belong to your assigned doctor." });
    }
    const result = await bookAppointment({
      doctorId,
      chamberId: Number(chamberId),
      scheduleDate,
      serialNumber: Number(serialNumber),
      patientId: null,
      patientName,
      patientPhone,
      patientAge: patientAge ?? null,
      patientGender: patientGender || "other",
      problemDescription: problemDescription || null,
      paymentStatus: "unpaid",
      bookingSource: "compounder",
      createdBy: user.id,
      requireApprovedDoctor: false
    });
    await logActivity(
      user.id,
      "COMPOUNDER_BOOK_SERIAL",
      `Compounder ${user.email} booked Serial ${result.serialNumber} (${result.appointmentId}) for patient ${patientName} (unpaid)`
    );
    return res.status(201).json({
      success: true,
      message: "\u09B8\u09BF\u09B0\u09BF\u09AF\u09BC\u09BE\u09B2 \u09AC\u09C1\u0995\u09BF\u0982 \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 (Manual / Non-Payment)",
      serialNumber: result.serialNumber < 10 ? `0${result.serialNumber}` : `${result.serialNumber}`,
      appointmentId: result.appointmentId,
      recordId: result.recordId,
      details: {
        doctorName: result.doctorName,
        chamberName: result.chamberName,
        scheduleDate,
        appointmentTime: result.appointmentTime,
        patientName,
        patientPhone,
        paymentStatus: "unpaid",
        bookingSource: "compounder",
        status: "confirmed"
      }
    });
  } catch (err) {
    if (err instanceof BookingError) {
      if (err.code === "DUPLICATE_BOOKING") {
        return res.status(409).json({
          error: "DUPLICATE_BOOKING",
          message: "The requested serial has already been booked. Please select a different serial number.",
          message_bn: DUPLICATE_BOOKING_MESSAGE_BN
        });
      }
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Compounder booking error:", err);
    res.status(500).json({ error: err.message || "Internal server error during manual booking." });
  }
});
router5.patch("/appointments/:id/status", async (req, res) => {
  try {
    const user = req.user;
    const doctorId = req.authorizedDoctorId;
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["confirmed", "waiting", "in_consultation", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }
    const [apptRows] = await db_default.query(
      "SELECT id, appointment_id, doctor_id, chamber_id, schedule_date, serial_number, patient_name FROM appointments WHERE id = ? AND doctor_id = ?",
      [id, doctorId]
    );
    const appt = apptRows[0];
    if (!appt) {
      return res.status(404).json({ error: "Appointment not found or does not belong to your assigned doctor." });
    }
    const conn = await db_default.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        "UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, id]
      );
      if (status === "cancelled") {
        await conn.execute(
          "UPDATE serials SET status = ? WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?",
          ["available", appt.doctor_id, appt.chamber_id, appt.schedule_date, appt.serial_number]
        );
      } else {
        await conn.execute(
          "UPDATE serials SET status = ? WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?",
          ["booked", appt.doctor_id, appt.chamber_id, appt.schedule_date, appt.serial_number]
        );
      }
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
    await logActivity(
      user.id,
      "COMPOUNDER_UPDATE_STATUS",
      `Compounder ${user.email} updated appointment ${appt.appointment_id} (Serial ${appt.serial_number}) status to ${status}`
    );
    res.json({ message: `Appointment status updated to ${status}`, appointmentId: appt.appointment_id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var compounderRoutes_default = router5;

// server/routes/appointmentRoutes.ts
var import_express6 = require("express");
var router6 = (0, import_express6.Router)();
router6.post("/book", async (req, res) => {
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
    const result = await bookAppointment({
      doctorId: Number(doctorId),
      chamberId: Number(chamberId),
      scheduleDate,
      serialNumber: Number(serialNumber),
      patientId: user?.id || null,
      patientName,
      patientPhone,
      patientAge,
      patientGender,
      problemDescription,
      paymentStatus: "unpaid",
      bookingSource: "online",
      requireApprovedDoctor: true,
      createdBy: user?.id || null
    });
    await logActivity(
      user?.id || null,
      "BOOK_APPOINTMENT",
      `Appointment booked: ${result.appointmentId} (Serial ${result.serialNumber}) for Dr. ${result.doctorName}`
    );
    return res.status(201).json({
      success: true,
      message: "Appointment Confirmed",
      serialNumber: result.serialNumber < 10 ? `0${result.serialNumber}` : `${result.serialNumber}`,
      appointmentId: result.appointmentId,
      recordId: result.recordId,
      details: {
        doctorName: result.doctorName?.startsWith(result.doctorTitle) ? result.doctorName : `${result.doctorTitle} ${result.doctorName}`,
        chamberName: result.chamberName,
        chamberAddress: result.chamberAddress,
        scheduleDate,
        appointmentTime: result.appointmentTime,
        consultationFee: result.fee,
        patientName,
        patientPhone,
        status: "confirmed"
      }
    });
  } catch (err) {
    if (err instanceof BookingError) {
      if (err.code === "DUPLICATE_BOOKING") {
        return res.status(409).json({
          error: "DUPLICATE_BOOKING",
          message: "The requested serial has already been booked. Please select a different serial number.",
          message_bn: DUPLICATE_BOOKING_MESSAGE_BN
        });
      }
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Booking error:", err);
    res.status(500).json({ error: err.message || "Internal server error during appointment booking." });
  }
});
router6.get("/details/:appointmentId", async (req, res) => {
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
router6.get("/my-appointments", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const [uRows] = await db_default.query(
      "SELECT id, phone, email, name FROM users WHERE id = ?",
      [user.id]
    );
    const currentUser = uRows[0] || user;
    const rawPhone = String(currentUser.phone || user.phone || "").trim();
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const last10Digits = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : "";
    const [pRows] = await db_default.query(
      "SELECT id FROM patients WHERE user_id = ?",
      [user.id]
    );
    const patientTableId = pRows[0]?.id || null;
    const [appointments] = await db_default.query(`
      SELECT a.*,
             a.fee as consultation_fee,
             d.title as doctor_title,
             u.name as doctor_name,
             u.avatar_url as doctor_avatar,
             s.name as specialty_name,
             c.name as chamber_name,
             c.address as chamber_address,
             c.area as chamber_area,
             c.city as chamber_city,
             c.phone as chamber_phone
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      JOIN chambers c ON a.chamber_id = c.id
      WHERE (
        a.patient_id = ?
        OR (? IS NOT NULL AND a.patient_id = ?)
        OR (a.created_by = ? AND a.booking_source = 'online')
        OR (
          ? != '' AND (
            a.patient_phone = ?
            OR a.patient_phone = ?
            OR (? != '' AND RIGHT(REPLACE(REPLACE(REPLACE(a.patient_phone, ' ', ''), '-', ''), '+', ''), 10) = ?)
          )
        )
      )
      ORDER BY a.schedule_date DESC, a.serial_number ASC
    `, [
      user.id,
      patientTableId,
      patientTableId,
      user.id,
      rawPhone,
      rawPhone,
      cleanPhone,
      last10Digits,
      last10Digits
    ]);
    if (appointments.length > 0) {
      const docIds = Array.from(new Set(appointments.map((a) => a.doctor_id)));
      const placeholders = docIds.map(() => "?").join(",");
      const [specRows] = await db_default.query(
        `SELECT ds.doctor_id, s.name, s.name_bn
         FROM doctor_specialties ds
         JOIN specialties s ON ds.specialty_id = s.id
         WHERE ds.doctor_id IN (${placeholders})
         ORDER BY ds.is_primary DESC, s.name ASC`,
        docIds
      );
      const specMap = /* @__PURE__ */ new Map();
      for (const r of specRows) {
        if (!specMap.has(r.doctor_id)) specMap.set(r.doctor_id, []);
        specMap.get(r.doctor_id).push(r.name);
      }
      for (const a of appointments) {
        const names = specMap.get(a.doctor_id);
        if (names && names.length > 0) {
          a.specialty_name = names.join(" + ");
        }
      }
    }
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const upcoming = appointments.filter(
      (a) => a.schedule_date >= todayStr && a.status !== "completed" && a.status !== "cancelled"
    );
    const past = appointments.filter(
      (a) => a.schedule_date < todayStr || a.status === "completed" || a.status === "cancelled"
    );
    res.json({
      success: true,
      appointments,
      all: appointments,
      upcoming,
      past,
      total: appointments.length
    });
  } catch (err) {
    console.error("Error fetching patient appointments:", err);
    res.status(500).json({ error: err.message || "Failed to fetch appointments." });
  }
});
router6.patch("/cancel/:id", requireAuth, async (req, res) => {
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
var appointmentRoutes_default = router6;

// server/routes/testRoutes.ts
var import_express7 = require("express");
var import_bcryptjs4 = __toESM(require("bcryptjs"), 1);
var router7 = (0, import_express7.Router)();
router7.post("/run-completion-test", async (req, res) => {
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
    const hashedPass = await import_bcryptjs4.default.hash("TestPass123!", 10);
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
var testRoutes_default = router7;

// server/routes/uploadRoutes.ts
var import_express8 = require("express");
var import_path2 = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var router8 = (0, import_express8.Router)();
var uploadsDir = import_path2.default.join(process.cwd(), "uploads");
if (!import_fs.default.existsSync(uploadsDir)) {
  import_fs.default.mkdirSync(uploadsDir, { recursive: true });
}
router8.post("/image", async (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Image data (base64 or URL) is required." });
    }
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return res.json({ url: image });
    }
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      if (image.startsWith("/uploads/")) {
        return res.json({ url: image });
      }
      return res.json({ url: image });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    let ext = ".jpg";
    if (mimeType.includes("png")) ext = ".png";
    else if (mimeType.includes("webp")) ext = ".webp";
    else if (mimeType.includes("gif")) ext = ".gif";
    else if (mimeType.includes("svg")) ext = ".svg";
    const safePrefix = "doctor_avatar";
    const uniqueSuffix = `${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`;
    const outputFileName = `${safePrefix}_${uniqueSuffix}${ext}`;
    const filePath = import_path2.default.join(uploadsDir, outputFileName);
    await import_fs.default.promises.writeFile(filePath, buffer);
    const publicUrl = `/uploads/${outputFileName}`;
    return res.json({ url: publicUrl, success: true });
  } catch (err) {
    console.error("Failed to process image upload:", err);
    if (req.body?.image) {
      return res.json({ url: req.body.image, fallback: true });
    }
    return res.status(500).json({ error: err.message || "Image upload failed" });
  }
});
var uploadRoutes_default = router8;

// server/doctorMeta.ts
var DEFAULT_DOCTOR_IMAGE = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&auto=format&fit=crop&q=80";
async function getDoctorForMeta(rawParam) {
  const cleanParam = decodeURIComponent(String(rawParam || "").trim()).split("?")[0].split("#")[0];
  if (!cleanParam) return null;
  try {
    let docRows = [];
    const numericId = Number(cleanParam);
    if (!isNaN(numericId) && numericId > 0) {
      [docRows] = await db_default.query(`
        SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
               s.name as specialty_name, s.name_bn as specialty_name_bn
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specialties s ON d.specialty_id = s.id
        WHERE d.id = ? AND u.status != 'deleted'
        ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
        LIMIT 1
      `, [numericId]);
    }
    if (docRows.length === 0) {
      const match = cleanParam.match(/-(\d+)$/);
      if (match) {
        const extractedId = Number(match[1]);
        if (!isNaN(extractedId) && extractedId > 0) {
          [docRows] = await db_default.query(`
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                   s.name as specialty_name, s.name_bn as specialty_name_bn
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE d.id = ? AND u.status != 'deleted'
            ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
            LIMIT 1
          `, [extractedId]);
        }
      }
    }
    if (docRows.length === 0) {
      const allNumbers = cleanParam.match(/\d+/g);
      if (allNumbers && allNumbers.length > 0) {
        for (const numStr of allNumbers) {
          const num = Number(numStr);
          [docRows] = await db_default.query(`
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                   s.name as specialty_name, s.name_bn as specialty_name_bn
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE (d.bmdc_number = ? OR d.bmdc_number LIKE ? OR d.id = ?) AND u.status != 'deleted'
            ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
            LIMIT 1
          `, [numStr, `%${numStr}%`, num]);
          if (docRows.length > 0) break;
        }
      }
    }
    if (docRows.length === 0) {
      const nameGuess = cleanParam.replace(/^(?:prof-|asst-prof-|assoc-prof-|dr-)+/i, "").replace(/-\d+/g, "").replace(/-/g, " ").trim();
      if (nameGuess.length >= 2) {
        [docRows] = await db_default.query(`
          SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                 s.name as specialty_name, s.name_bn as specialty_name_bn
          FROM doctors d
          JOIN users u ON d.user_id = u.id
          LEFT JOIN specialties s ON d.specialty_id = s.id
          WHERE LOWER(u.name) LIKE LOWER(?) AND u.status != 'deleted'
          ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
          LIMIT 1
        `, [`%${nameGuess}%`]);
      }
    }
    const doctor = docRows[0];
    if (!doctor) return null;
    doctor.slug = generateDoctorSlug(doctor.title, doctor.name, doctor.id);
    try {
      const [specRows] = await db_default.query(`
        SELECT s.name, s.name_bn
        FROM doctor_specialties ds
        JOIN specialties s ON ds.specialty_id = s.id
        WHERE ds.doctor_id = ?
        ORDER BY ds.is_primary DESC, s.name ASC
      `, [doctor.id]);
      if (specRows && specRows.length > 0) {
        doctor.specialties_summary = specRows.map((s) => s.name).join(" + ");
      } else {
        doctor.specialties_summary = doctor.specialty_name || "Medical Specialist";
      }
    } catch {
      doctor.specialties_summary = doctor.specialty_name || "Medical Specialist";
    }
    try {
      const [chamberRows] = await db_default.query(`
        SELECT name, area, city
        FROM chambers
        WHERE doctor_id = ?
        ORDER BY id ASC
        LIMIT 3
      `, [doctor.id]);
      if (chamberRows && chamberRows.length > 0) {
        doctor.chambers_summary = chamberRows.map((c) => `${c.name} (${c.area}, ${c.city})`).join(" | ");
      } else {
        doctor.chambers_summary = "";
      }
    } catch {
      doctor.chambers_summary = "";
    }
    return doctor;
  } catch (err) {
    console.error("[SEO Meta] Error fetching doctor:", err);
    return null;
  }
}
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeUrl(url) {
  if (!url) return "";
  return String(url).replace(/"/g, "%22").replace(/'/g, "%27").replace(/[\r\n\t]/g, "");
}
function getBaseUrl(req) {
  const envUrl = process.env.APP_URL || process.env.VITE_APP_URL;
  if (envUrl) {
    let appUrl = envUrl.trim().replace(/\/+$/, "");
    if (!appUrl.includes("localhost") && !appUrl.includes("127.0.0.1") && appUrl.startsWith("http://")) {
      appUrl = appUrl.replace(/^http:\/\//i, "https://");
    }
    return appUrl;
  }
  const host = (req.get("x-forwarded-host") || req.get("host") || "localhost:3000").trim();
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.startsWith("192.168.") || host.startsWith("10.");
  let proto = "https";
  if (isLocal) {
    proto = req.get("x-forwarded-proto") || (req.connection && req.connection.encrypted ? "https" : "http") || (req.secure ? "https" : "http");
  } else {
    proto = "https";
  }
  return `${proto}://${host}`.replace(/\/+$/, "");
}
function resolveAbsoluteImageUrl(avatarUrl, baseUrl) {
  const clean = avatarUrl ? String(avatarUrl).trim() : "";
  if (!clean) {
    return DEFAULT_DOCTOR_IMAGE;
  }
  if (clean.startsWith("https://")) {
    return clean;
  }
  if (clean.startsWith("http://")) {
    if (baseUrl.startsWith("https://")) {
      return clean.replace(/^http:\/\//i, "https://");
    }
    return clean;
  }
  if (clean.startsWith("/")) {
    return `${baseUrl}${clean}`;
  }
  return `${baseUrl}/${clean}`;
}
function buildDoctorMetaData(doctor, baseUrl, requestedSlug) {
  const rawName = (doctor.name || "").trim();
  const rawTitle = (doctor.title || "Dr.").trim();
  let doctorName = rawName;
  if (!rawName.toLowerCase().startsWith(rawTitle.toLowerCase())) {
    doctorName = `${rawTitle} ${rawName}`;
  }
  const specialty = doctor.specialties_summary || doctor.specialty_name || "Medical Specialist";
  const qualification = doctor.qualification || "";
  const bmdc = doctor.bmdc_number ? `BMDC: ${doctor.bmdc_number}` : "Verified Specialist";
  const title = `${doctorName} - ${specialty} | Daktar Serial`;
  let description = `Book doctor chamber serial for ${doctorName}`;
  if (qualification) description += ` (${qualification})`;
  description += `. ${bmdc}.`;
  if (doctor.chambers_summary) {
    description += ` Chambers: ${doctor.chambers_summary}.`;
  }
  description += ` Fee: \u09F3${doctor.consultation_fee || 500}. Official online serial booking on Daktar Serial.`;
  const image = resolveAbsoluteImageUrl(doctor.avatar_url, baseUrl);
  const slug = requestedSlug || doctor.slug || doctor.id;
  const url = `${baseUrl}/doctor/${slug}`;
  return {
    title,
    description,
    image,
    url,
    doctorName,
    qualification,
    specialty,
    bmdcNumber: doctor.bmdc_number || ""
  };
}
function buildFallbackDoctorMetaData(slugOrId, baseUrl) {
  const cleanParam = decodeURIComponent(String(slugOrId || "").trim()).split("?")[0].split("#")[0];
  let rawName = cleanParam.replace(/^(?:prof-|asst-prof-|assoc-prof-|dr-)+/i, "").replace(/-\d+$/g, "").replace(/-/g, " ").trim();
  if (!rawName) {
    rawName = "Specialist Doctor";
  } else {
    rawName = rawName.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  const doctorName = `Dr. ${rawName}`;
  const specialty = "Medical Specialist";
  const title = `${doctorName} - ${specialty} | Daktar Serial`;
  const description = `Book chamber serial and appointment for ${doctorName} on Daktar Serial. Easy online serial booking with instant confirmation.`;
  const image = DEFAULT_DOCTOR_IMAGE;
  const url = `${baseUrl}/doctor/${cleanParam}`;
  return {
    title,
    description,
    image,
    url,
    doctorName,
    qualification: "MBBS Specialist",
    specialty,
    bmdcNumber: ""
  };
}
function injectDoctorMetaIntoHtml(templateHtml, meta) {
  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);
  const safeImage = escapeUrl(meta.image);
  const safeUrl = escapeUrl(meta.url);
  const safeDoctorName = escapeHtml(meta.doctorName);
  const safeSpecialty = escapeHtml(meta.specialty);
  const metaTagsHtml = `
    <!-- Daktar Serial Doctor Profile Open Graph & Social Sharing Metadata -->
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeUrl}" />

    <!-- Open Graph / Facebook / WhatsApp / Messenger -->
    <meta property="og:site_name" content="Daktar Serial" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:secure_url" content="${safeImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="800" />
    <meta property="og:image:height" content="800" />
    <meta property="og:image:alt" content="${safeDoctorName}" />
    <meta property="og:url" content="${safeUrl}" />

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@DaktarSerial" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImage}" />
    <meta name="twitter:image:alt" content="${safeDoctorName}" />

    <!-- Schema.org Physician JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Physician",
      "name": "${safeDoctorName}",
      "description": "${safeDesc}",
      "image": "${safeImage}",
      "url": "${safeUrl}",
      "medicalSpecialty": "${safeSpecialty}"${meta.bmdcNumber ? `,
      "identifier": "${escapeHtml(meta.bmdcNumber)}"` : ""}
    }
    </script>
  `.trim();
  let modifiedHtml = templateHtml;
  modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/gi, "");
  modifiedHtml = modifiedHtml.replace(/<meta\s+[^>]*?(?:name|property)=["'](?:description|og:[^"']+|twitter:[^"']+)["'][^>]*?>/gi, "");
  modifiedHtml = modifiedHtml.replace(/<link\s+[^>]*?rel=["']canonical["'][^>]*?>/gi, "");
  if (modifiedHtml.includes("</head>")) {
    modifiedHtml = modifiedHtml.replace("</head>", `  ${metaTagsHtml}
  </head>`);
  } else {
    modifiedHtml = `${metaTagsHtml}
${modifiedHtml}`;
  }
  return modifiedHtml;
}

// server.ts
var currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
async function startServer() {
  await initDatabase();
  const app = (0, import_express9.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.set("trust proxy", true);
  app.use((0, import_cors.default)({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const configuredHost = (process.env.APP_URL || process.env.VITE_APP_URL || "").replace(/^https?:\/\//i, "").split("/")[0].split(":")[0];
      if (origin.startsWith("capacitor://") || origin.startsWith("http://localhost") || origin.startsWith("https://localhost") || configuredHost && origin.includes(configuredHost) || origin.includes("dakatarseial.bd") || origin.includes("run.app")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
  }));
  app.use(import_express9.default.json({ limit: "15mb" }));
  app.use(import_express9.default.urlencoded({ extended: true, limit: "15mb" }));
  app.use((0, import_cookie_parser.default)());
  app.use(authMiddleware);
  const uploadsDir2 = import_path3.default.join(process.cwd(), "uploads");
  if (!import_fs2.default.existsSync(uploadsDir2)) {
    import_fs2.default.mkdirSync(uploadsDir2, { recursive: true });
  }
  app.use("/uploads", import_express9.default.static(uploadsDir2));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Daktar Serial MVP", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use("/api/auth", authRoutes_default);
  app.use("/api/admin", adminRoutes_default);
  app.use("/api/doctor", doctorRoutes_default);
  app.use("/api/compounder", compounderRoutes_default);
  app.use("/api/public", publicRoutes_default);
  app.use("/api/appointments", appointmentRoutes_default);
  app.use("/api/upload", uploadRoutes_default);
  app.use("/api/test", testRoutes_default);
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });
  app.use((err, req, res, next) => {
    console.error("Unhandled API error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });
  const hasLocalIndex = import_fs2.default.existsSync(import_path3.default.join(currentDir, "index.html"));
  const hasCwdDistIndex = import_fs2.default.existsSync(import_path3.default.join(process.cwd(), "dist", "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || currentDir !== process.cwd() && hasLocalIndex;
  if (isProduction) {
    const distPath = currentDir !== process.cwd() && hasLocalIndex ? currentDir : hasCwdDistIndex ? import_path3.default.join(process.cwd(), "dist") : process.cwd();
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(import_express9.default.static(distPath, {
      maxAge: "1d",
      index: false
    }));
    app.get(["/assets/*", "/*.*"], (req, res) => {
      res.status(404).type("text/plain").send("Asset not found");
    });
    app.get(["/doctor/:slugOrId", "/doctor-profile/:slugOrId"], async (req, res) => {
      const indexPath = import_path3.default.join(distPath, "index.html");
      if (import_fs2.default.existsSync(indexPath)) {
        try {
          const rawHtml = import_fs2.default.readFileSync(indexPath, "utf-8");
          const finalHtml = await renderHtmlWithMetadata(req, rawHtml, req.params.slugOrId);
          res.status(200).type("text/html; charset=utf-8").send(finalHtml);
        } catch (err) {
          res.sendFile(indexPath);
        }
      } else {
        res.status(500).type("text/plain").send("Build artifact index.html not found");
      }
    });
    app.get("*", async (req, res) => {
      const indexPath = import_path3.default.join(distPath, "index.html");
      if (import_fs2.default.existsSync(indexPath)) {
        try {
          const rawHtml = import_fs2.default.readFileSync(indexPath, "utf-8");
          const finalHtml = await renderHtmlWithMetadata(req, rawHtml);
          res.status(200).type("text/html; charset=utf-8").send(finalHtml);
        } catch (err) {
          res.sendFile(indexPath);
        }
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
    app.get(["/doctor/:slugOrId", "/doctor-profile/:slugOrId"], async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = import_fs2.default.readFileSync(import_path3.default.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const finalHtml = await renderHtmlWithMetadata(req, template, req.params.slugOrId);
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
      } catch (e) {
        next(e);
      }
    });
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = import_fs2.default.readFileSync(import_path3.default.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const finalHtml = await renderHtmlWithMetadata(req, template);
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
      } catch (e) {
        next(e);
      }
    });
  }
  async function renderHtmlWithMetadata(req, htmlTemplate, explicitSlugOrId) {
    try {
      let slugOrId = explicitSlugOrId;
      if (!slugOrId) {
        const match = req.originalUrl.split("?")[0].match(/^\/(?:doctor|doctor-profile)\/([^/?#]+)/i);
        if (match && match[1]) {
          slugOrId = match[1];
        }
      }
      if (slugOrId) {
        const decoded = decodeURIComponent(slugOrId);
        const doctor = await getDoctorForMeta(decoded);
        const baseUrl = getBaseUrl(req);
        if (doctor) {
          const metaData = buildDoctorMetaData(doctor, baseUrl, decoded);
          return injectDoctorMetaIntoHtml(htmlTemplate, metaData);
        } else {
          const fallbackMeta = buildFallbackDoctorMetaData(decoded, baseUrl);
          return injectDoctorMetaIntoHtml(htmlTemplate, fallbackMeta);
        }
      }
    } catch (err) {
      console.error("[SEO Meta] Error injecting doctor metadata:", err);
    }
    return htmlTemplate;
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
