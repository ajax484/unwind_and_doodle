import { NextRequest, NextResponse } from 'next/server';
import { extractRefreshToken, refreshSupabaseSession, setAuthCookies, clearAuthCookies } from '@/lib/auth-helpers';

export async function POST(req: NextRequest) {
  try {
    let refreshToken = extractRefreshToken(req);

    // Optional support for reading refreshToken from JSON body if provided directly
    if (!refreshToken) {
      try {
        const body = await req.json();
        if (body && typeof body.refreshToken === 'string') {
          refreshToken = body.refreshToken;
        }
      } catch {}
    }

    if (!refreshToken) {
      const response = NextResponse.json(
        { success: false, error: 'No refresh token provided' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    const refreshResult = await refreshSupabaseSession(refreshToken);

    if (!refreshResult) {
      const response = NextResponse.json(
        { success: false, error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      data: {
        userId: refreshResult.user.id,
        email: refreshResult.user.email,
      },
    });

    setAuthCookies(response, {
      accessToken: refreshResult.session.access_token,
      refreshToken: refreshResult.session.refresh_token,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Session refresh failed';
    const response = NextResponse.json({ success: false, error: msg }, { status: 500 });
    return response;
  }
}
