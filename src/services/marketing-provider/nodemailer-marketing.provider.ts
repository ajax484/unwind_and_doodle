import nodemailer, { Transporter } from 'nodemailer';
import { getConfig } from '@/lib/config';
import { getTransporter } from '@/lib/email-transporter';
import {
  MarketingEmailProvider,
  SendMarketingEmailInput,
  SendMarketingEmailResult,
} from './marketing-provider.interface';

/**
 * Nodemailer-backed implementation of the MarketingEmailProvider.
 * Reuses the application's configured SMTP settings from AppConfig.
 */
export class NodemailerMarketingEmailProvider implements MarketingEmailProvider {
  private transporter: Transporter;

  constructor(customTransporter?: Transporter) {
    this.transporter = customTransporter || getTransporter();
  }

  async sendEmail(input: SendMarketingEmailInput): Promise<SendMarketingEmailResult> {
    if (!input.to || !input.to.trim()) {
      return { success: false, error: 'Recipient email address is required' };
    }
    if (!input.subject || !input.subject.trim()) {
      return { success: false, error: 'Subject is required' };
    }
    if (!input.html || !input.html.trim()) {
      return { success: false, error: 'HTML content cannot be empty' };
    }

    const { smtp } = getConfig();
    const fromAddress = input.senderEmail?.trim()
      ? input.senderName?.trim()
        ? `"${input.senderName.trim()}" <${input.senderEmail.trim()}>`
        : input.senderEmail.trim()
      : smtp?.from || 'Unwind and Doodle <no-reply@unwindanddoodle.com>';

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: input.to.trim(),
        subject: input.subject.trim(),
        html: input.html,
        text: input.text || undefined,
        headers: input.headers || undefined,
      });

      const messageId =
        info.messageId ||
        `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      return {
        success: true,
        providerMessageId: messageId,
      };
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      // Clean error to avoid leaking credentials or sensitive internal paths
      const safeError = rawMessage.includes('auth') || rawMessage.includes('password')
        ? 'Email authentication failed with configured SMTP provider'
        : rawMessage;

      return {
        success: false,
        error: safeError,
      };
    }
  }
}

// Runtime provider singleton with test injection support
let activeProvider: MarketingEmailProvider | null = null;

export function getMarketingEmailProvider(): MarketingEmailProvider {
  if (!activeProvider) {
    activeProvider = new NodemailerMarketingEmailProvider();
  }
  return activeProvider;
}

export function setMarketingEmailProvider(provider: MarketingEmailProvider | null): void {
  activeProvider = provider;
}
