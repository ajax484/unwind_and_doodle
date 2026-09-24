import type { Metadata } from 'next';
import { getProductDetailBySlug } from '@/services/catalog.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { extractPlainText } from '@/lib/rich-text';
import ProductDetailClient from './ProductDetailClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function resolveSlug(params: Promise<{ slug: string }>): Promise<string> {
  const resolved = await params;
  return resolved?.slug || '';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = await resolveSlug(params);
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://unwindanddoodle.com';

  if (!slug) {
    return {
      title: 'Product | Unwind & Doodle',
    };
  }

  try {
    const supabase = getServiceSupabaseClient();
    const product = await getProductDetailBySlug(supabase, slug);

    if (!product) {
      return {
        title: 'Product Not Found | Unwind & Doodle',
        description: 'The requested product could not be found.',
      };
    }

    const title = `${product.name} | Unwind & Doodle`;
    const description =
      extractPlainText(product.description, 160) ||
      `Buy ${product.name} at Unwind & Doodle. Premium mindful coloring books and custom journals.`;
    const imageUrl = product.primaryImage || '/logo.png';
    const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${siteUrl}${imageUrl}`;
    const productUrl = `${siteUrl}/products/${product.slug}`;

    return {
      title,
      description,
      alternates: {
        canonical: productUrl,
      },
      openGraph: {
        title,
        description,
        url: productUrl,
        siteName: 'Unwind & Doodle',
        type: 'website',
        images: [
          {
            url: absoluteImageUrl,
            alt: product.name,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [absoluteImageUrl],
      },
    };
  } catch {
    return {
      title: 'Product | Unwind & Doodle',
    };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const slug = await resolveSlug(params);
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://unwindanddoodle.com';

  let structuredData: Record<string, unknown> | null = null;

  if (slug) {
    try {
      const supabase = getServiceSupabaseClient();
      const product = await getProductDetailBySlug(supabase, slug);

      if (product) {
        const plainDesc =
          extractPlainText(product.description, 300) ||
          `${product.name} by Unwind & Doodle`;
        const imageUrl = product.primaryImage || '/logo.png';
        const absoluteImageUrl = imageUrl.startsWith('http')
          ? imageUrl
          : `${siteUrl}${imageUrl}`;

        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: plainDesc,
          image: absoluteImageUrl,
          sku: product.sku || product.id,
          offers: {
            '@type': 'Offer',
            url: `${siteUrl}/products/${product.slug}`,
            priceCurrency: 'NGN',
            price: product.price,
            availability: product.isAvailable
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: 'Unwind & Doodle',
            },
          },
        };
      }
    } catch {
      // Graceful fallback if database query in SSR fails
      structuredData = null;
    }
  }

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <ProductDetailClient initialSlug={slug} />
    </>
  );
}
