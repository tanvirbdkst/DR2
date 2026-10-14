import {
  IPaymentGatewayAdapter,
  PaymentGatewayId,
  CreatePaymentSessionParams,
  CreatePaymentSessionResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  TestConnectionResult,
} from './types.js';

export class RocketAdapter implements IPaymentGatewayAdapter {
  readonly id: PaymentGatewayId = 'rocket';
  readonly name = 'DBBL Rocket Merchant';

  private resolveConfig(config: Record<string, any>) {
    const merchantId = (config.merchant_id || config.merchantId || '').trim();
    const secretKey = (config.secret_key || config.secretKey || config.apiKey || '').trim();
    const terminalId = (config.terminal_id || config.terminalId || '').trim();
    return { merchantId, secretKey, terminalId };
  }

  async testConnection(config: Record<string, any>, isSandbox: boolean): Promise<TestConnectionResult> {
    const creds = this.resolveConfig(config);

    if (!creds.merchantId || !creds.secretKey) {
      return {
        success: false,
        message: 'Credentials required: Rocket Merchant ID and Secret Key must be configured.',
      };
    }

    return {
      success: true,
      message: `DBBL Rocket credentials saved (${isSandbox ? 'Sandbox/Test Mode' : 'Live Production'}).`,
      details: { merchantId: creds.merchantId, terminalId: creds.terminalId || 'Default' },
    };
  }

  async createSession(
    config: Record<string, any>,
    isSandbox: boolean,
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentSessionResult> {
    const creds = this.resolveConfig(config);
    if (!creds.merchantId || !creds.secretKey) {
      return {
        success: false,
        error: 'DBBL Rocket credentials required.',
      };
    }

    return {
      success: false,
      error: 'Rocket Direct checkout integration requires bank host whitelisting and bilateral encryption certificate.',
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
      verifiedBy: 'rocket',
      error: 'Rocket verification requires bank host response validation.',
    };
  }
}
