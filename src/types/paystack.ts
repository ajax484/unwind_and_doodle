export interface PaystackInitializeRequest {
  email: string;
  amount: number; // in kobo
  reference: string;
  currency?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number; // in kobo
    currency: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    metadata?: Record<string, unknown>;
  };
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number; // in kobo
    currency: string;
    paid_at: string;
    created_at: string;
    customer: {
      email: string;
      [key: string]: unknown;
    };
    metadata?: {
      order_id?: string;
      payment_id?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}
