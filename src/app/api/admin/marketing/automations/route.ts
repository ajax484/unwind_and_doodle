import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  getAutomations,
  createAutomation,
} from '@/services/marketing-automation.service';
import {
  MarketingAutomationStatus,
  MarketingAutomationType,
} from '@/types/marketing';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') as MarketingAutomationStatus) || undefined;
    const type = (searchParams.get('type') as MarketingAutomationType) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await getAutomations(
      supabase,
      adminContext.organization.id,
      { status, type },
      { page, limit }
    );

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching automations';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const body = await req.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Automation name is required.' },
        { status: 400 }
      );
    }

    if (!body.type || typeof body.type !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Automation type is required.' },
        { status: 400 }
      );
    }

    const automation = await createAutomation(supabase, adminContext.organization.id, {
      name: body.name.trim(),
      type: body.type,
      status: body.status || 'draft',
      config: body.config ?? {},
      created_by: adminContext.user.id,
    });

    return NextResponse.json({ success: true, data: automation }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error creating automation';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    const isValidation =
      errorMessage.includes('required') ||
      errorMessage.includes('Invalid') ||
      errorMessage.includes('compatible') ||
      errorMessage.includes('exceed') ||
      errorMessage.includes('exist');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : isValidation ? 400 : 500 }
    );
  }
}
