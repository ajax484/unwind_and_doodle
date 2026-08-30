import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { validateAndCalculateDiscount, DiscountCartItem } from '@/services/discount.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, items, organizationId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Promo code is required.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart items are required.' }, { status: 400 });
    }

    const supabase = getServiceSupabaseClient();

    // Default organization ID
    let orgId = organizationId || '88c7af2e-afd4-4504-a43f-b14cc45d6263';
    if (!organizationId) {
      const { data: org } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
      if (org?.id) orgId = org.id;
    }

    // Resolve authoritative product prices from DB if unitPrice isn't provided or to be strictly authoritative
    const productIds = items.map((i: { productId: string }) => i.productId);
    const { data: products } = await supabase
      .from('products')
      .select('id, selling_price')
      .in('id', productIds);

    const priceMap = new Map<string, number>();
    for (const p of products || []) {
      priceMap.set(p.id, Number(p.selling_price || 0));
    }

    const cartItemsForDiscount: DiscountCartItem[] = items.map((i: { productId: string; quantity: number; unitPrice?: number }) => ({
      productId: i.productId,
      quantity: Number(i.quantity || 1),
      unitPrice: priceMap.has(i.productId) ? priceMap.get(i.productId)! : Number(i.unitPrice || 0),
    }));

    const result = await validateAndCalculateDiscount(supabase, orgId, code, cartItemsForDiscount);

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: result.error || 'Invalid promo code.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error validating discount';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
