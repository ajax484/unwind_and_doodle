import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  getAutomationById,
  updateAutomation,
  deleteAutomation,
} from '@/services/marketing-automation.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    const automation = await getAutomationById(supabase, adminContext.organization.id, id);

    if (!automation) {
      return NextResponse.json(
        { success: false, error: 'Automation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: automation }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching automation';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;
    const body = await req.json();

    const automation = await updateAutomation(
      supabase,
      adminContext.organization.id,
      id,
      {
        name: body.name,
        type: body.type,
        status: body.status,
        config: body.config,
      }
    );

    return NextResponse.json({ success: true, data: automation }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating automation';
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    await deleteAutomation(supabase, adminContext.organization.id, id);

    return NextResponse.json(
      { success: true, message: 'Automation deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting automation';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    const isNotFound = errorMessage.includes('not found');
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : isNotFound ? 404 : 500 }
    );
  }
}
