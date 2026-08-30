import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getConfig } from '@/lib/config';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const next = url.searchParams.get('next') || '/account';

    const { appUrl } = getConfig();
    const supabase = getServiceSupabaseClient();
    const redirectTo = `${appUrl}/api/auth/callback?next=${encodeURIComponent(next)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error || !data.url) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Could not initialize Google authentication' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: data.url,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Google auth error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
