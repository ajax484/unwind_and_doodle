import { MetadataRoute } from 'next';
import { getPublishedCatalog } from '@/services/catalog.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://unwindanddoodle.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = getServiceSupabaseClient();
    const products = await getPublishedCatalog(supabase);
    productRoutes = products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.createdAt ? new Date(product.createdAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch (err) {
    console.error('[Sitemap] Failed to fetch published catalog products for sitemap:', err);
  }

  return [...staticRoutes, ...productRoutes];
}
