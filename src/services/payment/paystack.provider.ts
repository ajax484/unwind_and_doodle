import crypto from 'crypto';
import { getConfig } from '../../lib/config';
import {
  PaymentProvider,
  PaymentInput,
  PaymentInitialization,
  PaymentVerification,
  PaymentWebhookVerification,
} from './provider.interface';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export class PaystackPaymentProvider implements PaymentProvider {
  readonly name = 'paystack';

  private readonly secretKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: { secretKey?: string; fetchFn?: typeof fetch }) {
    this.secretKey =
      options?.secretKey ||
      getConfig().paystackSecretKey ||
      (process.env.NODE_ENV === 'test' ? 'sk_test_dummy' : '');
    this.fetchFn = options?.fetchFn || fetch;
  }

  generateReference(prefix = 'UAD'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  async initializeTransaction(input: PaymentInput): Promise<PaymentInitialization> {
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    // Paystack amounts are in kobo (smallest currency unit for NGN)
    const amountInKobo = Math.round(input.amount * 100);

    const payload = {
      email: input.customer.email,
      amount: amountInKobo,
      reference: input.reference,
      currency: input.currency || 'NGN',
      callback_url: input.redirectUrl,
      metadata: {
        ...(input.metadata || {}),
        custom_fields: [
          {
            display_name: 'Customer Name',
            variable_name: 'customer_name',
            value: input.customer.name || input.customer.email,
          },
          ...(input.customer.phone
            ? [
                {
                  display_name: 'Phone Number',
                  variable_name: 'phone_number',
                  value: input.customer.phone,
                },
              ]
            : []),
        ],
      },
    };

    const response = await this.fetchFn(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as {
      status: boolean;
      message: string;
      data?: { authorization_url: string; reference: string; access_code?: string };
    };

    if (!response.ok || !json.status || !json.data?.authorization_url) {
      throw new Error(
        `Paystack initialization failed: ${json.message || response.statusText || 'Unknown error'}`
      );
    }

    return {
      authorizationUrl: json.data.authorization_url,
      reference: json.data.reference || input.reference,
      provider: this.name,
    };
  }

  async verifyTransaction(reference: string): Promise<PaymentVerification> {
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    const response = await this.fetchFn(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const json = (await response.json()) as {
      status: boolean;
      message: string;
      data?: {
        id: number;
        status: string;
        reference: string;
        amount: number; // in kobo
        currency: string;
        channel?: string;
        paid_at?: string;
        gateway_response?: string;
        [key: string]: unknown;
      };
    };

    if (!response.ok || !json.status || !json.data) {
      throw new Error(
        `Paystack verification failed: ${json.message || response.statusText || 'Unknown error'}`
      );
    }

    const data = json.data;
    const normalizedStatus =
      data.status === 'success'
        ? 'successful'
        : data.status === 'pending'
        ? 'pending'
        : 'failed';

    return {
      status: normalizedStatus,
      reference: data.reference,
      providerReference: String(data.id),
      amount: data.amount / 100, // convert kobo back to standard NGN
      currency: data.currency,
      paidAt: data.paid_at,
      channel: data.channel,
      rawResponse: data as Record<string, unknown>,
    };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Headers | Record<string, string | null | undefined>
  ): Promise<PaymentWebhookVerification> {
    let signatureHeader: string | null = null;
    if (headers instanceof Headers) {
      signatureHeader = headers.get('x-paystack-signature');
    } else {
      signatureHeader =
        headers['x-paystack-signature'] ||
        headers['X-Paystack-Signature'] ||
        null;
    }

    if (!this.secretKey || !signatureHeader) {
      return { isValid: false };
    }

    try {
      const hash = crypto.createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
      const hashBuffer = Buffer.from(hash, 'utf8');
      const signatureBuffer = Buffer.from(signatureHeader, 'utf8');

      if (hashBuffer.length !== signatureBuffer.length) {
        return { isValid: false };
      }

      const isValid = crypto.timingSafeEqual(hashBuffer, signatureBuffer);
      if (!isValid) return { isValid: false };

      const payload = JSON.parse(rawBody);
      return {
        isValid: true,
        event: payload.event,
        reference: payload.data?.reference,
        transactionId: payload.data?.id,
        payload,
      };
    } catch {
      return { isValid: false };
    }
  }

  async refundTransaction(input: {
    transaction: string;
    amount?: number;
    merchantNote?: string;
    customerNote?: string;
  }) {
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    const payload: Record<string, unknown> = {
      transaction: input.transaction,
    };
    if (input.amount !== undefined && input.amount > 0) {
      payload.amount = Math.round(input.amount * 100);
    }
    if (input.merchantNote) {
      payload.merchant_note = input.merchantNote;
    }
    if (input.customerNote) {
      payload.customer_note = input.customerNote;
    }

    const response = await this.fetchFn(`${PAYSTACK_BASE_URL}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as {
      status: boolean;
      message: string;
      data?: {
        id: number;
        status: string;
        amount: number;
        currency: string;
        transaction_reference?: string;
        transaction?: { reference?: string };
        [key: string]: unknown;
      };
    };

    if (!response.ok || !json.status || !json.data) {
      throw new Error(
        `Paystack refund failed: ${json.message || response.statusText || 'Unknown error'}`
      );
    }

    const data = json.data;
    const normalizedStatus: 'processed' | 'pending' | 'failed' =
      data.status === 'processed' || data.status === 'success'
        ? 'processed'
        : data.status === 'pending'
        ? 'pending'
        : 'failed';

    return {
      status: normalizedStatus,
      refundId: String(data.id),
      amount: (data.amount || 0) / 100,
      currency: data.currency || 'NGN',
      transactionReference:
        data.transaction_reference ||
        data.transaction?.reference ||
        input.transaction,
      rawResponse: data as Record<string, unknown>,
    };
  }
}
