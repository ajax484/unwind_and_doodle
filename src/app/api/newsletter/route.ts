import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { subscribeCustomerToMarketing } from '@/services/marketing-subscription.service';

const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = newsletterSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0]?.message || 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email, firstName, lastName } = result.data;
    const supabase = getServiceSupabaseClient();

    const sub = await subscribeCustomerToMarketing(supabase, {
      email,
      firstName,
      lastName,
      source: 'newsletter',
    });

    return NextResponse.json(
      {
        success: true,
        message: sub.alreadySubscribed
          ? 'You are already subscribed to Unwind & Doodle!'
          : 'Thank you for subscribing to Unwind & Doodle!',
        email: sub.email,
        alreadySubscribed: sub.alreadySubscribed,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Subscription failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
