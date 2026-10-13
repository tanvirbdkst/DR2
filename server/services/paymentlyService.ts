import dotenv from 'dotenv';
dotenv.config();

export const BOOKING_FEE_BDT = 10.0;
export const GATEWAY_SURCHARGE_BDT = 2.0;
export const TOTAL_PAYABLE_GATEWAY_BDT = 12.0;

export type MfsMethodId = 'bkash' | 'nagad' | 'rocket' | 'upay';

export interface MfsMethodInfo {
  id: MfsMethodId;
  name: string;
  nameBn: string;
  brandColor: string;
  active: boolean;
  instructionEn: string;
  instructionBn: string;
  trxIdLength: string;
  sampleTrxId: string;
  smsSender: string;
  hasAppDeepLink: boolean;
  activationNoticeEn?: string;
  activationNoticeBn?: string;
}

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
 * Returns the list of enabled MFS methods as configured in the server environment.
 * Default is ['bkash'] if not specified, reflecting the currently confirmed active method in Paymently.
 * To activate Nagad, Rocket, or Upay, the merchant adds them to PAYMENTLY_ENABLED_METHODS.
 */
export function getEnabledMfsMethods(): string[] {
  const envVal = process.env.PAYMENTLY_ENABLED_METHODS;
  if (!envVal || envVal.trim() === '') {
    // Default to bKash (confirmed active in merchant's Paymently account)
    return ['bkash'];
  }
  return envVal
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Returns comprehensive MFS method details, activation statuses, and fee breakdown.
 */
export function getMfsMethodsConfig(): {
  enabledMethods: string[];
  methods: MfsMethodInfo[];
  bookingFee: number;
  gatewayFee: number;
  totalPayable: number;
} {
  const enabledList = getEnabledMfsMethods();

  const methods: MfsMethodInfo[] = [
    {
      id: 'bkash',
      name: 'bKash',
      nameBn: 'বিকাশ',
      brandColor: '#E2136E',
      active: enabledList.includes('bkash'),
      instructionEn: 'Send Money via bKash App or Paymently Web Gateway',
      instructionBn: 'বিকাশ অ্যাপে সেন্ড মানি বা পেমেন্টলি গেটওয়ের মাধ্যমে পরিশোধ করুন',
      trxIdLength: '8-10',
      sampleTrxId: 'BLK92X4KP1',
      smsSender: 'bKash (16247)',
      hasAppDeepLink: true,
      activationNoticeEn: 'To enable bKash, activate the bKash channel in your Paymently merchant dashboard.',
      activationNoticeBn: 'বিকাশ চালু করতে আপনার Paymently মার্চেন্ট ড্যাশবোর্ডে bKash চ্যানেল সক্রিয় করুন।',
    },
    {
      id: 'nagad',
      name: 'Nagad',
      nameBn: 'নগদ',
      brandColor: '#F7941D',
      active: enabledList.includes('nagad'),
      instructionEn: 'Pay via Paymently Nagad Gateway',
      instructionBn: 'পেমেন্টলি নগদ গেটওয়ের মাধ্যমে পরিশোধ করুন',
      trxIdLength: '8',
      sampleTrxId: '72K8PL9J',
      smsSender: 'Nagad (16167)',
      hasAppDeepLink: false,
      activationNoticeEn: 'To enable Nagad, activate the Nagad channel in your Paymently merchant dashboard and add nagad to PAYMENTLY_ENABLED_METHODS in cPanel.',
      activationNoticeBn: 'নগদ চালু করতে আপনার Paymently মার্চেন্ট ড্যাশবোর্ডে Nagad চ্যানেল সক্রিয় করুন এবং cPanel-এ PAYMENTLY_ENABLED_METHODS-এ nagad যোগ করুন।',
    },
    {
      id: 'rocket',
      name: 'Rocket',
      nameBn: 'রকেট',
      brandColor: '#8C3494',
      active: enabledList.includes('rocket'),
      instructionEn: 'Pay via Paymently Rocket Gateway',
      instructionBn: 'পেমেন্টলি রকেট গেটওয়ের মাধ্যমে পরিশোধ করুন',
      trxIdLength: '10-12',
      sampleTrxId: '3829104821',
      smsSender: '16216',
      hasAppDeepLink: false,
      activationNoticeEn: 'To enable Rocket, activate the Rocket channel in your Paymently merchant dashboard and add rocket to PAYMENTLY_ENABLED_METHODS in cPanel.',
      activationNoticeBn: 'রকেট চালু করতে আপনার Paymently মার্চেন্ট ড্যাশবোর্ডে Rocket চ্যানেল সক্রিয় করুন এবং cPanel-এ PAYMENTLY_ENABLED_METHODS-এ rocket যোগ করুন।',
    },
    {
      id: 'upay',
      name: 'Upay',
      nameBn: 'উপায়',
      brandColor: '#005BAA',
      active: enabledList.includes('upay'),
      instructionEn: 'Pay via Paymently Upay Gateway',
      instructionBn: 'পেমেন্টলি উপায় গেটওয়ের মাধ্যমে পরিশোধ করুন',
      trxIdLength: '10',
      sampleTrxId: 'UP91248590',
      smsSender: 'UPAY (16419)',
      hasAppDeepLink: false,
      activationNoticeEn: 'To enable Upay, activate the Upay channel in your Paymently merchant dashboard and add upay to PAYMENTLY_ENABLED_METHODS in cPanel.',
      activationNoticeBn: 'উপায় চালু করতে আপনার Paymently মার্চেন্ট ড্যাশবোর্ডে Upay চ্যানেল সক্রিয় করুন এবং cPanel-এ PAYMENTLY_ENABLED_METHODS-এ upay যোগ করুন।',
    },
  ];

  return {
    enabledMethods: enabledList,
    methods,
    bookingFee: BOOKING_FEE_BDT,
    gatewayFee: GATEWAY_SURCHARGE_BDT,
    totalPayable: TOTAL_PAYABLE_GATEWAY_BDT,
  };
}

/**
 * Method-specific Transaction ID format validation.
 * Ensures bKash logic is NOT blindly reused for Nagad, Rocket, or Upay.
 */
export function validateMethodTrxId(
  method: string,
  trxId: string
): { valid: boolean; errorEn?: string; errorBn?: string } {
  const cleanId = (trxId || '').trim().toUpperCase();
  const m = (method || 'bkash').toLowerCase();

  if (!cleanId || cleanId.length < 6) {
    return {
      valid: false,
      errorEn: 'Please enter a valid Transaction ID.',
      errorBn: 'অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি প্রদান করুন।',
    };
  }

  if (m === 'bkash') {
    if (!/^[A-Z0-9]{8,12}$/.test(cleanId)) {
      return {
        valid: false,
        errorEn: 'Invalid bKash TrxID format. Expected 8-10 alphanumeric characters (e.g., BLK92X4KP1).',
        errorBn: 'ভুল বিকাশ TrxID ফরম্যাট। ৮-১০ অক্ষরের ট্রানজেকশন আইডি দিন (যেমন BLK92X4KP1)।',
      };
    }
  } else if (m === 'nagad') {
    if (!/^[A-Z0-9]{8,10}$/.test(cleanId)) {
      return {
        valid: false,
        errorEn: 'Invalid Nagad TrxID format. Expected 8 alphanumeric characters from SMS 16167 (e.g., 72K8PL9J).',
        errorBn: 'ভুল নগদ TrxID ফরম্যাট। ১৬১৬৭ থেকে প্রাপ্ত ৮ অক্ষরের ট্রানজেকশন আইডি দিন (যেমন 72K8PL9J)।',
      };
    }
  } else if (m === 'rocket') {
    if (!/^\d{9,13}$/.test(cleanId)) {
      return {
        valid: false,
        errorEn: 'Invalid Rocket TxnId format. Expected 10-12 numeric digits from SMS 16216 (e.g., 3829104821).',
        errorBn: 'ভুল রকেট ট্রানজেকশন আইডি। ১৬২১৬ থেকে প্রাপ্ত ১০-১২ ডিজিটের সংখ্যা লিখুন (যেমন 3829104821)।',
      };
    }
  } else if (m === 'upay') {
    if (!/^[A-Z0-9]{8,12}$/.test(cleanId)) {
      return {
        valid: false,
        errorEn: 'Invalid Upay TrxID format. Expected 10 alphanumeric characters from SMS 16419 (e.g., UP91248590).',
        errorBn: 'ভুল উপায় TrxID ফরম্যাট। ১৬৪১৯ থেকে প্রাপ্ত ১০ অক্ষরের ট্রানজেকশন আইডি দিন (যেমন UP91248590)।',
      };
    }
  }

  return { valid: true };
}

/**
 * Safely maps payment method string to valid MySQL payments.method ENUM value.
 * Standard ENUM includes: 'cash_at_chamber', 'online_payment', 'bkash', 'nagad', 'card'
 * If 'rocket' or 'upay' are provided before migration 010 is applied to MySQL,
 * falls back safely to 'online_payment' to avoid ER_WARN_DATA_TRUNCATED.
 */
export function safePaymentMethodEnum(method: string): string {
  const m = (method || '').toLowerCase().trim();
  if (['bkash', 'nagad', 'card', 'cash_at_chamber'].includes(m)) {
    return m;
  }
  // When 'rocket' or 'upay' are used, 'online_payment' is universally accepted by the schema
  return 'online_payment';
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
