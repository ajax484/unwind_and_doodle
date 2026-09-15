import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, deleteCategory } from '@/services/admin-product.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updates: {
      name?: string;
      slug?: string;
      description?: string | null;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Category name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }

    if (body.slug !== undefined) {
      if (typeof body.slug !== 'string' || !body.slug.trim()) {
        return NextResponse.json(
          { success: false, error: 'Category slug cannot be empty' },
          { status: 400 }
        );
      }
      updates.slug = body.slug.trim();
    }

    if (body.description !== undefined) {
      updates.description = typeof body.description === 'string' ? body.description.trim() : null;
    }

    const updated = await updateCategory(
      supabase,
      id,
      adminContext.organization.id,
      updates
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating category';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isNotFound = errorMessage.includes('not found');
    const isBadRequest = errorMessage.includes('already exists') || errorMessage.includes('empty');

    const status = isAuthError ? 403 : isNotFound ? 404 : isBadRequest ? 400 : 500;

    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteCategory(
      supabase,
      id,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting category';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isNotFound = errorMessage.includes('not found');

    const status = isAuthError ? 403 : isNotFound ? 404 : 500;

    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
}
