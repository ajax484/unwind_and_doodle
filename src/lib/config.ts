export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  paystackSecretKey: string;
  paystackPublicKey: string;
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
}

export function getConfig(): AppConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    supabaseAnonKey ||
    '';
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

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    paystackSecretKey,
    paystackPublicKey,
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
  };
}
