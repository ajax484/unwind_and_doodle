export interface PaymentCustomer {
  email: string;
  name?: string;
  phone?: string;
}

export interface PaymentInput {
  reference: string;
  amount: number; // in standard currency unit, e.g. 15000 NGN
  currency: string; // 'NGN'
  customer: PaymentCustomer;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
  description?: string;
}

export interface PaymentInitialization {
  authorizationUrl: string;
  reference: string;
  provider: string;
}

export interface PaymentVerification {
  status: 'successful' | 'failed' | 'pending';
  reference: string;
  providerReference?: string;
  amount: number; // in standard currency unit
  currency: string; // 'NGN'
  paidAt?: string;
  channel?: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentWebhookVerification {
  isValid: boolean;
  event?: string;
  reference?: string;
  transactionId?: string | number;
  payload?: any;
}

export interface PaymentRefundInput {
  transaction: string; // transaction reference or provider ID
  amount?: number; // in standard currency unit, e.g. 15000 NGN (optional for full refund)
  merchantNote?: string;
  customerNote?: string;
}

export interface PaymentRefundResult {
  status: 'processed' | 'pending' | 'failed';
  refundId?: string | number;
  amount: number;
  currency: string;
  transactionReference: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;

  /**
   * Generates a unique transaction reference identifier.
   */
  generateReference(prefix?: string): string;

  /**
   * Initializes a transaction with the payment provider.
   */
  initializeTransaction(input: PaymentInput): Promise<PaymentInitialization>;

  /**
   * Directly verifies a transaction with the payment provider API.
   */
  verifyTransaction(reference: string, transactionId?: string | number): Promise<PaymentVerification>;

  /**
   * Validates webhook authentication headers and parses the webhook payload.
   */
  verifyWebhook(
    rawBody: string,
    headers: Headers | Record<string, string | null | undefined>
  ): Promise<PaymentWebhookVerification>;

  /**
   * Requests a refund with the payment provider.
   */
  refundTransaction?(input: PaymentRefundInput): Promise<PaymentRefundResult>;
}
