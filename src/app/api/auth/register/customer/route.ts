import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';
import { z } from 'zod';

const CustomerRegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional().nullable(),
  emailMarketingConsent: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CustomerRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid registration details' },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, phone, emailMarketingConsent } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getServiceSupabaseClient();

    // 1. Check if user already exists in auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
        },
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        return NextResponse.json(
          { success: false, error: 'This email is already registered. Please sign in instead.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: authError.message || 'Registration failed' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // 2. Provision customer record in database
    const customer = await linkOrCreateCustomerAccount(supabase, {
      id: authData.user.id,
      email: cleanEmail,
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        userType: 'customer',
        redirectTo: '/account',
        customer,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      },
    });

    // 3. Set session cookie if session was generated
    if (authData.session?.access_token) {
      response.cookies.set('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
