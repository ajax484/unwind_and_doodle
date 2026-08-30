import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getDiscountById, updateDiscount, deleteDiscount } from '@/services/discount.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    const discount = await getDiscountById(supabase, adminContext.organization.id, id);
    return NextResponse.json({ success: true, data: discount }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching discount';
    const isAuth = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden');
    const isNotFound = errorMessage.includes('not found');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : isNotFound ? 404 : 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;
    const body = await req.json();

    const updated = await updateDiscount(
      supabase,
      adminContext.organization.id,
      adminContext.user.id,
      id,
      {
        code: body.code,
        type: body.type,
        value: body.value !== undefined ? Number(body.value) : undefined,
        minimum_order_amount: body.minimum_order_amount !== undefined ? (body.minimum_order_amount === null ? null : Number(body.minimum_order_amount)) : undefined,
        usage_limit: body.usage_limit !== undefined ? (body.usage_limit === null ? null : Number(body.usage_limit)) : undefined,
        starts_at: body.starts_at,
        expires_at: body.expires_at,
        active: body.active,
        scope: body.scope,
        product_ids: body.product_ids,
        category_ids: body.category_ids,
      }
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating discount';
    const isAuth = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden');
    const isNotFound = errorMessage.includes('not found');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : isNotFound ? 404 : 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(req, context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    const result = await deleteDiscount(
      supabase,
      adminContext.organization.id,
      adminContext.user.id,
      id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting discount';
    const isAuth = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden');
    const isNotFound = errorMessage.includes('not found');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : isNotFound ? 404 : 400 });
  }
}
