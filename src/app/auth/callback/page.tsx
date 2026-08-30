'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const nextPath = searchParams.get('next') || '/account';

  useEffect(() => {
    async function handleAuthCallback() {
      // 1. If authorization code is present in URL params, forward to server API handler
      if (code) {
        window.location.href = `/api/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(nextPath)}`;
        return;
      }

      // 2. If access_token is present in URL hash fragment
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashStr = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hashStr);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          try {
            const res = await fetch('/api/auth/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken, refreshToken: refreshToken || undefined }),
            });

            const json = await res.json();
            if (res.ok && json.success) {
              window.dispatchEvent(new Event('auth-updated'));
              router.replace(nextPath);
              return;
            }
          } catch {
            router.replace('/auth?error=Session establishment failed');
            return;
          }
        }
      }

      // 3. Otherwise check existing session
      try {
        const res = await fetch('/api/auth/session');
        const json = await res.json();
        if (json.authenticated) {
          window.dispatchEvent(new Event('auth-updated'));
          router.replace(nextPath);
        } else {
          router.replace('/auth');
        }
      } catch {
        router.replace('/auth');
      }
    }

    handleAuthCallback();
  }, [router, code, nextPath]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 space-y-4">
      <div className="w-12 h-12 rounded-full border-4 border-[#D99BA3] border-t-transparent animate-spin" />
      <h2 className="font-heading font-bold text-lg text-slate-800">
        Completing Sign In...
      </h2>
      <p className="text-xs text-slate-500">Redirecting to your account dashboard.</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
