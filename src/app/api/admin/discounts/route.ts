import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getDiscounts, createDiscount, DiscountStatus } from '@/services/discount.service';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') as DiscountStatus | 'All') || undefined;

    const discounts = await getDiscounts(supabase, adminContext.organization.id, {
      search,
      status,
    });

    return NextResponse.json({ success: true, data: discounts }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching discounts';
    const isAuth = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') || errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const body = await req.json();

    if (!body.code || !body.type || body.value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Code, type, and value are required.' },
        { status: 400 }
      );
    }

    const discount = await createDiscount(
      supabase,
      adminContext.organization.id,
      adminContext.user.id,
      {
        code: body.code,
        type: body.type,
        value: Number(body.value),
        minimum_order_amount: body.minimum_order_amount !== undefined && body.minimum_order_amount !== null ? Number(body.minimum_order_amount) : null,
        usage_limit: body.usage_limit !== undefined && body.usage_limit !== null ? Number(body.usage_limit) : null,
        starts_at: body.starts_at || null,
        expires_at: body.expires_at || null,
        active: body.active !== undefined ? Boolean(body.active) : true,
        scope: body.scope || 'store_wide',
        product_ids: body.product_ids || [],
        category_ids: body.category_ids || [],
      }
    );

    return NextResponse.json({ success: true, data: discount }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error creating discount';
    const isAuth = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') || errorMessage.includes('Authentication required');
    const isConflict = errorMessage.includes('already exists');
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : isConflict ? 409 : 400 }
    );
  }
}
