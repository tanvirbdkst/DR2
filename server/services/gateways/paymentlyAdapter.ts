import {
  IPaymentGatewayAdapter,
  PaymentGatewayId,
  CreatePaymentSessionParams,
  CreatePaymentSessionResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  TestConnectionResult,
} from './types.js';

export class PaymentlyAdapter implements IPaymentGatewayAdapter {
  readonly id: PaymentGatewayId = 'paymently';
  readonly name = 'Paymently Gateway';

  private resolveCredentials(config: Record<string, any>) {
    const apiKey = (config.apiKey || config.api_key || process.env.PAYMENTLY_API_KEY || '').trim();
    let rawUrl = (config.baseUrl || config.base_url || process.env.PAYMENTLY_BASE_URL || 'https://daktarserial.paymently.io/api').trim().replace(/\/+$/, '');
    const baseUrl = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;
    return { apiKey, baseUrl };
  }

  async testConnection(config: Record<string, any>, isSandbox: boolean): Promise<TestConnectionResult> {
    const { apiKey, baseUrl } = this.resolveCredentials(config);

    if (!apiKey) {
      return {
        success: false,
        message: 'Paymently API Key is missing. Please configure your API key before testing connection.',
      };
    }

    try {
      const verifyUrl = `${baseUrl}/verify-payment`;
      // Send a ping / probe to verify endpoint with dummy payload to test authentication
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'RT-UDDOKTAPAY-API-KEY': apiKey,
          'RT-PAYMENTLY-API-KEY': apiKey,
        },
        body: JSON.stringify({ invoice_id: 'probe_test_ping_000' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 401/403 means bad credentials
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          message: `Authentication Failed (${res.status}): Invalid API Key or Unauthorized by Paymently.`,
          details: { status: res.status },
        };
      }

      // If status is 200, or 400/404 with invoice not found, authentication itself was validated by server!
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        message: `Successfully connected to Paymently Gateway (${baseUrl}). Authenticated.`,
        details: { status: res.status, apiBase: baseUrl, sandbox: isSandbox },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection failed: ${err.message || 'Network timeout or unreachable endpoint'}`,
        details: { error: err.message },
      };
    }
  }

  async createSession(
    config: Record<string, any>,
    isSandbox: boolean,
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentSessionResult> {
    const { apiKey, baseUrl } = this.resolveCredentials(config);

    if (!apiKey) {
      return {
        success: false,
        error: 'Paymently API credentials not configured in Payment Gateway Settings.',
      };
    }

    try {
      const checkoutUrl = `${baseUrl}/checkout-v2`;
      const payload = {
        full_name: params.customerName,
        email: params.customerEmail || `${params.customerPhone}@daktarserial.bd`,
        amount: String(Number(params.amount).toFixed(2)),
        metadata: {
          appointmentId: String(params.appointmentId),
          transactionRef: params.transactionRef,
          customerPhone: params.customerPhone,
          bookingFee: params.bookingFee,
          consultationFee: params.consultationFee,
          surchargeFee: params.surchargeFee,
          gatewayId: 'paymently',
        },
        redirect_url: `${params.redirectBaseUrl}/booking-confirmation?ref=${params.transactionRef}&gateway=paymently`,
        cancel_url: `${params.redirectBaseUrl}/booking-confirmation?ref=${params.transactionRef}&cancelled=1`,
        webhook_url: `${params.redirectBaseUrl}/api/payments/webhook`,
      };

      const res = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'RT-UDDOKTAPAY-API-KEY': apiKey,
          'RT-PAYMENTLY-API-KEY': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || (!data.payment_url && !data.checkout_url && !data.url)) {
        return {
          success: false,
          error: data.message || `Paymently rejected session initiation (HTTP ${res.status})`,
          rawResponse: data,
        };
      }

      const paymentUrl = data.payment_url || data.checkout_url || data.url;
      const invoiceId = data.invoice_id || data.id || data.invoiceId;

      return {
        success: true,
        paymentUrl,
        redirectUrl: paymentUrl,
        transactionId: invoiceId,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Paymently session creation error: ${err.message}`,
      };
    }
  }

  async verifyPayment(
    config: Record<string, any>,
    isSandbox: boolean,
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    const { apiKey, baseUrl } = this.resolveCredentials(config);

    if (!apiKey) {
      return {
        success: false,
        paid: false,
        transactionId: params.transactionId || '',
        amount: 0,
        verifiedBy: 'paymently',
        error: 'Paymently API Key missing on server.',
      };
    }

    try {
      const invoiceId = params.transactionId || params.paymentId;
      if (!invoiceId) {
        return {
          success: false,
          paid: false,
          transactionId: '',
          amount: 0,
          verifiedBy: 'paymently',
          error: 'Missing transaction/invoice ID for Paymently verification.',
        };
      }

      const res = await fetch(`${baseUrl}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'RT-UDDOKTAPAY-API-KEY': apiKey,
          'RT-PAYMENTLY-API-KEY': apiKey,
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });

      const data = await res.json().catch(() => ({}));
      const rawStatus = (data.status || '').toUpperCase();
      const isPaid = rawStatus === 'COMPLETED' || rawStatus === 'PAID' || rawStatus === 'SUCCESS';

      return {
        success: true,
        paid: isPaid,
        transactionId: data.transaction_id || invoiceId,
        amount: Number(data.amount || data.charged_amount || 0),
        method: data.payment_method || 'online_payment',
        verifiedBy: 'paymently:verify-payment',
        rawResponse: data,
        error: isPaid ? undefined : `Payment status is ${rawStatus}`,
      };
    } catch (err: any) {
      return {
        success: false,
        paid: false,
        transactionId: params.transactionId || '',
        amount: 0,
        verifiedBy: 'paymently',
        error: `Verification request failed: ${err.message}`,
      };
    }
  }
}
