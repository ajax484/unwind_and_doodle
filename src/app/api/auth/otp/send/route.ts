import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getConfig } from '@/lib/config';
import { z } from 'zod';

const SendOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  intent: z.enum(['admin', 'customer', 'auto']).optional().default('auto'),
  next: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email, intent, next } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();
    const { appUrl } = getConfig();
    const supabase = getServiceSupabaseClient();

    // If intent is strictly admin, pre-check if there's any active membership or invitation for this email
    if (intent === 'admin') {
      // Check customer/auth lookup or invitations
      const { data: inv } = await supabase
        .from('organization_invitations')
        .select('id')
        .eq('email', cleanEmail)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      const { data: customers } = await supabase
        .from('customers')
        .select('user_id')
        .eq('email', cleanEmail)
        .maybeSingle();

      let hasMember = false;
      if (customers?.user_id) {
        const { data: mem } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', customers.user_id)
          .maybeSingle();
        if (mem) hasMember = true;
      }

      // Check admin emails config fallback
      const adminEmailsEnv = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (!hasMember && !inv && !adminEmailsEnv.includes(cleanEmail)) {
        // Still allow sending OTP if user exists in auth.users, but warn if intent is clearly customer
        // We will perform the authoritative check upon verification
      }
    }

    const nextDestination = next || (intent === 'admin' ? '/admin' : '/account');
    const callbackUrl = `${appUrl}/api/auth/callback?intent=${intent}&next=${encodeURIComponent(nextDestination)}`;

    // Trigger Supabase passwordless OTP
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: intent !== 'admin',
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unable to send verification code' },
        { status: error.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send OTP';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
