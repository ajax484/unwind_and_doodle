import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Signed out successfully',
  });

  // Clear session cookies
  response.cookies.set('sb-access-token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('app_session_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
