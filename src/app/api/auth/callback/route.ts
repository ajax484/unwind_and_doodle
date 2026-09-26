import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient, createEphemeralAuthClient } from '@/lib/supabase/client';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';
import { setAuthCookies } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const intent = searchParams.get('intent') || 'auto';
  const next = searchParams.get('next') || (intent === 'admin' ? '/admin' : '/account');
  const errorDescription = searchParams.get('error_description') || searchParams.get('error');

  const errorFallbackUrl =
    intent === 'admin'
      ? `${origin}/admin/login?error=${encodeURIComponent(errorDescription || 'Authentication failed or expired')}`
      : `${origin}/auth?error=${encodeURIComponent(errorDescription || 'Authentication failed or expired')}`;

  if (errorDescription) {
    return NextResponse.redirect(errorFallbackUrl);
  }

  if (!code) {
    return NextResponse.redirect(
      intent === 'admin'
        ? `${origin}/admin/login?error=Missing%20authorization%20code`
        : `${origin}/auth?error=Missing%20authorization%20code`
    );
  }

  const supabase = getServiceSupabaseClient();
  const authClient = createEphemeralAuthClient(supabase);
  const { data, error } = await authClient.auth.exchangeCodeForSession(code);

  if (error || !data.user || !data.session) {
    return NextResponse.redirect(errorFallbackUrl);
  }

  const user = data.user;

  // Check if user is an organization member (merchant/admin)
  const { data: members } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role')
    .eq('user_id', user.id)
    .limit(1);

  const isOrgMember = members && members.length > 0;

  if (intent === 'admin' && !isOrgMember) {
    return NextResponse.redirect(
      `${origin}/admin/login?error=Access%20Denied%3A%20Your%20account%20is%20not%20registered%20as%20an%20administrator%20in%20this%20organization`
    );
  }

  if (!isOrgMember) {
    // User is a storefront customer -> Link or create customer record
    await linkOrCreateCustomerAccount(supabase, {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata,
    });
  }

  // Determine post-authentication redirect destination
  let destination = next;
  if (isOrgMember && next === '/account') {
    destination = '/admin';
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  setAuthCookies(response, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });

  return response;
}
