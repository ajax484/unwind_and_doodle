import nodemailer, { Transporter } from 'nodemailer';
import { getConfig } from './config';

let activeTransporter: Transporter | null = null;

/**
 * Returns the current nodemailer transporter, or initializes one from AppConfig.
 * In development/test environments without SMTP credentials, falls back to a jsonTransport.
 */
export function getTransporter(): Transporter {
  if (activeTransporter) {
    return activeTransporter;
  }

  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  const { smtp } = getConfig();

  if (!isTest && smtp && (smtp.service || smtp.host)) {
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
    // Graceful fallback for tests / local development without SMTP credentials
    activeTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return activeTransporter;
}

/**
 * Allows overriding the active transporter (e.g. for unit tests).
 */
export function setTransporter(transporter: Transporter | null): void {
  activeTransporter = transporter;
}
