import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getConfig } from '@/lib/config';
import { z } from 'zod';

const SendOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
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

    const email = parsed.data.email.trim().toLowerCase();
    const { appUrl } = getConfig();
    const supabase = getServiceSupabaseClient();

    // Trigger Supabase passwordless OTP
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${appUrl}/api/auth/callback`,
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
      message: `A 6-digit verification code has been sent to ${email}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send OTP';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
