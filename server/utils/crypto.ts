import crypto from 'crypto';

// Require a dedicated server-side encryption key.
const MASTER_SECRET = process.env.GATEWAY_ENCRYPTION_KEY;
if (!MASTER_SECRET || MASTER_SECRET.length < 32) {
  throw new Error('GATEWAY_ENCRYPTION_KEY must be configured with at least 32 characters.');
}

// Derive a 32-byte (256-bit) key using SHA-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(MASTER_SECRET).digest();
const ALGORITHM = 'aes-256-gcm';

export interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

/**
 * Encrypts an arbitrary object or string using AES-256-GCM authenticated encryption.
 */
export function encryptData(data: any): string {
  if (data === null || data === undefined) return '';
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let ciphertext = cipher.update(text, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  const payload: EncryptedPayload = {
    iv: iv.toString('hex'),
    authTag,
    ciphertext,
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts AES-256-GCM encrypted payload back to string or parsed JSON object.
 */
export function decryptData<T = any>(encryptedStr: string | null | undefined): T | null {
  if (!encryptedStr || typeof encryptedStr !== 'string') return null;

  try {
    const payload: EncryptedPayload = JSON.parse(encryptedStr);
    if (!payload.iv || !payload.authTag || !payload.ciphertext) return null;

    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return decrypted as unknown as T;
    }
  } catch (err: any) {
    console.warn('[Crypto] Failed to decrypt data payload:', err.message);
    return null;
  }
}

/**
 * Mask sensitive credentials for safe API responses and admin preview.
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  const str = String(secret).trim();
  if (str.length <= 4) return '••••';
  if (str.length <= 8) return `${str.slice(0, 1)}••••${str.slice(-1)}`;
  const prefix = str.slice(0, Math.min(3, Math.floor(str.length / 4)));
  const suffix = str.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Masks all sensitive keys inside a config object before sending to client.
 */
export function maskGatewayConfig(config: Record<string, any> | null): Record<string, any> {
  if (!config) return {};
  const masked: Record<string, any> = {};

  const sensitiveKeyPatterns = ['secret', 'key', 'password', 'token', 'pass', 'auth', 'hash'];

  for (const [key, value] of Object.entries(config)) {
    if (value === null || value === undefined) {
      masked[key] = value;
      continue;
    }

    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeyPatterns.some((pattern) => lowerKey.includes(pattern));

    if (isSensitive && typeof value === 'string' && value.length > 0) {
      masked[key] = maskSecret(value);
      masked[`${key}_is_set`] = true;
    } else {
      masked[key] = value;
    }
  }

  return masked;
}
