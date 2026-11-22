import React from 'react';
import type { Metadata } from 'next';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getStorefrontPage } from '@/services/storefront-pages.service';
import StorefrontContentPage from '@/components/StorefrontContentPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const supabase = getServiceSupabaseClient();
  const page = await getStorefrontPage(supabase, 'delivery');
  return {
    title: page.seoTitle || `${page.title} — Unwind & Doodle`,
    description: page.seoDescription || page.subtitle || undefined,
  };
}

export default async function DeliveryPage() {
  const supabase = getServiceSupabaseClient();
  const page = await getStorefrontPage(supabase, 'delivery');
  return <StorefrontContentPage page={page} />;
}
