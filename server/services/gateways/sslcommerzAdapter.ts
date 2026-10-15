import {
  IPaymentGatewayAdapter,
  PaymentGatewayId,
  CreatePaymentSessionParams,
  CreatePaymentSessionResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  TestConnectionResult,
} from './types.js';

export class SslcommerzAdapter implements IPaymentGatewayAdapter {
  readonly id: PaymentGatewayId = 'sslcommerz';
  readonly name = 'SSLCommerz Payment Gateway';

  private resolveConfig(config: Record<string, any>, isSandbox: boolean) {
    const storeId = (config.store_id || config.storeId || '').trim();
    const storePassword = (config.store_passwd || config.storePassword || config.secretKey || '').trim();
    let baseUrl = (config.base_url || config.baseUrl || '').trim().replace(/\/+$/, '');
    if (!baseUrl) {
      baseUrl = isSandbox
        ? 'https://sandbox.sslcommerz.com'
        : 'https://securepay.sslcommerz.com';
    }
    return { storeId, storePassword, baseUrl };
  }

  async testConnection(config: Record<string, any>, isSandbox: boolean): Promise<TestConnectionResult> {
    const creds = this.resolveConfig(config, isSandbox);

    if (!creds.storeId || !creds.storePassword) {
      return {
        success: false,
        message: 'Credentials required: SSLCommerz Store ID and Store Password must be provided.',
      };
    }

    try {
      // Validate credentials against SSLCommerz Session API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const params = new URLSearchParams();
      params.append('store_id', creds.storeId);
      params.append('store_passwd', creds.storePassword);
      params.append('total_amount', '10.00');
      params.append('currency', 'BDT');
      params.append('tran_id', `TEST-PING-${Date.now()}`);
      params.append('success_url', 'https://example.com/success');
      params.append('fail_url', 'https://example.com/fail');
      params.append('cancel_url', 'https://example.com/cancel');
      params.append('cus_name', 'Test Ping');
      params.append('cus_email', 'test@daktarserial.bd');
      params.append('cus_phone', '01700000000');
      params.append('shipping_method', 'NO');
      params.append('product_name', 'Healthcare Test');
      params.append('product_category', 'Healthcare');
      params.append('product_profile', 'general');

      const res = await fetch(`${creds.baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (data.status === 'SUCCESS' || data.GatewayPageURL) {
        return {
          success: true,
          message: `SSLCommerz credentials verified successfully (${isSandbox ? 'Sandbox' : 'Live'}).`,
          details: { storeId: creds.storeId, isSandbox },
        };
      }

      if (data.failedreason && data.failedreason.toLowerCase().includes('credential')) {
        return {
          success: false,
          message: `Authentication Failed: ${data.failedreason}`,
          details: { error: data.failedreason },
        };
      }

      return {
        success: true,
        message: `Connected to SSLCommerz API (${creds.baseUrl}). Store registered.`,
        details: { responseStatus: data.status || 'OK' },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `SSLCommerz connection check failed: ${err.message}`,
      };
    }
  }

  async createSession(
    config: Record<string, any>,
    isSandbox: boolean,
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentSessionResult> {
    const creds = this.resolveConfig(config, isSandbox);
    if (!creds.storeId || !creds.storePassword) {
      return {
        success: false,
        error: 'SSLCommerz Store ID and Password are not configured.',
      };
    }

    try {
      const postData = new URLSearchParams();
      postData.append('store_id', creds.storeId);
      postData.append('store_passwd', creds.storePassword);
      postData.append('total_amount', String(Number(params.amount).toFixed(2)));
      postData.append('currency', 'BDT');
      postData.append('tran_id', params.transactionRef);
      postData.append('success_url', `${params.redirectBaseUrl}/api/payments/sslcommerz/callback?ref=${params.transactionRef}`);
      postData.append('fail_url', `${params.redirectBaseUrl}/booking-confirmation?ref=${params.transactionRef}&failed=1`);
      postData.append('cancel_url', `${params.redirectBaseUrl}/booking-confirmation?ref=${params.transactionRef}&cancelled=1`);
      postData.append('cus_name', params.customerName);
      postData.append('cus_email', params.customerEmail || `${params.customerPhone}@daktarserial.bd`);
      postData.append('cus_phone', params.customerPhone);
      postData.append('shipping_method', 'NO');
      postData.append('product_name', 'Doctor Serial Appointment Booking');
      postData.append('product_category', 'Healthcare');
      postData.append('product_profile', 'general');

      const res = await fetch(`${creds.baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData.toString(),
      });

      const data = await res.json().catch(() => ({}));
      if (data.status === 'SUCCESS' && data.GatewayPageURL) {
        return {
          success: true,
          paymentUrl: data.GatewayPageURL,
          redirectUrl: data.GatewayPageURL,
          transactionId: params.transactionRef,
          rawResponse: data,
        };
      }

      return {
        success: false,
        error: data.failedreason || 'SSLCommerz session creation failed.',
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `SSLCommerz error: ${err.message}`,
      };
    }
  }

  async verifyPayment(
    config: Record<string, any>,
    isSandbox: boolean,
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    const creds = this.resolveConfig(config, isSandbox);
    const valId = params.rawPayload?.val_id || params.transactionId;

    if (!valId) {
      return {
        success: false,
        paid: false,
        transactionId: '',
        amount: 0,
        verifiedBy: 'sslcommerz',
        error: 'Missing validation ID (val_id) for SSLCommerz payment validation.',
      };
    }

    try {
      const verifyUrl = `${creds.baseUrl}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(creds.storeId)}&store_passwd=${encodeURIComponent(creds.storePassword)}&format=json`;
      const res = await fetch(verifyUrl);
      const data = await res.json().catch(() => ({}));

      const isPaid = (data.status === 'VALID' || data.status === 'VALIDATED') && data.tran_id;

      return {
        success: true,
        paid: Boolean(isPaid),
        transactionId: data.bank_tran_id || data.tran_id || valId,
        amount: Number(data.amount || 0),
        method: data.card_type || 'sslcommerz',
        verifiedBy: 'sslcommerz:validator',
        rawResponse: data,
        error: isPaid ? undefined : `SSLCommerz validation status: ${data.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        paid: false,
        transactionId: valId,
        amount: 0,
        verifiedBy: 'sslcommerz',
        error: `SSLCommerz validation failed: ${err.message}`,
      };
    }
  }
}
