import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { sendTestEmail } from '@/services/marketing-dispatcher.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const recipientEmail = typeof body.recipient_email === 'string' ? body.recipient_email.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { success: false, error: 'A valid test recipient email address is required.' },
        { status: 400 }
      );
    }

    const result = await sendTestEmail(
      supabase,
      adminContext.organization.id,
      id,
      recipientEmail
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to dispatch test email.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Test email successfully dispatched to ${recipientEmail}`,
        messageId: result.messageId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error sending test email';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}
