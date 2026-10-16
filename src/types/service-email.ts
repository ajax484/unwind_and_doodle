import { EmailNotificationTemplate } from './notification';

export type ServiceEmailCategory = 'order' | 'customer' | 'team' | 'admin';

export interface ServiceEmailVariable {
  key: string;
  label: string;
  description: string;
  example: string;
  type: 'string' | 'number' | 'boolean' | 'array';
}

export interface ServiceEmailTemplateDefinition {
  key: EmailNotificationTemplate;
  name: string;
  description: string;
  category: ServiceEmailCategory;
  defaultSubject: string;
  defaultBodyHtml: string;
  defaultBodyText: string;
  variables: ServiceEmailVariable[];
  sampleData: Record<string, unknown>;
}

export interface ServiceEmailTemplateOverride {
  id: string;
  organizationId: string;
  templateKey: EmailNotificationTemplate;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ServiceEmailTemplateDetail {
  key: EmailNotificationTemplate;
  name: string;
  description: string;
  category: ServiceEmailCategory;
  defaultSubject: string;
  defaultBodyHtml: string;
  defaultBodyText: string;
  variables: ServiceEmailVariable[];
  sampleData: Record<string, unknown>;
  effectiveSubject: string;
  effectiveBodyHtml: string;
  effectiveBodyText: string;
  isCustomized: boolean;
  isActive: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
  blocks?: import('@/types/marketing-builder').V1CampaignBlock[];
}

export interface ServiceEmailTemplateSummary {
  key: EmailNotificationTemplate;
  name: string;
  description: string;
  category: ServiceEmailCategory;
  isCustomized: boolean;
  isActive: boolean;
  updatedAt?: string;
}

export interface UpdateServiceEmailTemplateInput {
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  isActive?: boolean;
  blocks?: import('@/types/marketing-builder').V1CampaignBlock[];
}
