import { NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const supabase = getServiceSupabaseClient();

    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, created_at')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to load categories: ${error.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        data: categories || [],
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching categories';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
