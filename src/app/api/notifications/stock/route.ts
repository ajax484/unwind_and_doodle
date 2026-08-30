import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  subscribeToStockNotification,
  unsubscribeFromStockNotification,
  getCustomerStockNotifications,
} from '@/services/stock-notification.service';
import { z } from 'zod';

const StockSubSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  channel: z.enum(['email', 'whatsapp']).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const notifications = await getCustomerStockNotifications(supabase, authContext.customer.id);

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch notifications';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to receive stock notifications' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = StockSubSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const result = await subscribeToStockNotification(
      supabase,
      authContext.customer.id,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "We'll notify you as soon as this item is back in stock!",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to subscribe';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    await unsubscribeFromStockNotification(
      supabase,
      authContext.customer.id,
      notificationId
    );

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed from stock notification.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to unsubscribe';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
