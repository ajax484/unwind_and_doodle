import { Database, Json } from '@/lib/supabase/types';
import { stripHtml } from '@/lib/rich-text';

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

export type ProductCtaDestination =
  | { type: 'product' }
  | { type: 'custom'; url: string };

export interface ProductImageConfig {
  imageId?: string;
  url?: string;
}

export interface ProductBadgeConfig {
  visible: boolean;
  text?: string;
}

export interface ProductTitleConfig {
  visible: boolean;
  text?: string;
}

export interface ProductDescriptionConfig {
  visible: boolean;
  text?: string;
}

export interface ProductPriceConfig {
  visible: boolean;
}

export interface ProductCtaConfig {
  visible: boolean;
  text: string;
  destination: ProductCtaDestination;
}

export interface ProductPresentationConfig {
  productId: string;
  image?: ProductImageConfig;
  badge?: ProductBadgeConfig;
  title?: ProductTitleConfig;
  description?: ProductDescriptionConfig;
  price?: ProductPriceConfig;
  cta?: ProductCtaConfig;
  // Catalog snapshots for offline rendering / fallback
  _catalogSnapshot?: {
    title?: string;
    price?: number;
    slug?: string;
    imageUrl?: string | null;
    images?: CatalogProductSummaryImage[];
    description?: string;
  };
  // Legacy / fallback fields
  imageUrl?: string;
  badgeText?: string;
  ctaText?: string;
  ctaUrl?: string;
  showPrice?: boolean;
  showDescription?: boolean;
  showCta?: boolean;
  slug?: string;
}

export interface V1ProductBlock {
  id: string;
  type: 'product';
  data: ProductPresentationConfig;
}

export type V1ProductGridItem = ProductPresentationConfig;

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
// 3. CATALOG PRODUCT SUMMARY INTERFACE & NORMALIZATION
// ============================================================================

export interface CatalogProductSummaryImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary?: boolean;
}

export interface CatalogProductSummary {
  id: string;
  title: string;
  price: number;
  imageUrl?: string | null;
  images?: CatalogProductSummaryImage[];
  slug?: string;
  description?: string;
  badge?: string;
}

/**
 * Normalizes any ProductPresentationConfig (or legacy flat block shape) into
 * a strictly typed, complete presentation object with safe defaults.
 */
export function normalizeProductPresentation(
  raw: Partial<ProductPresentationConfig> | any = {}
): ProductPresentationConfig {
  const productId = raw.productId || '';

  // 1. Image
  const imageId = raw.image?.imageId;
  const imageUrl = raw.image?.url || raw.imageUrl || raw._catalogSnapshot?.imageUrl || '';

  // 2. Badge
  const badgeVisible =
    raw.badge?.visible !== undefined
      ? raw.badge.visible
      : raw.badge !== undefined && typeof raw.badge === 'string'
      ? !!raw.badge.trim()
      : raw.badgeText !== undefined
      ? !!raw.badgeText.trim()
      : false;
  const badgeText =
    raw.badge?.text ??
    (typeof raw.badge === 'string' ? raw.badge : raw.badgeText ?? '');

  // 3. Title
  const titleVisible =
    raw.title?.visible !== undefined
      ? raw.title.visible
      : true;
  const titleText =
    raw.title?.text ??
    (typeof raw.title === 'string' ? raw.title : raw._catalogSnapshot?.title ?? '');

  // 4. Description
  const descriptionVisible =
    raw.description?.visible !== undefined
      ? raw.description.visible
      : raw.showDescription !== undefined
      ? raw.showDescription
      : true;
  const rawDescriptionText =
    raw.description?.text ??
    (typeof raw.description === 'string' ? raw.description : raw._catalogSnapshot?.description ?? '');
  const descriptionText = stripHtml(rawDescriptionText);

  // 5. Price
  const priceVisible =
    raw.price?.visible !== undefined
      ? raw.price.visible
      : raw.showPrice !== undefined
      ? raw.showPrice
      : true;

  // 6. CTA
  const ctaVisible =
    raw.cta?.visible !== undefined
      ? raw.cta.visible
      : raw.showCta !== undefined
      ? raw.showCta
      : true;
  const ctaText =
    raw.cta?.text ??
    raw.ctaText ??
    'Shop now';

  let destination: ProductCtaDestination = { type: 'product' };
  if (raw.cta?.destination) {
    destination = raw.cta.destination;
  } else if (raw.ctaUrl && !raw.ctaUrl.startsWith('/products/')) {
    destination = { type: 'custom', url: raw.ctaUrl };
  } else {
    destination = { type: 'product' };
  }

  return {
    productId,
    image: {
      imageId,
      url: imageUrl,
    },
    badge: {
      visible: badgeVisible,
      text: badgeText,
    },
    title: {
      visible: titleVisible,
      text: titleText,
    },
    description: {
      visible: descriptionVisible,
      text: descriptionText,
    },
    price: {
      visible: priceVisible,
    },
    cta: {
      visible: ctaVisible,
      text: ctaText,
      destination,
    },
    _catalogSnapshot: raw._catalogSnapshot || {
      title: typeof raw.title === 'string' ? raw.title : titleText,
      price: raw.price && typeof raw.price === 'number' ? raw.price : raw._catalogSnapshot?.price,
      slug: raw.slug || raw._catalogSnapshot?.slug,
      imageUrl: raw.imageUrl || raw._catalogSnapshot?.imageUrl,
      images: raw._catalogSnapshot?.images,
      description: typeof raw.description === 'string' ? raw.description : descriptionText,
    },
  };
}

