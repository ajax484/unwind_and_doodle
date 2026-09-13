export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  hasServiceRoleKey: boolean;
  paystackSecretKey: string;
  paystackPublicKey: string;
  flutterwaveSecretKey?: string;
  flutterwaveSecretHash?: string;
  marketingWebhookSecret?: string;
  appUrl: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
    service?: string;
  };
  adminEmails: string[];
}

export function getConfig(): AppConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasServiceRoleKey = Boolean(rawServiceKey && rawServiceKey.trim().length > 0);
  const supabaseServiceRoleKey = hasServiceRoleKey
    ? rawServiceKey!
    : supabaseAnonKey || '';
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
  const paystackPublicKey =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const smtpService = process.env.SMTP_SERVICE || (process.env.SMTP_HOST?.includes('gmail') ? 'gmail' : '');
  const smtpHost = process.env.SMTP_HOST || (smtpService === 'gmail' ? 'smtp.gmail.com' : '');
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpFrom = process.env.SMTP_FROM || 'Unwind and Doodle <no-reply@unwindanddoodle.com>';

  const rawAdminEmails =
    process.env.ADMIN_NOTIFICATION_EMAILS || process.env.ADMIN_EMAILS || '';
  const adminEmails = rawAdminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    paystackSecretKey,
    paystackPublicKey,
    hasServiceRoleKey,
    flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
    flutterwaveSecretHash: process.env.FLUTTERWAVE_SECRET_HASH || '',
    marketingWebhookSecret:
      process.env.MARKETING_WEBHOOK_SECRET || process.env.EMAIL_WEBHOOK_SECRET || '',
    appUrl,
    smtp: {
      host: smtpHost,
      port: Number.isNaN(smtpPort) ? 465 : smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      pass: smtpPass,
      from: smtpFrom,
      service: smtpService || undefined,
    },
    adminEmails,
  };
}
