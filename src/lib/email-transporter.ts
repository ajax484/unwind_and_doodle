import nodemailer, { Transporter } from 'nodemailer';
import { getConfig } from './config';

export type EmailTransportMode = 'smtp' | 'json_fallback';

export interface EmailTransporterInfo {
  mode: EmailTransportMode;
  host: string;
  port: number;
  secure: boolean;
  service?: string;
  userConfigured: boolean;
  from: string;
  replyTo?: string;
}

export interface EmailTransportVerificationResult {
  ok: boolean;
  mode: EmailTransportMode;
  host: string;
  port: number;
  latencyMs: number;
  error?: string;
}

let activeTransporter: Transporter | null = null;
let activeTransportMode: EmailTransportMode = 'json_fallback';

/**
 * Determines whether real SMTP transport is configured in the current environment.
 */
export function isSmtpConfigured(): boolean {
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  const { smtp } = getConfig();
  return !isTest && Boolean(smtp && (smtp.service || smtp.host));
}

/**
 * Returns the current nodemailer transporter, or initializes one from AppConfig.
 * In development/test environments without SMTP credentials, falls back to a jsonTransport.
 */
export function getTransporter(): Transporter {
  if (activeTransporter) {
    return activeTransporter;
  }

  const { smtp } = getConfig();

  if (isSmtpConfigured()) {
    activeTransportMode = 'smtp';
    activeTransporter = nodemailer.createTransport({
      service: smtp.service,
      host: smtp.host || undefined,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user
        ? {
            user: smtp.user,
            pass: smtp.pass,
          }
        : undefined,
    });
  } else {
    activeTransportMode = 'json_fallback';
    // Graceful fallback for tests / local development without SMTP credentials
    activeTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return activeTransporter;
}

/**
 * Returns the active transport mode ('smtp' vs 'json_fallback').
 */
export function getTransportMode(): EmailTransportMode {
  if (!activeTransporter) {
    getTransporter();
  }
  return activeTransportMode;
}

/**
 * Returns non-sensitive diagnostics about the configured email transport.
 */
export function getTransporterInfo(): EmailTransporterInfo {
  const { smtp } = getConfig();
  const mode = getTransportMode();
  return {
    mode,
    host: smtp.host || (smtp.service === 'gmail' ? 'smtp.gmail.com' : ''),
    port: smtp.port,
    secure: smtp.secure,
    service: smtp.service,
    userConfigured: Boolean(smtp.user && smtp.pass),
    from: smtp.from,
    replyTo: smtp.replyTo,
  };
}

/**
 * Verifies live SMTP connectivity and authentication using nodemailer's verify().
 */
export async function verifyEmailTransport(): Promise<EmailTransportVerificationResult> {
  const start = Date.now();
  const info = getTransporterInfo();

  if (info.mode === 'json_fallback') {
    return {
      ok: false,
      mode: 'json_fallback',
      host: info.host,
      port: info.port,
      latencyMs: Date.now() - start,
      error: 'SMTP credentials are not configured — emails are currently running in simulated fallback mode.',
    };
  }

  try {
    const transporter = getTransporter();
    await transporter.verify();
    return {
      ok: true,
      mode: 'smtp',
      host: info.host,
      port: info.port,
      latencyMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    const safeError =
      rawMessage.toLowerCase().includes('auth') || rawMessage.toLowerCase().includes('password')
        ? 'SMTP authentication failed. Verify SMTP_USER and SMTP_PASS.'
        : rawMessage;
    return {
      ok: false,
      mode: 'smtp',
      host: info.host,
      port: info.port,
      latencyMs: Date.now() - start,
      error: safeError,
    };
  }
}

/**
 * Allows overriding the active transporter (e.g. for unit tests).
 */
export function setTransporter(transporter: Transporter | null, mode?: EmailTransportMode): void {
  activeTransporter = transporter;
  if (mode) {
    activeTransportMode = mode;
  } else if (!transporter) {
    activeTransportMode = isSmtpConfigured() ? 'smtp' : 'json_fallback';
  } else {
    activeTransportMode = 'smtp';
  }
}
