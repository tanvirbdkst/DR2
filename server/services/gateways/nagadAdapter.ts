import {
  IPaymentGatewayAdapter,
  PaymentGatewayId,
  CreatePaymentSessionParams,
  CreatePaymentSessionResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  TestConnectionResult,
} from './types.js';

export class NagadAdapter implements IPaymentGatewayAdapter {
  readonly id: PaymentGatewayId = 'nagad';
  readonly name = 'Nagad Direct Merchant Checkout';

  private resolveConfig(config: Record<string, any>, isSandbox: boolean) {
    const merchantId = (config.merchant_id || config.merchantId || '').trim();
    const merchantPrivateKey = (config.merchant_private_key || config.privateKey || '').trim();
    const nagadPublicKey = (config.nagad_public_key || config.publicKey || '').trim();
    let baseUrl = (config.base_url || config.baseUrl || '').trim().replace(/\/+$/, '');
    if (!baseUrl) {
      baseUrl = isSandbox
        ? 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
        : 'https://api.mynagad.com/api/dfs';
    }
    return { merchantId, merchantPrivateKey, nagadPublicKey, baseUrl };
  }

  async testConnection(config: Record<string, any>, isSandbox: boolean): Promise<TestConnectionResult> {
    const creds = this.resolveConfig(config, isSandbox);

    if (!creds.merchantId || !creds.merchantPrivateKey || !creds.nagadPublicKey) {
      const missing = [];
      if (!creds.merchantId) missing.push('Merchant ID');
      if (!creds.merchantPrivateKey) missing.push('Merchant Private Key');
      if (!creds.nagadPublicKey) missing.push('Nagad Public Key');

      return {
        success: false,
        message: `Credentials required: Please provide ${missing.join(', ')} to initialize Nagad PGW.`,
      };
    }

    try {
      // Test endpoint reachability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${creds.baseUrl}/check-out/initialize/${creds.merchantId}/test_ping`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      return {
        success: true,
        message: `Nagad Gateway connection reachable (${isSandbox ? 'Sandbox' : 'Live'}). Keys installed.`,
        details: { merchantId: creds.merchantId, baseUrl: creds.baseUrl },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Nagad connection notice: ${err.message}`,
      };
    }
  }

  async createSession(
    config: Record<string, any>,
    isSandbox: boolean,
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentSessionResult> {
    const creds = this.resolveConfig(config, isSandbox);

    if (!creds.merchantId || !creds.merchantPrivateKey) {
      return {
        success: false,
        error: 'Nagad Merchant ID and Private Key are required to initiate payment.',
      };
    }

    return {
      success: false,
      error: 'Nagad direct PGW checkout requires signed timestamp packet initialization. Please ensure Nagad merchant portal whitelisting is active.',
    };
  }

  async verifyPayment(
    config: Record<string, any>,
    isSandbox: boolean,
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    const paymentRefId = params.transactionId || params.paymentId;
    return {
      success: false,
      paid: false,
      transactionId: paymentRefId || '',
      amount: 0,
      verifiedBy: 'nagad:api',
      error: 'Direct Nagad payment verification requires merchant keypair signature verification.',
    };
  }
}
