import { RowDataPacket } from 'mysql2/promise';

/**
 * Helper to safely check and add a missing column to a table across MySQL, MariaDB, and SQLite.
 */
export async function addColumnIfMissing(
  dbPool: any,
  table: string,
  column: string,
  definition: string,
  isMysql: boolean = false
): Promise<void> {
  if (isMysql) {
    try {
      // 1. MySQL / MariaDB INFORMATION_SCHEMA lookup
      const [rows]: any = await dbPool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );

      if (!rows || rows.length === 0) {
        console.log(`[SchemaMigration] Adding missing column '${column}' to table '${table}' in MySQL...`);
        await dbPool.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`[SchemaMigration] Successfully added column '${column}' to '${table}'.`);
      }
      return;
    } catch (err: any) {
      console.warn(`[SchemaMigration] Notice on MySQL column ${table}.${column}:`, err.message);
      return;
    }
  }

  // 2. Direct SQLite dialect lookup (avoid querying non-existent INFORMATION_SCHEMA)
  try {
    const [colRows]: any = await dbPool.query(`PRAGMA table_info(${table})`);
    if (Array.isArray(colRows) && !colRows.some((c: any) => c.name === column)) {
      const sqliteDef = definition
        .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
        .replace(/LONGTEXT/gi, 'TEXT')
        .replace(/DATETIME/gi, 'TEXT')
        .replace(/TIMESTAMP/gi, 'TEXT')
        .replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'NUMERIC')
        .replace(/TINYINT\(\d+\)/gi, 'INTEGER')
        .replace(/INT\s+UNSIGNED/gi, 'INTEGER')
        .replace(/INT/gi, 'INTEGER');

      await dbPool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqliteDef}`);
      console.log(`[SchemaMigration] (SQLite) Added column '${column}' to '${table}'.`);
    }
  } catch (innerErr: any) {
    console.warn(`[SchemaMigration] Notice on SQLite column ${table}.${column}:`, innerErr.message);
  }
}

/**
 * Ensures all newly introduced tables and columns exist in MySQL / SQLite.
 * Operates dialect-aware to prevent MySQL syntax errors from running against embedded SQLite.
 */
export async function ensureSchemaInDatabase(dbPool: any, isMysqlParam?: boolean): Promise<void> {
  try {
    const isMysql = isMysqlParam !== undefined ? isMysqlParam : Boolean(dbPool?.isMysql);
    console.log(`[SchemaMigration] Verifying and updating database schema (${isMysql ? 'MySQL' : 'SQLite'})...`);

    // 1. Add missing admin and doctor reference columns to 'users' table
    await addColumnIfMissing(dbPool, 'users', 'admin_role', "VARCHAR(50) NULL DEFAULT 'Super Admin'", isMysql);
    await addColumnIfMissing(dbPool, 'users', 'admin_permissions', "TEXT NULL", isMysql);
    await addColumnIfMissing(dbPool, 'users', 'doctor_id', 'INT NULL', isMysql);
    await addColumnIfMissing(dbPool, 'users', 'last_login_at', 'DATETIME NULL', isMysql);
    await addColumnIfMissing(dbPool, 'users', 'avatar_url', 'TEXT NULL', isMysql);

    // Ensure all existing admin users have an admin_role populated
    try {
      await dbPool.execute(`UPDATE users SET admin_role = 'Super Admin' WHERE role = 'admin' AND (admin_role IS NULL OR admin_role = '')`);
      await dbPool.execute(`UPDATE users SET admin_permissions = '["all"]' WHERE role = 'admin' AND (admin_permissions IS NULL OR admin_permissions = '')`);
    } catch {
      // non-fatal
    }

    // 2. Ensure 'settings' table exists
    if (isMysql) {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          setting_key VARCHAR(191) PRIMARY KEY,
          setting_value LONGTEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          setting_key TEXT PRIMARY KEY,
          setting_value TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);
    }

    // 3. Ensure 'password_resets' table exists
    if (isMysql) {
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
    } else {
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
    }

    // 4. Ensure 'activity_logs' table exists
    if (isMysql) {
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
    } else {
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
    }

    // 5. Add columns to 'appointments' table
    await addColumnIfMissing(dbPool, 'appointments', 'booking_source', "VARCHAR(50) NOT NULL DEFAULT 'online'", isMysql);
    await addColumnIfMissing(dbPool, 'appointments', 'created_by', 'INT NULL', isMysql);
    await addColumnIfMissing(dbPool, 'appointments', 'hospital_id', 'INT NULL', isMysql);
    await addColumnIfMissing(dbPool, 'appointments', 'external_booking_id', 'VARCHAR(100) NULL', isMysql);
    await addColumnIfMissing(dbPool, 'appointments', 'booking_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 10.00', isMysql);
    await addColumnIfMissing(dbPool, 'appointments', 'transaction_ref', 'VARCHAR(100) NULL', isMysql);
    await addColumnIfMissing(dbPool, 'appointments', 'payment_method', 'VARCHAR(50) NULL', isMysql);

    // 6. Add columns to 'chambers' table
    await addColumnIfMissing(dbPool, 'chambers', 'hospital_id', 'INT NULL', isMysql);

    // 7. Ensure 'payments' table exists
    if (isMysql) {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          appointment_id INT UNSIGNED NOT NULL,
          transaction_id VARCHAR(100) NULL UNIQUE,
          method ENUM('cash_at_chamber', 'online_payment', 'bkash', 'nagad', 'card') NOT NULL DEFAULT 'cash_at_chamber',
          amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          status ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid',
          gateway_response TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_pmt_appt (appointment_id),
          INDEX idx_pmt_tx (transaction_id),
          INDEX idx_pmt_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("[SchemaMigration] Verified production 'payments' table in MySQL.");
    } else {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          appointment_id INTEGER NOT NULL,
          transaction_id TEXT NULL UNIQUE,
          method TEXT NOT NULL DEFAULT 'cash_at_chamber',
          amount NUMERIC NOT NULL DEFAULT 0.00,
          status TEXT NOT NULL DEFAULT 'unpaid',
          gateway_response TEXT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);
      console.log("[SchemaMigration] Verified 'payments' table in SQLite.");
    }

    // 8. Add additive columns to 'payments' table for gateway and fee tracking
    await addColumnIfMissing(dbPool, 'payments', 'gateway_id', 'VARCHAR(64) NULL', isMysql);
    await addColumnIfMissing(dbPool, 'payments', 'booking_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 10.00', isMysql);
    await addColumnIfMissing(dbPool, 'payments', 'consultation_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00', isMysql);
    await addColumnIfMissing(dbPool, 'payments', 'surcharge_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00', isMysql);
    await addColumnIfMissing(dbPool, 'payments', 'verified_at', 'DATETIME NULL', isMysql);
    await addColumnIfMissing(dbPool, 'payments', 'verified_by', 'VARCHAR(100) NULL', isMysql);

    // 9. Ensure 'payment_gateways' table exists
    if (isMysql) {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS payment_gateways (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description VARCHAR(255) NULL,
          logo_url TEXT NULL,
          is_enabled TINYINT(1) NOT NULL DEFAULT 0,
          is_sandbox TINYINT(1) NOT NULL DEFAULT 1,
          config_encrypted LONGTEXT NULL,
          supported_methods TEXT NULL,
          surcharge_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
          surcharge_fixed DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          sort_order INT NOT NULL DEFAULT 0,
          last_tested_at DATETIME NULL,
          last_test_status VARCHAR(20) NULL DEFAULT 'untested',
          last_test_message TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("[SchemaMigration] Verified 'payment_gateways' table in MySQL.");
    } else {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS payment_gateways (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NULL,
          logo_url TEXT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 0,
          is_sandbox INTEGER NOT NULL DEFAULT 1,
          config_encrypted TEXT NULL,
          supported_methods TEXT NULL,
          surcharge_percentage NUMERIC NOT NULL DEFAULT 0.00,
          surcharge_fixed NUMERIC NOT NULL DEFAULT 0.00,
          sort_order INTEGER NOT NULL DEFAULT 0,
          last_tested_at TEXT NULL,
          last_test_status TEXT DEFAULT 'untested',
          last_test_message TEXT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);
      console.log("[SchemaMigration] Verified 'payment_gateways' table in SQLite.");
    }

    // 10. Ensure 'gateway_audit_logs' table exists
    if (isMysql) {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS gateway_audit_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          gateway_id VARCHAR(64) NOT NULL,
          admin_id INT NULL,
          admin_email VARCHAR(191) NULL,
          action VARCHAR(64) NOT NULL,
          changes TEXT NULL,
          ip_address VARCHAR(45) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_gal_gateway (gateway_id),
          INDEX idx_gal_admin (admin_id),
          INDEX idx_gal_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("[SchemaMigration] Verified 'gateway_audit_logs' table in MySQL.");
    } else {
      await dbPool.execute(`
        CREATE TABLE IF NOT EXISTS gateway_audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gateway_id TEXT NOT NULL,
          admin_id INTEGER NULL,
          admin_email TEXT NULL,
          action TEXT NOT NULL,
          changes TEXT NULL,
          ip_address TEXT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      console.log("[SchemaMigration] Verified 'gateway_audit_logs' table in SQLite.");
    }

    // Seed default gateways if empty
    try {
      const [existingGateways]: any = await dbPool.query('SELECT id FROM payment_gateways');
      if (!existingGateways || existingGateways.length === 0) {
        console.log('[SchemaMigration] Seeding default payment gateways...');
        const defaultGateways = [
          {
            id: 'paymently',
            name: 'Paymently Gateway',
            description: 'Integrated multi-channel gateway (bKash, Nagad, Rocket, Cards, Internet Banking)',
            logo_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80',
            is_enabled: 1,
            is_sandbox: 1,
            supported_methods: JSON.stringify(['bkash', 'nagad', 'rocket', 'card', 'bank']),
            surcharge_percentage: 0.00,
            surcharge_fixed: 0.00,
            sort_order: 1,
          },
          {
            id: 'bkash',
            name: 'bKash Direct Merchant Checkout',
            description: 'Official bKash Tokenized Merchant API for automated checkout & instant refunds',
            logo_url: 'https://images.unsplash.com/photo-1556742049-0a67e557224f?w=100&auto=format&fit=crop&q=80',
            is_enabled: 0,
            is_sandbox: 1,
            supported_methods: JSON.stringify(['bkash']),
            surcharge_percentage: 0.00,
            surcharge_fixed: 0.00,
            sort_order: 2,
          },
          {
            id: 'nagad',
            name: 'Nagad Direct Merchant Checkout',
            description: 'Nagad PGW direct checkout with public/private key cryptographic verification',
            logo_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=100&auto=format&fit=crop&q=80',
            is_enabled: 0,
            is_sandbox: 1,
            supported_methods: JSON.stringify(['nagad']),
            surcharge_percentage: 0.00,
            surcharge_fixed: 0.00,
            sort_order: 3,
          },
          {
            id: 'rocket',
            name: 'DBBL Rocket Merchant',
            description: 'Dutch-Bangla Bank Rocket direct payment interface',
            logo_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100&auto=format&fit=crop&q=80',
            is_enabled: 0,
            is_sandbox: 1,
            supported_methods: JSON.stringify(['rocket']),
            surcharge_percentage: 0.00,
            surcharge_fixed: 0.00,
            sort_order: 4,
          },
          {
            id: 'upay',
            name: 'Upay (UCB Fintech) Merchant',
            description: 'United Commercial Bank Upay automated mobile payment gateway',
            logo_url: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=100&auto=format&fit=crop&q=80',
            is_enabled: 0,
            is_sandbox: 1,
            supported_methods: JSON.stringify(['upay']),
            surcharge_percentage: 0.00,
            surcharge_fixed: 0.00,
            sort_order: 5,
          },
          {
            id: 'sslcommerz',
            name: 'SSLCommerz Payment Gateway',
            description: 'National payment gateway aggregator for all Bangladeshi cards and MFS accounts',
            logo_url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=100&auto=format&fit=crop&q=80',
            is_enabled: 0,
            is_sandbox: 1,
            supported_methods: JSON.stringify(['bkash', 'nagad', 'rocket', 'upay', 'visa', 'mastercard']),
            surcharge_percentage: 0.00,
            surcharge_fixed: 0.00,
            sort_order: 6,
          },
        ];

        for (const gw of defaultGateways) {
          await dbPool.execute(`
            INSERT INTO payment_gateways (id, name, description, logo_url, is_enabled, is_sandbox, supported_methods, surcharge_percentage, surcharge_fixed, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            gw.id, gw.name, gw.description, gw.logo_url, gw.is_enabled, gw.is_sandbox,
            gw.supported_methods, gw.surcharge_percentage, gw.surcharge_fixed, gw.sort_order
          ]);
        }
        console.log('[SchemaMigration] Successfully seeded default payment gateways.');
      }
    } catch (seedErr: any) {
      console.warn('[SchemaMigration] Notice on seeding payment gateways:', seedErr.message);
    }

    console.log('[SchemaMigration] Database schema verification completed successfully.');
  } catch (err: any) {
    console.warn('[SchemaMigration] Notice during schema verification:', err.message);
  }
}
