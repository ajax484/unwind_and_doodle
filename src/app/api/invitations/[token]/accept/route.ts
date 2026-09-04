import { NextRequest, NextResponse } from 'next/server';
import { extractAuthToken } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { acceptTeamInvitation } from '@/services/team.service';
import { AcceptInvitationBodySchema } from '@/types/admin-team';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing invitation token' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // 1. Fetch invitation record to know the invited email and validate status
    const { data: invitation, error: invError } = await supabase
      .from('organization_invitations')
      .select('id, organization_id, email, role, expires_at, accepted_at')
      .eq('token', token.trim())
      .maybeSingle();

    if (invError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation: The link is invalid or does not exist' },
        { status: 400 }
      );
    }

    if (invitation.accepted_at) {
      return NextResponse.json(
        { success: false, error: 'This invitation has already been accepted and cannot be reused' },
        { status: 400 }
      );
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, error: 'This invitation has expired. Please request a new invitation.' },
        { status: 400 }
      );
    }

    // 2. Check if a password was provided in the request body for direct account creation / sign-in
    let parsedBody: { password?: string; fullName?: string } = {};
    try {
      const rawJson = await req.json();
      const parseResult = AcceptInvitationBodySchema.safeParse(rawJson);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: parseResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }
      parsedBody = parseResult.data;
    } catch {
      // Empty body is permissible if authenticating via cookie or header
    }

    const password = parsedBody.password?.trim();
    const fullName = parsedBody.fullName?.trim() || 'Team Member';

    let currentUser: { id: string; email?: string; user_metadata?: Record<string, any> } | null = null;
    let sessionToken: string | null = null;

    if (password) {

      // Try to sign in first (in case the auth user already exists)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (!signInError && signInData?.user && signInData?.session) {
        currentUser = {
          id: signInData.user.id,
          email: signInData.user.email,
          user_metadata: signInData.user.user_metadata,
        };
        sessionToken = signInData.session.access_token;
      } else {
        // Create user directly via admin API (auto-confirmed)
        let createdUserId: string | null = null;

        if (supabase.auth.admin && typeof supabase.auth.admin.createUser === 'function') {
          const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email: invitation.email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });

          if (!createError && createData?.user) {
            createdUserId = createData.user.id;
          }
        }

        // Fallback to standard signUp if admin API is not available in mock/test
        if (!createdUserId) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: invitation.email,
            password,
            options: {
              data: { full_name: fullName },
            },
          });

          if (signUpError && !signUpError.message.includes('already registered')) {
            return NextResponse.json(
              { success: false, error: signUpError.message || 'Failed to create user account' },
              { status: 400 }
            );
          }

          if (signUpData?.user) {
            createdUserId = signUpData.user.id;
          }
        }

        // Now sign in to get active session
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });

        if (authError || !authData?.user || !authData?.session) {
          return NextResponse.json(
            { success: false, error: authError?.message || 'Authentication failed' },
            { status: 401 }
          );
        }

        currentUser = {
          id: authData.user.id,
          email: authData.user.email,
          user_metadata: authData.user.user_metadata,
        };
        sessionToken = authData.session.access_token;
      }
    } else {
      // 3. Authenticate via existing session token or test headers
      const authToken = extractAuthToken(req);
      const testUserId = req.headers.get('x-test-user-id') || req.headers.get('x-user-id');
      const testEmail = req.headers.get('x-test-email') || req.headers.get('x-user-email');

      if (testUserId && testEmail && process.env.NODE_ENV === 'test') {
        currentUser = {
          id: testUserId,
          email: testEmail,
        };
      } else if (authToken) {
        const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
        if (!userError && userData?.user) {
          currentUser = {
            id: userData.user.id,
            email: userData.user.email,
            user_metadata: userData.user.user_metadata,
          };
          sessionToken = authToken;
        }
      }
    }

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required: Please enter a password or sign in to accept this invitation',
          code: 'UNAUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // 4. Accept the invitation & assign organization role
    const result = await acceptTeamInvitation(supabase, currentUser, token);

    const response = NextResponse.json({
      success: true,
      data: result,
      message: 'Invitation successfully accepted! Welcome to the team.',
    });

    // 5. If we obtained a session token, set the session cookie
    if (sessionToken) {
      response.cookies.set('sb-access-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to accept invitation';
    const isMismatch = msg.includes('Email mismatch');
    const isInvalid =
      msg.includes('Invalid invitation') ||
      msg.includes('expired') ||
      msg.includes('already been accepted');

    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      {
        status: isMismatch ? 403 : isInvalid ? 400 : 500,
      }
    );
  }
}
