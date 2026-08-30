'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/account';
  const isAdminTarget = nextPath.startsWith('/admin');

  const [authMode, setAuthMode] = useState<'password' | 'otp'>(isAdminTarget ? 'password' : 'otp');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Check if already authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        if (isAdminTarget) {
          const adminRes = await fetch('/api/admin/session');
          if (adminRes.ok) {
            const adminJson = await adminRes.json();
            if (adminJson.authenticated && adminJson.success) {
              router.replace(nextPath);
            }
          }
          return;
        }

        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const json = await res.json();
          if (json.authenticated) {
            router.replace(nextPath);
          }
        }
      } catch {
        // Not logged in
      }
    }
    checkAuth();
  }, [router, nextPath, isAdminTarget]);

  // Handle OAuth hash fragment if present (e.g. #access_token=...)
  useEffect(() => {
    async function handleHashAuth() {
      if (typeof window === 'undefined' || !window.location.hash) return;

      const hashStr = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hashStr);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken) {
        try {
          setLoading(true);
          setError(null);
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
          } else {
            setError(json.error || 'Failed to authenticate session from OAuth');
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Error setting session');
        } finally {
          setLoading(false);
        }
      }
    }

    handleHashAuth();
  }, [router, nextPath]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Invalid email or password');
      }

      window.dispatchEvent(new Event('auth-updated'));
      router.replace(nextPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to send verification code');
      }

      setStep('otp');
      setCountdown(60);
      setSuccessMessage(`We sent a 6-digit code to ${email.trim()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 4) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          token: otp.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Invalid verification code');
      }

      window.dispatchEvent(new Event('auth-updated'));
      router.replace(nextPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);

      const res = await fetch('/api/auth/google');
      const json = await res.json();

      if (res.ok && json.url) {
        window.location.href = json.url;
      } else {
        throw new Error(json.error || 'Could not initialize Google sign in');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting Google sign in');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="card-soft max-w-md w-full p-8 sm:p-10 space-y-8 bg-white border border-[#E2ECF2] shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#FBF0F2] text-[#D99BA3] flex items-center justify-center text-2xl mx-auto shadow-xs">
            {isAdminTarget ? '🛡️' : '🎨'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-800">
            {isAdminTarget
              ? 'Admin Portal Sign In'
              : step === 'email'
              ? 'Welcome to Your Account'
              : 'Verify Your Email'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isAdminTarget
              ? 'Sign in with your organization administrator credentials to access the management dashboard.'
              : step === 'email'
              ? 'Access your orders, addresses, downloads, and wishlist.'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 text-red-600 text-xs rounded-2xl border border-red-100 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 text-emerald-700 text-xs rounded-2xl border border-emerald-100 flex items-center gap-2">
            <span>✓</span> {successMessage}
          </div>
        )}

        {step === 'email' ? (
          <div className="space-y-6">
            {/* Google OAuth Button */}
            {!isAdminTarget && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  {googleLoading ? 'Connecting...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-slate-100 flex-grow" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Or sign in with email
                  </span>
                  <div className="h-px bg-slate-100 flex-grow" />
                </div>
              </>
            )}

            {/* Auth Mode Tabs (Password vs OTP) */}
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('password');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'password'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Password Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'otp'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Email Code (OTP)
              </button>
            </div>

            {authMode === 'password' ? (
              /* Password Sign In Form */
              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@unwindanddoodle.com"
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-pink w-full text-center text-xs sm:text-sm !py-3.5 block disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>
            ) : (
              /* Email OTP Form */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-pink w-full text-center text-xs sm:text-sm !py-3.5 block disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code →'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block text-center">
                6-Digit Security Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                autoFocus
                className="w-full text-center tracking-[0.5em] font-mono text-2xl px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#D99BA3] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="btn-pink w-full text-center text-xs sm:text-sm !py-3.5 block disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Sign In to Account →'}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError(null);
                }}
                className="text-[#4A7A99] hover:underline"
              >
                ← Change Email
              </button>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={countdown > 0 || loading}
                className="text-[#D99BA3] font-semibold hover:underline disabled:text-slate-400 disabled:no-underline"
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Return to Store
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center">Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}
