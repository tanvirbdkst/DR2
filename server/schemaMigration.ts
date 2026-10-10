import { RowDataPacket } from 'mysql2/promise';

/**
 * Helper to safely check and add a missing column to a table across MySQL, MariaDB, and SQLite.
 */
export async function addColumnIfMissing(
  dbPool: any,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  try {
    // 1. Try MySQL / MariaDB INFORMATION_SCHEMA lookup
    const [rows]: any = await dbPool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );

    if (!rows || rows.length === 0) {
      console.log(`[SchemaMigration] Adding missing column '${column}' to table '${table}'...`);
      await dbPool.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`[SchemaMigration] Successfully added column '${column}' to '${table}'.`);
    }
  } catch (err: any) {
    // 2. Fallback for SQLite or environments where INFORMATION_SCHEMA is unavailable
    try {
      const [colRows]: any = await dbPool.query(`PRAGMA table_info(${table})`);
      if (Array.isArray(colRows) && !colRows.some((c: any) => c.name === column)) {
        await dbPool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`[SchemaMigration] (SQLite) Added column '${column}' to '${table}'.`);
      }
    } catch (innerErr: any) {
      console.warn(`[SchemaMigration] Notice on column ${table}.${column}:`, innerErr.message || err.message);
    }
  }
}

/**
 * Ensures all newly introduced tables and columns exist in MySQL / SQLite.
 * This prevents runtime failures such as: Unknown column 'admin_role' in 'INSERT INTO'
 */
export async function ensureSchemaInDatabase(dbPool: any): Promise<void> {
  try {
    console.log('[SchemaMigration] Verifying and updating database schema...');

    // 1. Add missing admin and doctor reference columns to 'users' table
    await addColumnIfMissing(dbPool, 'users', 'admin_role', "VARCHAR(50) NULL DEFAULT 'Super Admin'");
    await addColumnIfMissing(dbPool, 'users', 'admin_permissions', "TEXT NULL");
    await addColumnIfMissing(dbPool, 'users', 'doctor_id', 'INT NULL');
    await addColumnIfMissing(dbPool, 'users', 'last_login_at', 'DATETIME NULL');
    await addColumnIfMissing(dbPool, 'users', 'avatar_url', 'TEXT NULL');

    // Ensure all existing admin users have an admin_role populated
    try {
      await dbPool.execute(`UPDATE users SET admin_role = 'Super Admin' WHERE role = 'admin' AND (admin_role IS NULL OR admin_role = '')`);
      await dbPool.execute(`UPDATE users SET admin_permissions = '["all"]' WHERE role = 'admin' AND (admin_permissions IS NULL OR admin_permissions = '')`);
    } catch {
      // non-fatal
    }

    // 2. Ensure 'settings' table exists (for Policies, Terms, Emergency Helpline, etc.)
    try {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          setting_key VARCHAR(191) PRIMARY KEY,
          setting_value LONGTEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch {
      try {
        await dbPool.execute(`
          CREATE TABLE IF NOT EXISTS settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          );
        `);
      } catch {
        // ignore
      }
    }

    // 3. Ensure 'password_resets' table exists
    try {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          identifier VARCHAR(191) NOT NULL,
          otp_code VARCHAR(10) NOT NULL,
          expires_at DATETIME NOT NULL,
          used TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_pw_reset_user (user_id),
          INDEX idx_pw_reset_ident (identifier)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch {
      try {
        await dbPool.execute(`
          CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            identifier TEXT NOT NULL,
            otp_code TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
          );
        `);
      } catch {
        // ignore
      }
    }

    // 4. Ensure 'activity_logs' table exists
    try {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          action VARCHAR(100) NOT NULL,
          details TEXT NULL,
          ip_address VARCHAR(45) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch {
      try {
        await dbPool.execute(`
          CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NULL,
            action TEXT NOT NULL,
            details TEXT NULL,
            ip_address TEXT NULL,
            created_at TEXT DEFAULT (datetime('now'))
          );
        `);
      } catch {
        // ignore
      }
    }

    // 5. Add columns to 'appointments' table
    await addColumnIfMissing(dbPool, 'appointments', 'booking_source', "VARCHAR(50) NOT NULL DEFAULT 'online'");
    await addColumnIfMissing(dbPool, 'appointments', 'created_by', 'INT NULL');
    await addColumnIfMissing(dbPool, 'appointments', 'hospital_id', 'INT NULL');
    await addColumnIfMissing(dbPool, 'appointments', 'external_booking_id', 'VARCHAR(100) NULL');

    // 6. Add columns to 'chambers' table
    await addColumnIfMissing(dbPool, 'chambers', 'hospital_id', 'INT NULL');

    console.log('[SchemaMigration] Database schema verification completed successfully.');
  } catch (err: any) {
    console.warn('[SchemaMigration] Notice during schema verification:', err.message);
  }
}
