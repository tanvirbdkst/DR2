import {
  IPaymentGatewayAdapter,
  PaymentGatewayId,
  CreatePaymentSessionParams,
  CreatePaymentSessionResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  TestConnectionResult,
} from './types.js';

export class BkashAdapter implements IPaymentGatewayAdapter {
  readonly id: PaymentGatewayId = 'bkash';
  readonly name = 'bKash Direct Merchant Checkout';

  private resolveConfig(config: Record<string, any>, isSandbox: boolean) {
    const appKey = (config.app_key || config.appKey || process.env.BKASH_APP_KEY || '').trim();
    const appSecret = (config.app_secret || config.appSecret || process.env.BKASH_APP_SECRET || '').trim();
    const username = (config.username || config.userName || process.env.BKASH_USERNAME || '').trim();
    const password = (config.password || process.env.BKASH_PASSWORD || '').trim();

    let baseUrl = (config.base_url || config.baseUrl || '').trim().replace(/\/+$/, '');
    if (!baseUrl) {
      baseUrl = isSandbox
        ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
        : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
    }

    return { appKey, appSecret, username, password, baseUrl };
  }

  /**
   * Request bKash auth token (id_token) using appKey & appSecret
   */
  private async grantToken(credentials: {
    appKey: string;
    appSecret: string;
    username: string;
    password: string;
    baseUrl: string;
  }): Promise<{ idToken?: string; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${credentials.baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'username': credentials.username,
          'password': credentials.password,
        },
        body: JSON.stringify({
          app_key: credentials.appKey,
          app_secret: credentials.appSecret,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.id_token) {
        return {
          error: data.statusMessage || data.message || `bKash auth error (HTTP ${res.status})`,
        };
      }

      return { idToken: data.id_token };
    } catch (err: any) {
      return { error: `Network error connecting to bKash: ${err.message}` };
    }
  }

  async testConnection(config: Record<string, any>, isSandbox: boolean): Promise<TestConnectionResult> {
    const creds = this.resolveConfig(config, isSandbox);

    if (!creds.appKey || !creds.appSecret || !creds.username || !creds.password) {
      const missing = [];
      if (!creds.appKey) missing.push('App Key');
      if (!creds.appSecret) missing.push('App Secret');
      if (!creds.username) missing.push('Username');
      if (!creds.password) missing.push('Password');

      return {
        success: false,
        message: `Missing required bKash credentials: ${missing.join(', ')}`,
      };
    }

    const { idToken, error } = await this.grantToken(creds);

    if (!idToken || error) {
      return {
        success: false,
        message: `bKash Token Grant Failed: ${error}`,
        details: { endpoint: creds.baseUrl, isSandbox },
      };
    }

    return {
      success: true,
      message: `bKash Tokenized Merchant API successfully authenticated (${isSandbox ? 'Sandbox' : 'Live'}).`,
      details: {
        mode: isSandbox ? 'Sandbox' : 'Production Live',
        tokenAcquired: true,
        baseUrl: creds.baseUrl,
      },
    };
  }

  async createSession(
    config: Record<string, any>,
    isSandbox: boolean,
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentSessionResult> {
    const creds = this.resolveConfig(config, isSandbox);
    const { idToken, error: tokenError } = await this.grantToken(creds);

    if (!idToken || tokenError) {
      return {
        success: false,
        error: `bKash Authorization Failed: ${tokenError}`,
      };
    }

    try {
      const callbackURL = `${params.redirectBaseUrl}/api/payments/bkash/callback?ref=${params.transactionRef}`;

      const res = await fetch(`${creds.baseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': idToken,
          'X-APP-Key': creds.appKey,
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: params.customerPhone,
          callbackURL,
          amount: String(Number(params.amount).toFixed(2)),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: params.transactionRef,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || (!data.bkashURL && !data.redirectURL)) {
        return {
          success: false,
          error: data.statusMessage || data.message || `bKash create payment failed (HTTP ${res.status})`,
          rawResponse: data,
        };
      }

      const paymentUrl = data.bkashURL || data.redirectURL;
      const paymentID = data.paymentID;

      return {
        success: true,
        paymentUrl,
        redirectUrl: paymentUrl,
        transactionId: paymentID,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `bKash session error: ${err.message}`,
      };
    }
  }

  async verifyPayment(
    config: Record<string, any>,
    isSandbox: boolean,
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    const creds = this.resolveConfig(config, isSandbox);
    const { idToken, error: tokenError } = await this.grantToken(creds);

    const paymentID = params.paymentId || params.transactionId;
    if (!paymentID) {
      return {
        success: false,
        paid: false,
        transactionId: '',
        amount: 0,
        verifiedBy: 'bkash',
        error: 'Payment ID is missing for bKash verification.',
      };
    }

    if (!idToken || tokenError) {
      return {
        success: false,
        paid: false,
        transactionId: paymentID,
        amount: 0,
        verifiedBy: 'bkash',
        error: `bKash Token Grant Failed: ${tokenError}`,
      };
    }

    try {
      // First try executing payment if pending execution
      let execRes = await fetch(`${creds.baseUrl}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': idToken,
          'X-APP-Key': creds.appKey,
        },
        body: JSON.stringify({ paymentID }),
      });

      let execData = await execRes.json().catch(() => ({}));

      // If already executed or status query needed
      if (!execData.trxID || execData.transactionStatus !== 'Completed') {
        const queryRes = await fetch(`${creds.baseUrl}/tokenized/checkout/payment/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': idToken,
            'X-APP-Key': creds.appKey,
          },
          body: JSON.stringify({ paymentID }),
        });
        const queryData = await queryRes.json().catch(() => ({}));
        if (queryData.trxID) {
          execData = queryData;
        }
      }

      const isCompleted = execData.transactionStatus === 'Completed' && Boolean(execData.trxID);

      return {
        success: true,
        paid: isCompleted,
        transactionId: execData.trxID || paymentID,
        amount: Number(execData.amount || 0),
        method: 'bkash',
        verifiedBy: 'bkash:tokenized-execute',
        rawResponse: execData,
        error: isCompleted ? undefined : (execData.statusMessage || `bKash status: ${execData.transactionStatus}`),
      };
    } catch (err: any) {
      return {
        success: false,
        paid: false,
        transactionId: paymentID,
        amount: 0,
        verifiedBy: 'bkash',
        error: `bKash verification error: ${err.message}`,
      };
    }
  }
}
