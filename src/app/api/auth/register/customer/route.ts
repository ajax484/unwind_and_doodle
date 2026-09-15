import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';
import { setAuthCookies } from '@/lib/auth-helpers';
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

    // 1. Create Supabase Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone ? phone.trim() : null,
        },
      },
    });

    if (authError || !authData.user) {
      const isAlreadyRegistered =
        authError?.message?.includes('already registered') ||
        authError?.status === 400 ||
        (authData?.user?.identities && authData.user.identities.length === 0);

      if (isAlreadyRegistered) {
        return NextResponse.json(
          {
            success: false,
            error: 'This email is already registered. Please sign in instead.',
            code: 'EMAIL_EXISTS',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: authError?.message || 'Registration failed' },
        { status: 400 }
      );
    }

    // 2. Link or create customer record
    const customer = await linkOrCreateCustomerAccount(supabase, {
      id: authData.user.id,
      email: cleanEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone ? phone.trim() : null,
      acceptsMarketing: emailMarketingConsent,
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

    // 3. Set session cookies if session was generated
    if (authData.session?.access_token) {
      setAuthCookies(response, {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
      });
    }

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
