import dotenv from 'dotenv';
dotenv.config();

export interface CreateChargeParams {
  fullName: string;
  email: string;
  amount: number | string;
  metadata: {
    appointmentId: string;
    transactionRef: string;
    doctorId: number | string;
    chamberId: number | string;
    patientPhone: string;
    [key: string]: any;
  };
  redirectUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
}

export interface CreateChargeResponse {
  success: boolean;
  paymentUrl?: string;
  invoiceId?: string;
  message?: string;
  error?: string;
  rawResponse?: any;
}

export interface VerifyPaymentResponse {
  success: boolean;
  status: 'COMPLETED' | 'PENDING' | 'ERROR' | 'FAILED' | 'UNKNOWN';
  invoiceId?: string;
  amount?: number;
  fee?: number;
  chargedAmount?: number;
  paymentMethod?: string;
  senderNumber?: string;
  transactionId?: string;
  date?: string;
  metadata?: any;
  message?: string;
  error?: string;
  rawResponse?: any;
}

/**
 * Normalizes the API base URL to ensure proper endpoint routing.
 * Target: https://daktarserial.paymently.io/api
 */
function getApiEndpoints(): { checkoutUrl: string; verifyUrl: string; baseUrl: string } {
  const rawUrl = (process.env.PAYMENTLY_BASE_URL || process.env.PAYMENTLY_API_URL || 'https://daktarserial.paymently.io/api').trim().replace(/\/+$/, '');
  const baseUrl = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

  return {
    baseUrl,
    checkoutUrl: `${baseUrl}/checkout-v2`,
    verifyUrl: `${baseUrl}/verify-payment`,
  };
}

/**
 * Checks whether the Paymently gateway API key is configured in the environment.
 */
export function isPaymentlyConfigured(): boolean {
  const apiKey = process.env.PAYMENTLY_API_KEY;
  return Boolean(apiKey && apiKey.trim() !== '' && !apiKey.includes('MY_PAYMENTLY_API_KEY'));
}

/**
 * Returns authentication headers required by Paymently / UddoktaPay engine.
 */
function getAuthHeaders(): Record<string, string> {
  const apiKey = (process.env.PAYMENTLY_API_KEY || '').trim();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // UddoktaPay engine standard header
    'RT-UDDOKTAPAY-API-KEY': apiKey,
    // Paymently branded header alias for direct compatibility
    'RT-PAYMENTLY-API-KEY': apiKey,
  };
}

/**
 * Creates a checkout charge session on Paymently gateway via checkout-v2 endpoint.
 */
export async function createPaymentCharge(params: CreateChargeParams): Promise<CreateChargeResponse> {
  const { checkoutUrl } = getApiEndpoints();
  const apiKey = process.env.PAYMENTLY_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      error: 'MISSING_API_KEY',
      message: 'Paymently API key is not configured. Please set PAYMENTLY_API_KEY in server environment variables.',
    };
  }

  const payload = {
    full_name: params.fullName || 'Patient',
    email: params.email || 'patient@dakatarseial.bd',
    amount: String(Number(params.amount).toFixed(2)),
    metadata: params.metadata,
    redirect_url: params.redirectUrl,
    cancel_url: params.cancelUrl,
    webhook_url: params.webhookUrl,
  };

  try {
    const response = await fetch(checkoutUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data: any = await response.json().catch(() => null);

    if (!response.ok || !data) {
      const errMsg = data?.message || data?.error || `Paymently API returned HTTP ${response.status}`;
      return {
        success: false,
        error: 'GATEWAY_ERROR',
        message: errMsg,
        rawResponse: data,
      };
    }

    // Paymently / UddoktaPay returns { status: true, payment_url: "..." }
    const paymentUrl = data.payment_url || data.paymentUrl || data.url;
    if (data.status === true || Boolean(paymentUrl)) {
      return {
        success: true,
        paymentUrl,
        invoiceId: data.invoice_id || data.invoiceId,
        message: data.message || 'Payment session initiated',
        rawResponse: data,
      };
    }

    return {
      success: false,
      error: 'GATEWAY_REJECTED',
      message: data.message || 'Payment initiation rejected by gateway',
      rawResponse: data,
    };
  } catch (networkErr: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: `Failed to connect to Paymently gateway at ${checkoutUrl}: ${networkErr.message}`,
    };
  }
}

/**
 * Verifies a transaction server-side using Paymently's verify-payment endpoint.
 * Validates the transaction reference, amount, currency, and status.
 */
export async function verifyPayment(invoiceId: string): Promise<VerifyPaymentResponse> {
  const { verifyUrl } = getApiEndpoints();
  const apiKey = process.env.PAYMENTLY_API_KEY?.trim();

  if (!invoiceId || invoiceId.trim() === '') {
    return {
      success: false,
      status: 'ERROR',
      error: 'MISSING_INVOICE_ID',
      message: 'Invoice ID is required for server-side payment verification.',
    };
  }

  if (!apiKey) {
    return {
      success: false,
      status: 'ERROR',
      error: 'MISSING_API_KEY',
      message: 'Paymently API key is missing. Cannot verify transaction.',
    };
  }

  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ invoice_id: invoiceId.trim() }),
    });

    const data: any = await response.json().catch(() => null);

    if (!response.ok || !data) {
      return {
        success: false,
        status: 'ERROR',
        error: 'VERIFICATION_FAILED',
        message: data?.message || `Paymently verification returned HTTP ${response.status}`,
        rawResponse: data,
      };
    }

    const rawStatus = String(data.status || '').toUpperCase();
    let normalizedStatus: 'COMPLETED' | 'PENDING' | 'ERROR' | 'FAILED' | 'UNKNOWN' = 'UNKNOWN';

    if (rawStatus === 'COMPLETED' || rawStatus === 'PAID' || rawStatus === 'SUCCESS') {
      normalizedStatus = 'COMPLETED';
    } else if (rawStatus === 'PENDING') {
      normalizedStatus = 'PENDING';
    } else if (rawStatus === 'ERROR' || rawStatus === 'CANCELLED' || rawStatus === 'EXPIRED') {
      normalizedStatus = 'FAILED';
    }

    return {
      success: normalizedStatus === 'COMPLETED',
      status: normalizedStatus,
      invoiceId: data.invoice_id || invoiceId,
      amount: data.amount ? parseFloat(String(data.amount)) : undefined,
      fee: data.fee ? parseFloat(String(data.fee)) : undefined,
      chargedAmount: data.charged_amount ? parseFloat(String(data.charged_amount)) : undefined,
      paymentMethod: data.payment_method || data.paymentMethod || null,
      senderNumber: data.sender_number || data.senderNumber || null,
      transactionId: data.transaction_id || data.transactionId || null,
      date: data.date || null,
      metadata: data.metadata || null,
      message: data.message || `Payment status: ${normalizedStatus}`,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'ERROR',
      error: 'NETWORK_ERROR',
      message: `Failed to verify payment with gateway: ${err.message}`,
    };
  }
}
