import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { updateAutomationStatus } from '@/services/marketing-automation.service';
import { MarketingAutomationStatus } from '@/types/marketing';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;
    const body = await req.json();

    const status = body.status as MarketingAutomationStatus;
    if (!status || !['draft', 'active', 'paused'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status ("draft", "active", "paused") is required.' },
        { status: 400 }
      );
    }

    const automation = await updateAutomationStatus(
      supabase,
      adminContext.organization.id,
      id,
      status,
      { validateConfig: status === 'active' }
    );

    return NextResponse.json({ success: true, data: automation }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating status';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    const isNotFound = errorMessage.includes('not found');
    const isValidation =
      errorMessage.includes('required') ||
      errorMessage.includes('Invalid') ||
      errorMessage.includes('compatible') ||
      errorMessage.includes('exceed') ||
      errorMessage.includes('exist');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : isNotFound ? 404 : isValidation ? 400 : 500 }
    );
  }
}
