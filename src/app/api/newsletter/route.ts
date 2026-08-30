import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
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

    const { email } = result.data;
    // In this phase, we acknowledge the subscription gracefully.
    // Marketing automation and provider synchronization will follow in a subsequent phase.

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for subscribing to Unwind & Doodle!',
        email,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Subscription failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
