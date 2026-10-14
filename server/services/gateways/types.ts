export type PaymentGatewayId = 'paymently' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'sslcommerz';

export interface PaymentGatewayRecord {
  id: PaymentGatewayId;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_enabled: number; // 0 or 1
  is_sandbox: number; // 0 or 1
  config_encrypted: string | null;
  supported_methods: string | null; // JSON string e.g. '["bkash", "nagad"]'
  surcharge_percentage: number;
  surcharge_fixed: number;
  sort_order: number;
  last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | 'untested';
  last_test_message: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentGatewayPublicView {
  id: PaymentGatewayId;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_enabled: boolean;
  is_sandbox: boolean;
  supported_methods: string[];
  surcharge_percentage: number;
  surcharge_fixed: number;
  sort_order: number;
  last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | 'untested';
  last_test_message: string | null;
  masked_config?: Record<string, any>;
  has_credentials: boolean;
}

export interface CreatePaymentSessionParams {
  transactionRef: string;
  appointmentId: string | number;
  amount: number;
  bookingFee: number;
  consultationFee: number;
  surchargeFee: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod?: string;
  redirectBaseUrl: string;
  callbackUrl?: string;
  webhookUrl?: string;
}

export interface CreatePaymentSessionResult {
  success: boolean;
  redirectUrl?: string;
  paymentUrl?: string;
  transactionId?: string;
  rawResponse?: any;
  error?: string;
  instructions?: string;
}

export interface VerifyPaymentParams {
  transactionRef?: string;
  transactionId?: string;
  paymentId?: string;
  rawPayload?: any;
}

export interface VerifyPaymentResult {
  success: boolean;
  paid: boolean;
  transactionId: string;
  amount: number;
  method?: string;
  verifiedBy: string;
  rawResponse?: any;
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface GatewayAuditLog {
  id?: number;
  gateway_id: string;
  admin_id?: number | null;
  admin_email?: string | null;
  action: string;
  changes?: Record<string, any> | string | null;
  ip_address?: string | null;
  created_at?: string;
}

export interface IPaymentGatewayAdapter {
  readonly id: PaymentGatewayId;
  readonly name: string;

  /**
   * Test API credentials and network connectivity to the provider.
   */
  testConnection(config: Record<string, any>, isSandbox: boolean): Promise<TestConnectionResult>;

  /**
   * Initiates payment flow / generates provider redirect URL.
   */
  createSession(
    config: Record<string, any>,
    isSandbox: boolean,
    params: CreatePaymentSessionParams
  ): Promise<CreatePaymentSessionResult>;

  /**
   * Strictly verify payment status directly with provider's server.
   */
  verifyPayment(
    config: Record<string, any>,
    isSandbox: boolean,
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult>;
}
