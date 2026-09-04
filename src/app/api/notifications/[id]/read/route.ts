import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/services/user-context.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { markInAppNotificationRead } from '@/services/in-app-notification.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedUserContext(req);

    if (!authContext.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const notificationId = resolvedParams.id;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    await markInAppNotificationRead(supabase, notificationId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to mark notification as read';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
