import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    throw new Error('Sentry Server API Test Error — Unwind & Doodle diagnostics verification');
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test: 'sentry-verification-endpoint',
        runtime: 'nodejs',
      },
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Test error triggered and captured on the server API route.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
