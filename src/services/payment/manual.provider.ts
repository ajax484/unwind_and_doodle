import crypto from 'crypto';
import {
  PaymentProvider,
  PaymentInput,
  PaymentInitialization,
  PaymentVerification,
  PaymentWebhookVerification,
  PaymentRefundInput,
  PaymentRefundResult,
} from './provider.interface';

/**
 * Minimal PaymentProvider implementation for manual / bank transfer orders.
 * Manual payments do not redirect to or verify with an external payment gateway API.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual';

  generateReference(prefix = 'UAD_MAN'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  async initializeTransaction(input: PaymentInput): Promise<PaymentInitialization> {
    return {
      authorizationUrl: input.redirectUrl || '',
      reference: input.reference,
      provider: this.name,
    };
  }

  async verifyTransaction(reference: string): Promise<PaymentVerification> {
    throw new Error(
      `Manual payment ${reference} cannot be verified via gateway API. Admin verification is required in the dashboard.`
    );
  }

  async verifyWebhook(): Promise<PaymentWebhookVerification> {
    return { isValid: false };
  }

  async refundTransaction(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    return {
      status: 'processed',
      amount: input.amount || 0,
      currency: 'NGN',
      transactionReference: input.transaction,
      rawResponse: { note: input.merchantNote || 'Manual refund recorded' },
    };
  }
}
