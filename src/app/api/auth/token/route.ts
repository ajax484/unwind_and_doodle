import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';
import { z } from 'zod';

const TokenAuthSchema = z.object({
  accessToken: z.string().min(10, 'Access token is required'),
  refreshToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TokenAuthSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid token payload' },
        { status: 400 }
      );
    }

    const { accessToken } = parsed.data;
    const supabase = getServiceSupabaseClient();

    // Verify token with Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return NextResponse.json(
        { success: false, error: userError?.message || 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    const user = userData.user;

    // Link or create customer record
    const customer = await linkOrCreateCustomerAccount(supabase, {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        customer,
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });

    // Set secure HTTP-only session cookie for 30 days
    response.cookies.set('sb-access-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Token verification failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
