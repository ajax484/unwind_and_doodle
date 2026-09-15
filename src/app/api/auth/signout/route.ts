import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-helpers';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Signed out successfully',
  });

  // Clear standard session cookies
  clearAuthCookies(response);

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
