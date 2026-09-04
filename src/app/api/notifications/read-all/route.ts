import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/services/user-context.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { markAllInAppNotificationsRead } from '@/services/in-app-notification.service';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUserContext(req);

    if (!authContext.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: authentication required' },
        { status: 401 }
      );
    }

    const supabase = getServiceSupabaseClient();

    if (authContext.userType === 'merchant') {
      await markAllInAppNotificationsRead(supabase, {
        organizationId: authContext.organization.id,
        recipientType: 'admin',
        recipientId: authContext.user.id,
      });

      return NextResponse.json({ success: true });
    }

    if (authContext.userType === 'customer') {
      await markAllInAppNotificationsRead(supabase, {
        recipientType: 'customer',
        recipientId: authContext.customer.id,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported user profile for notifications' },
      { status: 403 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to mark all notifications as read';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
