import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/services/user-context.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getInAppNotifications } from '@/services/in-app-notification.service';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUserContext(req);

    if (!authContext.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    const supabase = getServiceSupabaseClient();

    if (authContext.userType === 'merchant') {
      const result = await getInAppNotifications(supabase, {
        organizationId: authContext.organization.id,
        recipientType: 'admin',
        recipientId: authContext.user.id,
        unreadOnly,
        limit,
        offset,
      });

      return NextResponse.json({ success: true, data: result });
    }

    if (authContext.userType === 'customer') {
      const result = await getInAppNotifications(supabase, {
        recipientType: 'customer',
        recipientId: authContext.customer.id,
        unreadOnly,
        limit,
        offset,
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported user profile for notifications' },
      { status: 403 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal notification fetch error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
