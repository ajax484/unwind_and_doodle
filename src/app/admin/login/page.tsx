'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/admin';
  const urlError = searchParams.get('error');

  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [error, setError] = useState<string | null>(urlError || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // 1. Check if user already has an active administrative session
  useEffect(() => {
    async function checkExistingAdminSession() {
      try {
        const res = await fetch('/api/admin/session');
        if (res.ok) {
          const json = await res.json();
          if (json.authenticated && json.success) {
            router.replace(nextPath);
            return;
          }
        }
      } catch {
        // Not authenticated
      } finally {
        setVerifyingSession(false);
      }
    }

    checkExistingAdminSession();
  }, [router, nextPath]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyAndRedirectAdmin = async () => {
    const adminRes = await fetch('/api/admin/session');
    const adminJson = await adminRes.json();

    if (!adminRes.ok || !adminJson.success) {
      if (adminJson.code === 'FORBIDDEN' || adminRes.status === 403) {
        throw new Error(
          'Access Denied: Your account is authenticated, but you are not registered as an administrator or team member in this organization.'
        );
      }
      throw new Error(adminJson.error || 'Failed to verify organization credentials');
    }

    window.dispatchEvent(new Event('auth-updated'));
    router.replace(nextPath);
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid administrative email address');
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
          intent: 'admin',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Invalid administrator email or password');
      }

      await verifyAndRedirectAdmin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid administrative email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          intent: 'admin',
          next: nextPath,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to send login code');
      }

      setStep('otp');
      setCountdown(60);
      setSuccessMessage(`A 6-digit verification code has been sent to ${email.trim()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error sending login code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit code sent to your email');
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
          intent: 'admin',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Invalid or expired verification code');
      }

      await verifyAndRedirectAdmin();
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

      const res = await fetch(`/api/auth/google?intent=admin&next=${encodeURIComponent(nextPath)}`);
      const json = await res.json();

      if (!res.ok || !json.success || !json.url) {
        throw new Error(json.error || 'Failed to initialize Google Sign-In');
      }

      window.location.href = json.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in error');
      setGoogleLoading(false);
    }
  };

  if (verifyingSession) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 shadow-sm flex items-center justify-center text-2xl animate-spin mb-4 text-rose-400">
          ⚙️
        </div>
        <p className="text-sm font-heading font-semibold text-slate-300">Checking admin portal credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Portal Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl mx-auto mb-3 shadow-xl text-rose-400">
            🛡️
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-[10px] font-bold uppercase tracking-wider text-rose-300 mb-2">
            <span>Admin Console</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
            Administrator Sign In
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authorized store administrators and team members only
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Social Sign-In (Google OAuth) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-200 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {googleLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign In with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-slate-700"></div>
            <span className="shrink mx-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Or with credentials
            </span>
            <div className="grow border-t border-slate-700"></div>
          </div>

          {/* Auth Mode Toggle */}
          <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authMode === 'password'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('otp');
                setStep('email');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authMode === 'otp'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Email Code (OTP)
            </button>
          </div>

          {/* Alert / Error / Success Messages */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs font-medium leading-relaxed animate-in fade-in">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs font-medium leading-relaxed animate-in fade-in">
              {successMessage}
            </div>
          )}

          {/* Form 1: Password Login */}
          {authMode === 'password' ? (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Admin Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@unwindanddoodle.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-950/40"
              >
                {loading ? 'Authenticating Admin...' : 'Sign In to Console →'}
              </button>
            </form>
          ) : step === 'email' ? (
            /* Form 2A: OTP Email Step */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Admin Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@unwindanddoodle.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-950/40"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code →'}
              </button>
            </form>
          ) : (
            /* Form 2B: OTP Code Verify Step */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">6-Digit Code</label>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                  >
                    Change Email
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-base text-center tracking-[0.4em] font-mono text-white placeholder-slate-600 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-950/40"
              >
                {loading ? 'Verifying...' : 'Verify & Enter Console →'}
              </button>

              <div className="text-center pt-1">
                {countdown > 0 ? (
                  <span className="text-[11px] text-slate-500">Resend code in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                  >
                    Didn&apos;t receive code? Resend
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Invitation Notice */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">
              New team member? Team access is strictly by invitation. Check your inbox for your invite link.
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Return to Live Store</span>
          </Link>
          <div className="text-[11px] text-slate-500">
            Need customer account access?{' '}
            <Link href="/auth" className="text-slate-400 hover:text-rose-400 underline">
              Customer Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
          <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-rose-500 animate-spin" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
