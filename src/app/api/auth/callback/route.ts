import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/account';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=Missing authorization code`);
  }

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user || !data.session) {
    return NextResponse.redirect(`${origin}/auth?error=Authentication failed or expired`);
  }

  // Link or create customer record
  await linkOrCreateCustomerAccount(supabase, {
    id: data.user.id,
    email: data.user.email || '',
    user_metadata: data.user.user_metadata,
  });

  const response = NextResponse.redirect(`${origin}${next}`);
  response.cookies.set('sb-access-token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
