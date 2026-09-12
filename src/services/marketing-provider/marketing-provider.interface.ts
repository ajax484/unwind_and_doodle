/**
 * Core interface and types for the Marketing Email Provider.
 *
 * Decouples marketing dispatch logic from specific transport implementations
 * (e.g. Nodemailer, Resend, SendGrid, SES).
 */

export interface SendMarketingEmailInput {
  to: string;
  subject: string;
  previewText?: string;
  senderName: string;
  senderEmail: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface SendMarketingEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface MarketingEmailProvider {
  /**
   * Dispatches a single marketing email through the underlying transport.
   */
  sendEmail(input: SendMarketingEmailInput): Promise<SendMarketingEmailResult>;
}
