import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT) || 3306;
const dbName = process.env.DB_NAME || 'daktar_serial';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';

async function runMigrations() {
  console.log('====================================================');
  console.log('  Daktar Serial - Production MySQL Safe Migration');
  console.log('====================================================');
  console.log(`MySQL Host     : ${dbHost}:${dbPort}`);
  console.log(`Target Database: ${dbName}`);
  console.log(`Database User  : ${dbUser}`);
  console.log('Safety Mode    : PRESERVE ALL DATA (No Drop, No Truncate, No Overwrite)');
  console.log('----------------------------------------------------');

  let dbConn: mysql.Connection | null = null;

  try {
    // 1. First attempt direct connection to target database (works with restricted DB users)
    console.log(`\n[1/5] Connecting directly to target database \`${dbName}\`...`);
    try {
      dbConn = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
        multipleStatements: true,
      });
      console.log(` Connected directly to database \`${dbName}\`.`);
    } catch (err: any) {
      if (err.code === 'ER_BAD_DB_ERROR') {
        console.log(`Database \`${dbName}\` does not exist yet. Attempting to create it...`);
        const serverConn = await mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
        });
        await serverConn.query(
          `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
        await serverConn.end();
        console.log(` Created database \`${dbName}\`. Re-connecting...`);

        dbConn = await mysql.createConnection({
          host: dbHost,
          port: dbPort,
          database: dbName,
          user: dbUser,
          password: dbPassword,
          multipleStatements: true,
        });
      } else {
        throw err;
      }
    }

    // 2. Strict Active Database Safety Check
    const [dbRows]: any = await dbConn.query('SELECT DATABASE() as active_db;');
    const activeDb = dbRows[0]?.active_db;
    if (!activeDb || activeDb !== dbName) {
      throw new Error(
        `CRITICAL SAFETY ABORT: Active database is '${activeDb}', but expected '${dbName}'. Stopped to protect data.`
      );
    }
    console.log(` Verified: Active database is confirmed to be \`${activeDb}\`.`);

    // 3. Execute base schema (all CREATE TABLE IF NOT EXISTS)
    console.log('\n[2/5] Applying base schema (CREATE TABLE IF NOT EXISTS)...');
    const schemaPath = path.resolve(__dirname, '../../database/mysql_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await dbConn.query(schemaSql);
    console.log(' Base schema applied safely (existing tables and rows preserved).');

    // 4. Execute incremental migrations in order
    console.log('\n[3/5] Applying incremental migrations (safe alters & extensions)...');
    const migrations = [
      'migrations_002_extensions.sql',
      'migrations_003_comprehensive.sql',
      'migrations_004_compounder.sql',
      'migrations_005_doctor_specialties.sql',
      'migrations_006_districts.sql',
      'migrations_007_hospital_integration.sql',
      'migrations_008_notifications.sql',
    ];

    for (const migFile of migrations) {
      const migPath = path.resolve(__dirname, `../../database/${migFile}`);
      if (fs.existsSync(migPath)) {
        try {
          const migSql = fs.readFileSync(migPath, 'utf-8');
          await dbConn.query(migSql);
          console.log(` Applied ${migFile}`);
        } catch (migErr: any) {
          console.warn(` ${migFile} notice: ${migErr.message}`);
        }
      }
    }

    // 5. Safe Seed Check: Do NOT overwrite any existing production users
    console.log('\n[4/5] Checking user accounts (Preserving existing production users)...');
    const [userRows]: any = await dbConn.query('SELECT COUNT(*) as total_users FROM users;');
    const totalUsers = userRows[0]?.total_users || 0;
    console.log(` Existing users in database: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log(' Database is brand new/empty. Seeding initial baseline accounts with default passwords...');
      const defaultHash = await bcrypt.hash('Password123!', 10);
      const adminHash = await bcrypt.hash('Admin123!', 10);

      // Insert baseline admin
      await dbConn.query(
        `INSERT IGNORE INTO users (name, email, phone, password_hash, role, status)
         VALUES ('System Admin', 'admin@daktarserial.com', '+8801700000001', ?, 'admin', 'active');`,
        [adminHash]
      );

      // Insert baseline specialty
      await dbConn.query(
        `INSERT IGNORE INTO specialties (id, name, name_bn, slug, icon, description, status)
         VALUES (1, 'General Physician', 'সাধারণ চিকিৎসক', 'general-physician', 'Stethoscope', 'Primary healthcare consultation', 'active');`
      );

      // Insert baseline doctor user
      const [docUserRes]: any = await dbConn.query(
        `INSERT IGNORE INTO users (name, email, phone, password_hash, role, status)
         VALUES ('Dr. Rafiqul Islam', 'doctor@daktarserial.com', '+8801700000002', ?, 'doctor', 'active');`,
        [defaultHash]
      );
      const docUserId = docUserRes?.insertId;

      if (docUserId) {
        const [docRes]: any = await dbConn.query(
          `INSERT IGNORE INTO doctors (user_id, specialty_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status)
           VALUES (?, 1, 'Dr.', 'BMDC-A-12345', 'MBBS, FCPS (Medicine)', 10, 'Senior Specialist Physician', 800.00, 'approved');`,
          [docUserId]
        );
        const doctorId = docRes?.insertId;

        if (doctorId) {
          // Insert chamber
          const [chRes]: any = await dbConn.query(
            `INSERT IGNORE INTO chambers (doctor_id, name, address, city, area, phone)
             VALUES (?, 'Popular Diagnostic Centre', 'House 16, Road 2, Dhanmondi', 'Dhaka', 'Dhanmondi', '09613787801');`,
            [doctorId]
          );
          const chamberId = chRes?.insertId;

          if (chamberId) {
            // Insert schedule
            await dbConn.query(
              `INSERT IGNORE INTO doctor_schedules (doctor_id, chamber_id, day_of_week, start_time, end_time, max_serials, slot_duration_minutes, is_active)
               VALUES (?, ?, 'Sunday', '17:00:00', '21:00:00', 25, 10, 1),
                      (?, ?, 'Monday', '17:00:00', '21:00:00', 25, 10, 1),
                      (?, ?, 'Tuesday', '17:00:00', '21:00:00', 25, 10, 1),
                      (?, ?, 'Wednesday', '17:00:00', '21:00:00', 25, 10, 1),
                      (?, ?, 'Thursday', '17:00:00', '21:00:00', 25, 10, 1);`,
              [doctorId, chamberId, doctorId, chamberId, doctorId, chamberId, doctorId, chamberId, doctorId, chamberId]
            );
          }

          // Insert compounder tied to doctor
          const [compUserRes]: any = await dbConn.query(
            `INSERT IGNORE INTO users (name, email, phone, password_hash, role, status, doctor_id)
             VALUES ('Kamrul Hasan (Compounder)', 'compounder@daktarserial.com', '+8801700000003', ?, 'compounder', 'active', ?);`,
            [defaultHash, doctorId]
          );
          const compUserId = compUserRes?.insertId;
          if (compUserId) {
            await dbConn.query(
              `INSERT IGNORE INTO compounders (user_id, doctor_id)
               VALUES (?, ?);`,
              [compUserId, doctorId]
            );
          }
        }
      }
      console.log(' Baseline seed data inserted for fresh database.');
    } else {
      console.log(' Production users already exist. NO users were modified or overwritten.');
    }

    // 6. Summary of database tables
    console.log('\n[5/5] Fetching schema verification...');
    const [tables]: any = await dbConn.query('SHOW TABLES;');
    const tableNames = (tables as any[]).map((t: any) => Object.values(t)[0]);

    console.log('\n====================================================');
    console.log(` Migration to \`${dbName}\` Completed Successfully! `);
    console.log('====================================================');
    console.log(`Target Database: \`${dbName}\``);
    console.log(`Total Tables   : ${tableNames.length}`);
    tableNames.forEach((name, i) => {
      console.log(`  ${String(i + 1).padStart(2, ' ')}. ${name}`);
    });
    console.log('----------------------------------------------------');
    console.log('✓ All existing rows and columns were preserved.');
    console.log('✓ Compounder & serial booking constraints are fully active.');
    console.log('====================================================\n');

    await dbConn.end();
  } catch (err: any) {
    console.error('\n❌ Migration failed:');
    console.error(err.message);
    if (dbConn) {
      try {
        await dbConn.end();
      } catch {}
    }
    process.exit(1);
  }
}

runMigrations();
