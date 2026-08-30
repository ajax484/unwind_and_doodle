import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { reorderPastOrder } from '@/services/reorder.service';
import { z } from 'zod';

const ReorderSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = ReorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const sessionId = parsed.data.sessionId || req.cookies.get('cart_session_id')?.value || `sess_${Date.now()}`;
    const supabase = getServiceSupabaseClient();

    const result = await reorderPastOrder(supabase, {
      customerId: authContext.customer.id,
      orderIdentifier: parsed.data.orderNumber,
      sessionId,
    });

    const response = NextResponse.json({
      success: result.success,
      data: result,
    });

    if (!req.cookies.get('cart_session_id')?.value) {
      response.cookies.set('cart_session_id', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
      });
    }

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Reorder failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
