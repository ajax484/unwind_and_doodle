import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';
import { z } from 'zod';

const PasswordSignInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  intent: z.enum(['admin', 'customer', 'auto']).optional().default('auto'),
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

    const { email, password, intent } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getServiceSupabaseClient();

    // 1. Authenticate with Supabase using email and password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return NextResponse.json(
        { success: false, error: authError?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = authData.user;

    // 2. Check if this user is an organization member (merchant/admin)
    const { data: members } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id, role')
      .eq('user_id', user.id)
      .limit(1);

    const isOrgMember = members && members.length > 0;
    const member = isOrgMember ? members[0] : null;

    // 3. Handle Admin Intent validation
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

      // Set secure HTTP-only session cookie
      response.cookies.set('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    // 4. Handle Customer or Auto Intent
    if (isOrgMember && intent === 'auto') {
      // User is an existing admin/merchant logging in via generic flow
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

    // User is a storefront customer -> Link or create customer record
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

    // Set secure HTTP-only session cookie
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
