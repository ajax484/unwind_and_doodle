import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';
import { z } from 'zod';

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  token: z.string().min(4, 'Please enter a valid OTP code'),
  intent: z.enum(['admin', 'customer', 'auto']).optional().default('auto'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { email, token, intent } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    const supabase = getServiceSupabaseClient();

    // 1. Try verify with type: 'email'
    let { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    });

    // 2. If 'email' type fails, try 'signup' (for new users who registered via OTP)
    if (authError || !authData?.session) {
      const signupAttempt = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });

      if (!signupAttempt.error && signupAttempt.data?.session) {
        authData = signupAttempt.data;
        authError = null;
      }
    }

    // 3. If still fails, try 'magiclink'
    if (authError || !authData?.session) {
      const magicAttempt = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'magiclink',
      });

      if (!magicAttempt.error && magicAttempt.data?.session) {
        authData = magicAttempt.data;
        authError = null;
      }
    }

    if (authError || !authData?.user || !authData?.session) {
      return NextResponse.json(
        { success: false, error: authError?.message || 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    const user = authData.user;

    // 4. Check if user is an organization member (merchant/admin)
    const { data: members } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id, role')
      .eq('user_id', user.id)
      .limit(1);

    const isOrgMember = members && members.length > 0;
    const member = isOrgMember ? members[0] : null;

    if (intent === 'admin') {
      if (!isOrgMember) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Access Denied: Your account is authenticated, but you are not registered as an administrator or team member in this organization.',
            code: 'FORBIDDEN',
          },
          { status: 403 }
        );
      }

      const response = NextResponse.json({
        success: true,
        data: {
          userType: 'merchant',
          redirectTo: '/admin',
          user: {
            id: user.id,
            email: user.email,
          },
          membership: {
            id: member?.id,
            organizationId: member?.organization_id,
            role: member?.role,
          },
        },
      });

      response.cookies.set('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      return response;
    }

    if (isOrgMember && intent === 'auto') {
      const response = NextResponse.json({
        success: true,
        data: {
          userType: 'merchant',
          redirectTo: '/admin',
          user: {
            id: user.id,
            email: user.email,
          },
          membership: {
            id: member?.id,
            organizationId: member?.organization_id,
            role: member?.role,
          },
        },
      });

      response.cookies.set('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      return response;
    }

    // Link or create customer record
    const customer = await linkOrCreateCustomerAccount(supabase, {
      id: user.id,
      email: user.email || cleanEmail,
      user_metadata: user.user_metadata,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        userType: 'customer',
        redirectTo: '/account',
        customer,
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });

    // Set secure HTTP-only session cookie for 30 days
    response.cookies.set('sb-access-token', authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
