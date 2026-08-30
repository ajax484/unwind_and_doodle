import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';
import { z } from 'zod';

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  token: z.string().min(4, 'Please enter a valid OTP code'),
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

    const { email, token } = parsed.data;
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

    if (authError || !authData?.user || !authData?.session) {
      return NextResponse.json(
        { success: false, error: authError?.message || 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    // Link or create customer record
    const customer = await linkOrCreateCustomerAccount(supabase, {
      id: authData.user.id,
      email: authData.user.email || cleanEmail,
      user_metadata: authData.user.user_metadata,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        customer,
        user: {
          id: authData.user.id,
          email: authData.user.email,
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
