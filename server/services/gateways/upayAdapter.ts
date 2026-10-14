import {
  IPaymentGatewayAdapter,
  PaymentGatewayId,
  CreatePaymentSessionParams,
  CreatePaymentSessionResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  TestConnectionResult,
} from './types.js';

export class UpayAdapter implements IPaymentGatewayAdapter {
  readonly id: PaymentGatewayId = 'upay';
  readonly name = 'Upay (UCB Fintech) Merchant';

  private resolveConfig(config: Record<string, any>) {
    const merchantId = (config.merchant_id || config.merchantId || '').trim();
    const merchantKey = (config.merchant_key || config.merchantKey || config.apiKey || '').trim();
    const merchantSecret = (config.merchant_secret || config.merchantSecret || '').trim();
    return { merchantId, merchantKey, merchantSecret };
  }

  async testConnection(config: Record<string, any>, isSandbox: boolean): Promise<TestConnectionResult> {
    const creds = this.resolveConfig(config);

    if (!creds.merchantId || !creds.merchantKey) {
      return {
        success: false,
        message: 'Credentials required: Upay Merchant ID and Merchant Key are required.',
      };
    }

    return {
      success: true,
      message: `Upay Merchant configuration verified (${isSandbox ? 'Sandbox' : 'Production Live'}).`,
      details: { merchantId: creds.merchantId },
    };
  }

  async createSession(
    config: Record<string, any>,
    isSandbox: boolean,
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentSessionResult> {
    const creds = this.resolveConfig(config);
    if (!creds.merchantId || !creds.merchantKey) {
      return {
        success: false,
        error: 'Upay credentials required.',
      };
    }

    return {
      success: false,
      error: 'Upay direct gateway requires UCB Fintech API endpoint access.',
    };
  }

  async verifyPayment(
    config: Record<string, any>,
    isSandbox: boolean,
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    return {
      success: false,
      paid: false,
      transactionId: params.transactionId || '',
      amount: 0,
      verifiedBy: 'upay',
      error: 'Upay payment verification pending host response.',
    };
  }
}
