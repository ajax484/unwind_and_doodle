import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';
import { z } from 'zod';

const PasswordSignInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PasswordSignInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid credentials format' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = getServiceSupabaseClient();

    // Authenticate with Supabase using password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return NextResponse.json(
        { success: false, error: authError?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Link or create customer record
    const customer = await linkOrCreateCustomerAccount(supabase, {
      id: authData.user.id,
      email: authData.user.email || email,
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

    // Set secure HTTP-only session cookie
    response.cookies.set('sb-access-token', authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
