import { Database, Json } from '@/lib/supabase/types';

// ============================================================================
// 1. DISCRIMINATED CAMPAIGN BLOCK TYPES (7 V1 BLOCKS)
// ============================================================================

export type V1CampaignBlockType =
  | 'text'
  | 'image'
  | 'product'
  | 'product_grid'
  | 'button'
  | 'callout'
  | 'divider';

export type TextAlignment = 'left' | 'center' | 'right';
export type TextStyle = 'heading' | 'body' | 'small';
export type ButtonStyle = 'primary' | 'secondary' | 'rose' | 'blue';
export type CalloutVariant = 'rose' | 'blue' | 'cream';

export interface V1TextBlock {
  id: string;
  type: 'text';
  data: {
    content: string; // Plain text or HTML with embedded tokens like {{first_name}}
    style?: TextStyle;
    align?: TextAlignment;
  };
}

export type ImageWidth = 'full' | 'constrained';

export interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  altText?: string;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
  createdAt: string;
}

export interface V1ImageBlock {
  id: string;
  type: 'image';
  data: {
    mediaId?: string;
    url: string;
    alt?: string;
    altText?: string;
    linkUrl?: string;
    caption?: string;
    width?: ImageWidth;
    align?: TextAlignment;
  };
}

export interface V1ProductBlock {
  id: string;
  type: 'product';
  data: {
    productId: string;
    // Snapshot fields for resilience / offline rendering
    title?: string;
    price?: number;
    imageUrl?: string;
    slug?: string;
    // Presentation overrides
    badge?: string;
    description?: string;
    ctaText?: string;
    ctaUrl?: string;
    showPrice?: boolean;
    showDescription?: boolean;
    showCta?: boolean;
  };
}

export interface V1ProductGridItem {
  productId: string;
  title?: string;
  price?: number;
  imageUrl?: string;
  slug?: string;
}

export interface V1ProductGridBlock {
  id: string;
  type: 'product_grid';
  data: {
    heading?: string;
    products: V1ProductGridItem[];
  };
}

export interface V1ButtonBlock {
  id: string;
  type: 'button';
  data: {
    text: string;
    url: string;
    align?: TextAlignment;
    style?: ButtonStyle;
  };
}

export interface V1CalloutBlock {
  id: string;
  type: 'callout';
  data: {
    title?: string;
    message: string;
    variant: CalloutVariant;
  };
}

export interface V1DividerBlock {
  id: string;
  type: 'divider';
  data?: {
    spacing?: 'sm' | 'md' | 'lg';
  };
}

// Discriminated union of all 7 V1 blocks
export type V1CampaignBlock =
  | V1TextBlock
  | V1ImageBlock
  | V1ProductBlock
  | V1ProductGridBlock
  | V1ButtonBlock
  | V1CalloutBlock
  | V1DividerBlock;

// ============================================================================
// 2. PERSONALIZATION TOKENS
// ============================================================================

export interface PersonalizationToken {
  id: string;
  label: string;
  token: string;
  sampleValue: string;
  category: 'customer' | 'order' | 'brand';
}

export const SUPPORTED_PERSONALIZATION_TOKENS: PersonalizationToken[] = [
  {
    id: 'first_name',
    label: 'First Name',
    token: '{{first_name}}',
    sampleValue: 'Aisha',
    category: 'customer',
  },
  {
    id: 'last_name',
    label: 'Last Name',
    token: '{{last_name}}',
    sampleValue: 'Bello',
    category: 'customer',
  },
  {
    id: 'email',
    label: 'Email Address',
    token: '{{email}}',
    sampleValue: 'aisha@example.com',
    category: 'customer',
  },
  {
    id: 'order_number',
    label: 'Order Number',
    token: '{{order_number}}',
    sampleValue: 'ORD-9842',
    category: 'order',
  },
  {
    id: 'product_name',
    label: 'Purchased Product',
    token: '{{product_name}}',
    sampleValue: "For the Girls Colouring Book",
    category: 'order',
  },
];

export interface TestPersona {
  id: string;
  name: string;
  context: {
    firstName: string;
    lastName: string;
    email: string;
    orderNumber: string;
    productName: string;
  };
}

export const TEST_PERSONAS: TestPersona[] = [
  {
    id: 'aisha',
    name: 'Aisha Bello (VIP Customer)',
    context: {
      firstName: 'Aisha',
      lastName: 'Bello',
      email: 'aisha.bello@example.com',
      orderNumber: 'ORD-5521',
      productName: 'For the Girls A6 Edition',
    },
  },
  {
    id: 'chioma',
    name: 'Chioma Okonkwo (New Subscriber)',
    context: {
      firstName: 'Chioma',
      lastName: 'Okonkwo',
      email: 'chioma.o@example.com',
      orderNumber: 'ORD-1092',
      productName: 'General Colouring Book',
    },
  },
  {
    id: 'zainab',
    name: 'Zainab Ahmed (Repeat Buyer)',
    context: {
      firstName: 'Zainab',
      lastName: 'Ahmed',
      email: 'zainab.ahmed@example.com',
      orderNumber: 'ORD-7743',
      productName: 'Vent to Me Journal',
    },
  },
];

// ============================================================================
// 3. CATALOG PRODUCT SUMMARY INTERFACE
// ============================================================================

export interface CatalogProductSummary {
  id: string;
  title: string;
  price: number;
  imageUrl?: string | null;
  slug?: string;
  description?: string;
}
