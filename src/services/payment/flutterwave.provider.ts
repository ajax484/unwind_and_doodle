import crypto from 'crypto';
import { getConfig } from '../../lib/config';
import {
  PaymentProvider,
  PaymentInput,
  PaymentInitialization,
  PaymentVerification,
  PaymentWebhookVerification,
} from './provider.interface';

const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

export class FlutterwavePaymentProvider implements PaymentProvider {
  readonly name = 'flutterwave';

  private readonly secretKey: string;
  private readonly secretHash: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: {
    secretKey?: string;
    secretHash?: string;
    fetchFn?: typeof fetch;
  }) {
    const config = getConfig();
    this.secretKey =
      options?.secretKey ||
      config.flutterwaveSecretKey ||
      (process.env.NODE_ENV === 'test' ? 'flw_sec_dummy' : '');
    this.secretHash =
      options?.secretHash ||
      config.flutterwaveSecretHash ||
      (process.env.NODE_ENV === 'test' ? 'flw_hash_dummy' : '');
    this.fetchFn = options?.fetchFn || fetch;
  }

  generateReference(prefix = 'UAD_FLW'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  async initializeTransaction(input: PaymentInput): Promise<PaymentInitialization> {
    if (!this.secretKey) {
      throw new Error('FLUTTERWAVE_SECRET_KEY is not configured');
    }

    const payload = {
      tx_ref: input.reference,
      amount: input.amount,
      currency: input.currency || 'NGN',
      redirect_url: input.redirectUrl,
      customer: {
        email: input.customer.email,
        phonenumber: input.customer.phone || undefined,
        name: input.customer.name || undefined,
      },
      customizations: {
        title: 'Unwind & Doodle',
        description: input.description || `Payment for order ${input.reference}`,
      },
      meta: input.metadata,
    };

    const response = await this.fetchFn(`${FLUTTERWAVE_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as {
      status: string;
      message: string;
      data?: { link: string };
    };

    if (!response.ok || json.status !== 'success' || !json.data?.link) {
      throw new Error(
        `Flutterwave initialization failed: ${json.message || response.statusText || 'Unknown error'}`
      );
    }

    return {
      authorizationUrl: json.data.link,
      reference: input.reference,
      provider: this.name,
    };
  }

  async verifyTransaction(
    reference: string,
    transactionId?: string | number
  ): Promise<PaymentVerification> {
    if (!this.secretKey) {
      throw new Error('FLUTTERWAVE_SECRET_KEY is not configured');
    }

    let url: string;
    if (transactionId) {
      url = `${FLUTTERWAVE_BASE_URL}/transactions/${encodeURIComponent(transactionId)}/verify`;
    } else {
      url = `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;
    }

    const response = await this.fetchFn(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const json = (await response.json()) as {
      status: string;
      message: string;
      data?: {
        id: number;
        tx_ref: string;
        flw_ref: string;
        amount: number;
        currency: string;
        status: string;
        payment_type?: string;
        created_at?: string;
        [key: string]: unknown;
      };
    };

    if (!response.ok || json.status !== 'success' || !json.data) {
      throw new Error(
        `Flutterwave verification failed: ${json.message || response.statusText || 'Unknown error'}`
      );
    }

    const data = json.data;
    const normalizedStatus = data.status === 'successful' ? 'successful' : data.status === 'pending' ? 'pending' : 'failed';

    return {
      status: normalizedStatus,
      reference: data.tx_ref,
      providerReference: data.flw_ref || String(data.id),
      amount: data.amount,
      currency: data.currency,
      paidAt: data.created_at,
      channel: data.payment_type,
      rawResponse: data as Record<string, unknown>,
    };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Headers | Record<string, string | null | undefined>
  ): Promise<PaymentWebhookVerification> {
    let receivedHash: string | null = null;

    if (headers instanceof Headers) {
      receivedHash = headers.get('verif-hash');
    } else {
      receivedHash = headers['verif-hash'] || headers['Verif-Hash'] || null;
    }

    if (!this.secretHash || !receivedHash) {
      return { isValid: false };
    }

    const expectedBuffer = Buffer.from(this.secretHash, 'utf8');
    const receivedBuffer = Buffer.from(receivedHash, 'utf8');

    let isHashMatch = false;
    if (expectedBuffer.length === receivedBuffer.length) {
      isHashMatch = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    }

    if (!isHashMatch) {
      return { isValid: false };
    }

    try {
      const payload = JSON.parse(rawBody);
      const event = payload.event || payload['event.type'];
      const txRef = payload.data?.tx_ref;
      const transactionId = payload.data?.id;

      return {
        isValid: true,
        event,
        reference: txRef,
        transactionId,
        payload,
      };
    } catch {
      return { isValid: false };
    }
  }
}
