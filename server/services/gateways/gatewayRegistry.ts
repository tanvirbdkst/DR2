import pool from '../../db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { encryptData, decryptData, maskGatewayConfig } from '../../utils/crypto.js';
import {
  IPaymentGatewayAdapter,
  PaymentGatewayId,
  PaymentGatewayRecord,
  PaymentGatewayPublicView,
  TestConnectionResult,
  GatewayAuditLog,
} from './types.js';
import { PaymentlyAdapter } from './paymentlyAdapter.js';
import { BkashAdapter } from './bkashAdapter.js';
import { NagadAdapter } from './nagadAdapter.js';
import { RocketAdapter } from './rocketAdapter.js';
import { UpayAdapter } from './upayAdapter.js';
import { SslcommerzAdapter } from './sslcommerzAdapter.js';

class GatewayRegistry {
  private adapters: Map<PaymentGatewayId, IPaymentGatewayAdapter> = new Map();

  constructor() {
    this.registerAdapter(new PaymentlyAdapter());
    this.registerAdapter(new BkashAdapter());
    this.registerAdapter(new NagadAdapter());
    this.registerAdapter(new RocketAdapter());
    this.registerAdapter(new UpayAdapter());
    this.registerAdapter(new SslcommerzAdapter());
  }

  public registerAdapter(adapter: IPaymentGatewayAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: PaymentGatewayId): IPaymentGatewayAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Log an administrative change to gateway_audit_logs.
   * Strips out any raw sensitive tokens, secrets, or keys before writing to the database.
   */
  public async logAudit(
    gatewayId: string,
    action: string,
    changes: any,
    adminId?: number | null,
    adminEmail?: string | null,
    ip?: string | null
  ): Promise<void> {
    try {
      let sanitizedChanges = changes;
      if (typeof changes === 'object' && changes !== null) {
        sanitizedChanges = maskGatewayConfig(changes);
      }
      const changesStr = typeof sanitizedChanges === 'string' ? sanitizedChanges : JSON.stringify(sanitizedChanges);

      await pool.execute(
        `INSERT INTO gateway_audit_logs (gateway_id, admin_id, admin_email, action, changes, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [gatewayId, adminId || null, adminEmail || 'system', action, changesStr, ip || null]
      );
    } catch (err: any) {
      console.warn('[GatewayRegistry] Failed to record gateway audit log:', err.message);
    }
  }

  /**
   * Retrieves all registered payment gateways with masked credentials and test status.
   */
  public async getAllGateways(): Promise<PaymentGatewayPublicView[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM payment_gateways ORDER BY sort_order ASC, name ASC`
    );

    return rows.map((row: any) => {
      const decryptedConfig = decryptData<Record<string, any>>(row.config_encrypted) || {};
      
      // If config in DB is empty, check environment for default values (Paymently / bKash)
      if (row.id === 'paymently' && Object.keys(decryptedConfig).length === 0 && process.env.PAYMENTLY_API_KEY) {
        decryptedConfig.apiKey = process.env.PAYMENTLY_API_KEY;
        decryptedConfig.baseUrl = process.env.PAYMENTLY_BASE_URL || 'https://daktarserial.paymently.io/api';
      } else if (row.id === 'bkash' && Object.keys(decryptedConfig).length === 0 && process.env.BKASH_APP_KEY) {
        decryptedConfig.appKey = process.env.BKASH_APP_KEY;
        decryptedConfig.appSecret = process.env.BKASH_APP_SECRET;
        decryptedConfig.username = process.env.BKASH_USERNAME;
        decryptedConfig.password = process.env.BKASH_PASSWORD;
      }

      const hasCredentials = Object.keys(decryptedConfig).length > 0;
      const maskedConfig = maskGatewayConfig(decryptedConfig);

      let supportedMethods: string[] = [];
      try {
        supportedMethods = row.supported_methods ? JSON.parse(row.supported_methods) : [];
      } catch {
        supportedMethods = [];
      }

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        logo_url: row.logo_url,
        is_enabled: Boolean(row.is_enabled),
        is_sandbox: Boolean(row.is_sandbox),
        supported_methods: supportedMethods,
        surcharge_percentage: Number(row.surcharge_percentage || 0),
        surcharge_fixed: Number(row.surcharge_fixed || 0),
        sort_order: Number(row.sort_order || 0),
        last_tested_at: row.last_tested_at,
        last_test_status: row.last_test_status || 'untested',
        last_test_message: row.last_test_message,
        masked_config: maskedConfig,
        has_credentials: hasCredentials,
      };
    });
  }

  /**
   * Retrieves only enabled gateways for patient checkout selection.
   */
  public async getActiveGateways(): Promise<PaymentGatewayPublicView[]> {
    const all = await this.getAllGateways();
    return all.filter((gw) => gw.is_enabled);
  }

  /**
   * Retrieves single gateway with decrypted configuration and its adapter.
   */
  public async getGateway(id: PaymentGatewayId): Promise<{
    record: PaymentGatewayRecord;
    adapter: IPaymentGatewayAdapter;
    decryptedConfig: Record<string, any>;
  } | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM payment_gateways WHERE id = ?',
      [id]
    );

    if (!rows || rows.length === 0) return null;
    const row = rows[0] as PaymentGatewayRecord;

    const adapter = this.adapters.get(id);
    if (!adapter) return null;

    let decryptedConfig = decryptData<Record<string, any>>(row.config_encrypted) || {};

    // Fallbacks from env if DB has no stored credentials
    if (id === 'paymently' && Object.keys(decryptedConfig).length === 0 && process.env.PAYMENTLY_API_KEY) {
      decryptedConfig.apiKey = process.env.PAYMENTLY_API_KEY;
      decryptedConfig.baseUrl = process.env.PAYMENTLY_BASE_URL || 'https://daktarserial.paymently.io/api';
    } else if (id === 'bkash' && Object.keys(decryptedConfig).length === 0 && process.env.BKASH_APP_KEY) {
      decryptedConfig.appKey = process.env.BKASH_APP_KEY;
      decryptedConfig.appSecret = process.env.BKASH_APP_SECRET;
      decryptedConfig.username = process.env.BKASH_USERNAME;
      decryptedConfig.password = process.env.BKASH_PASSWORD;
    }

    return {
      record: row,
      adapter,
      decryptedConfig,
    };
  }

  /**
   * Test connection to a gateway using provided or stored credentials.
   */
  public async testConnection(
    id: PaymentGatewayId,
    overrideConfig?: Record<string, any>,
    overrideSandbox?: boolean,
    adminUser?: { id: number; email: string },
    ip?: string
  ): Promise<TestConnectionResult> {
    const gateway = await this.getGateway(id);
    if (!gateway) {
      return { success: false, message: `Gateway '${id}' not found.` };
    }

    const { adapter, record, decryptedConfig } = gateway;

    // Merge override config if supplied from admin edit form (preserving masked credentials)
    let configToTest = { ...decryptedConfig };
    if (overrideConfig) {
      for (const [key, val] of Object.entries(overrideConfig)) {
        if (typeof val === 'string' && val.includes('••••')) {
          // Keep existing decrypted secret
          continue;
        }
        configToTest[key] = val;
      }
    }

    const isSandbox = overrideSandbox !== undefined ? overrideSandbox : Boolean(record.is_sandbox);

    const result = await adapter.testConnection(configToTest, isSandbox);

    // Update last test status in database
    const status = result.success ? 'success' : 'failed';
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute(
      `UPDATE payment_gateways SET last_tested_at = ?, last_test_status = ?, last_test_message = ? WHERE id = ?`,
      [now, status, result.message, id]
    );

    // Audit log
    await this.logAudit(
      id,
      'TEST_CONNECTION',
      { status, message: result.message, sandbox: isSandbox },
      adminUser?.id,
      adminUser?.email,
      ip
    );

    return result;
  }

  /**
   * Update gateway configuration, credentials, surcharge and options.
   */
  public async updateGateway(
    id: PaymentGatewayId,
    updates: {
      name?: string;
      description?: string;
      is_enabled?: boolean | number;
      is_sandbox?: boolean | number;
      surcharge_percentage?: number;
      surcharge_fixed?: number;
      supported_methods?: string[];
      credentials?: Record<string, any>;
    },
    adminUser: { id: number; email: string },
    ip?: string
  ): Promise<boolean> {
    const gateway = await this.getGateway(id);
    if (!gateway) return false;

    const currentConfig = gateway.decryptedConfig;
    let newDecryptedConfig = { ...currentConfig };

    // Update credentials if provided (ignoring masked placeholders)
    if (updates.credentials) {
      for (const [k, v] of Object.entries(updates.credentials)) {
        if (typeof v === 'string' && v.includes('••••')) {
          continue; // keep current secret
        }
        if (v !== undefined) {
          newDecryptedConfig[k] = v;
        }
      }
    }

    const encryptedPayload = encryptData(newDecryptedConfig);

    const fieldsToUpdate: string[] = ['config_encrypted = ?'];
    const params: any[] = [encryptedPayload];

    if (updates.name !== undefined) {
      fieldsToUpdate.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      fieldsToUpdate.push('description = ?');
      params.push(updates.description);
    }
    if (updates.is_enabled !== undefined) {
      fieldsToUpdate.push('is_enabled = ?');
      params.push(updates.is_enabled ? 1 : 0);
    }
    if (updates.is_sandbox !== undefined) {
      fieldsToUpdate.push('is_sandbox = ?');
      params.push(updates.is_sandbox ? 1 : 0);
    }
    if (updates.surcharge_percentage !== undefined) {
      fieldsToUpdate.push('surcharge_percentage = ?');
      params.push(Number(updates.surcharge_percentage));
    }
    if (updates.surcharge_fixed !== undefined) {
      fieldsToUpdate.push('surcharge_fixed = ?');
      params.push(Number(updates.surcharge_fixed));
    }
    if (updates.supported_methods !== undefined) {
      fieldsToUpdate.push('supported_methods = ?');
      params.push(JSON.stringify(updates.supported_methods));
    }

    params.push(id);

    await pool.execute(
      `UPDATE payment_gateways SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
      params
    );

    // Audit log without secrets
    await this.logAudit(
      id,
      'UPDATE_CONFIG',
      {
        name: updates.name,
        is_enabled: updates.is_enabled,
        is_sandbox: updates.is_sandbox,
        surcharge_percentage: updates.surcharge_percentage,
        surcharge_fixed: updates.surcharge_fixed,
        supported_methods: updates.supported_methods,
        credentials_updated: Boolean(updates.credentials),
      },
      adminUser.id,
      adminUser.email,
      ip
    );

    return true;
  }

  /**
   * Toggle gateway enabled status.
   */
  public async toggleGateway(
    id: PaymentGatewayId,
    isEnabled: boolean,
    adminUser: { id: number; email: string },
    ip?: string
  ): Promise<{ success: boolean; warning?: string }> {
    const gateway = await this.getGateway(id);
    if (!gateway) return { success: false, warning: 'Gateway not found' };

    let warning: string | undefined;
    if (isEnabled && gateway.record.last_test_status !== 'success') {
      warning = 'Gateway is enabled but connection has not been successfully tested. Please test connection to avoid checkout failures.';
    }

    await pool.execute('UPDATE payment_gateways SET is_enabled = ? WHERE id = ?', [
      isEnabled ? 1 : 0,
      id,
    ]);

    await this.logAudit(
      id,
      isEnabled ? 'ENABLE_GATEWAY' : 'DISABLE_GATEWAY',
      { is_enabled: isEnabled, warning },
      adminUser.id,
      adminUser.email,
      ip
    );

    return { success: true, warning };
  }

  /**
   * Retrieve audit logs for a gateway.
   */
  public async getAuditLogs(gatewayId?: string, limit = 50): Promise<GatewayAuditLog[]> {
    let sql = 'SELECT * FROM gateway_audit_logs';
    const params: any[] = [];

    if (gatewayId) {
      sql += ' WHERE gateway_id = ?';
      params.push(gatewayId);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows.map((r: any) => ({
      id: r.id,
      gateway_id: r.gateway_id,
      admin_id: r.admin_id,
      admin_email: r.admin_email,
      action: r.action,
      changes: r.changes,
      ip_address: r.ip_address,
      created_at: r.created_at,
    }));
  }
}

export const gatewayRegistry = new GatewayRegistry();
