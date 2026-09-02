import { NextRequest, NextResponse } from 'next/server';
import { getPublicProductThemes } from '@/services/theme.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Product slug is required' },
        { status: 400 }
      );
    }

    // Resolve product ID by slug or ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    let query = supabase
      .from('products')
      .select('id, supports_theme_customization, status');

    if (isUuid) {
      query = query.or(`slug.eq.${slug},id.eq.${slug}`);
    } else {
      query = query.eq('slug', slug);
    }

    const { data: product } = await query.maybeSingle();

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.supports_theme_customization) {
      return NextResponse.json({ success: true, themes: [] }, { status: 200 });
    }

    const themes = await getPublicProductThemes(supabase, product.id);

    return NextResponse.json({ success: true, themes }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching product themes';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
