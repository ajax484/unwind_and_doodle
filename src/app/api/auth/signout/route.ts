import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Signed out successfully',
  });

  // Clear standard session cookies
  const cookiesToClear = ['sb-access-token', 'app_session_token', 'supabase-auth-token'];
  for (const cookieName of cookiesToClear) {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
  }

  // Clear any project-specific supabase chunked cookies present in the request
  const allCookies = req.cookies.getAll();
  for (const c of allCookies) {
    if (c.name.startsWith('sb-')) {
      response.cookies.set(c.name, '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
      });
    }
  }

  return response;
}
