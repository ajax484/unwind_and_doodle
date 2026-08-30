import { NextRequest, NextResponse } from 'next/server';
import { getProductDetailBySlug } from '@/services/catalog.service';
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

    const product = await getProductDetailBySlug(supabase, slug);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or unavailable' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching product detail';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
