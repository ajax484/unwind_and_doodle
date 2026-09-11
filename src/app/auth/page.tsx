'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/account';
  const urlError = searchParams.get('error');

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [signInMethod, setSignInMethod] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(true);

  // States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Check if already authenticated
  useEffect(() => {
    async function checkAuth() {
      if (nextPath.startsWith('/admin')) return;

      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const json = await res.json();
          if (json.authenticated) {
            router.replace(nextPath);
          }
        }
      } catch {
        // Unauthenticated
      }
    }
    checkAuth();
  }, [router, nextPath]);

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
            body: JSON.stringify({
              accessToken,
              refreshToken: refreshToken || undefined,
              intent: 'customer',
            }),
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
          intent: 'customer',
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

  const handleCustomerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide your first and last name');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/auth/register/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          emailMarketingConsent: marketingConsent,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Registration failed');
      }

      window.dispatchEvent(new Event('auth-updated'));
      router.replace(nextPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
        body: JSON.stringify({
          email: email.trim(),
          intent: 'customer',
          next: nextPath,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to send verification email');
      }

      setOtpStep('code');
      setCountdown(60);
      setSuccessMessage(`A 6-digit verification code has been sent to ${email.trim()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error sending verification code');
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
          intent: 'customer',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Invalid or expired code');
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

      const res = await fetch(`/api/auth/google?intent=customer&next=${encodeURIComponent(nextPath)}`);
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

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Brand / Title Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-bg-accent to-bg-brand text-brand-rose flex items-center justify-center font-heading font-bold text-2xl mx-auto mb-3 shadow-xs border border-border-default">
            ✨
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary tracking-tight">
            {activeTab === 'signin' ? 'Welcome Back' : 'Create Your Account'}
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {activeTab === 'signin'
              ? 'Sign in to access your orders, downloads, and saved addresses'
              : 'Join Unwind & Doodle for easy reorders and instant digital downloads'}
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-bg-surface border border-border-default rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Main Tab Toggle: Sign In vs Sign Up */}
          <div className="flex bg-bg-subtle p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'signin'
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'signup'
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Social Sign-In (Google OAuth) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border-default hover:bg-bg-subtle active:bg-bg-brand/20 text-xs font-bold text-text-primary transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {googleLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-border-brand border-t-transparent animate-spin" />
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
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-border-default"></div>
            <span className="shrink mx-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Or with email
            </span>
            <div className="grow border-t border-border-default"></div>
          </div>

          {/* Alert / Error / Success Messages */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-accent text-xs font-medium leading-relaxed animate-in fade-in">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-status-success-bg border border-status-success-accent/30 text-status-success-accent text-xs font-medium leading-relaxed animate-in fade-in">
              {successMessage}
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {activeTab === 'signin' ? (
            <div className="space-y-4">
              {/* Secondary Toggle: Password vs Email Code */}
              <div className="flex bg-bg-subtle p-1 rounded-xl border border-border-default/60 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSignInMethod('password');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
                    signInMethod === 'password'
                      ? 'bg-bg-surface text-action-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignInMethod('otp');
                    setOtpStep('email');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
                    signInMethod === 'otp'
                      ? 'bg-bg-surface text-action-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Email Code / Magic Link
                </button>
              </div>

              {signInMethod === 'password' ? (
                /* Form 1A: Customer Password Sign In */
                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-bg-subtle/50 border border-border-input rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-action-primary focus:ring-1 focus:ring-action-primary transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-text-primary">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] font-semibold text-action-primary hover:text-action-primary-hover"
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
                      className="w-full px-3.5 py-2.5 bg-bg-subtle/50 border border-border-input rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-action-primary focus:ring-1 focus:ring-action-primary transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-action-primary hover:bg-action-primary-hover active:bg-action-primary-deep text-text-inverse text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {loading ? 'Signing In...' : 'Sign In →'}
                  </button>
                </form>
              ) : otpStep === 'email' ? (
                /* Form 1B: OTP / Magic Link Step 1 */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-bg-subtle/50 border border-border-input rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-action-primary focus:ring-1 focus:ring-action-primary transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-action-primary hover:bg-action-primary-hover active:bg-action-primary-deep text-text-inverse text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {loading ? 'Sending Code...' : 'Send Verification Code →'}
                  </button>
                </form>
              ) : (
                /* Form 1C: OTP Step 2 */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-text-primary">6-Digit Code</label>
                      <button
                        type="button"
                        onClick={() => setOtpStep('email')}
                        className="text-[11px] font-semibold text-action-primary hover:text-action-primary-hover"
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
                      className="w-full px-3.5 py-3 bg-bg-subtle/50 border border-border-input rounded-xl text-base text-center tracking-[0.4em] font-mono text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-action-primary focus:ring-1 focus:ring-action-primary transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full py-3 px-4 rounded-xl bg-action-primary hover:bg-action-primary-hover active:bg-action-primary-deep text-text-inverse text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {loading ? 'Verifying...' : 'Verify Code & Sign In →'}
                  </button>

                  <div className="text-center pt-1">
                    {countdown > 0 ? (
                      <span className="text-[11px] text-text-tertiary">Resend code in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-[11px] font-semibold text-action-primary hover:text-action-primary-hover"
                      >
                        Didn&apos;t receive code? Resend
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* TAB 2: SIGN UP (Customer Registration) */
            <form onSubmit={handleCustomerSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Ada"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-subtle/50 border border-border-input rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-action-primary focus:ring-1 focus:ring-action-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Okonkwo"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-subtle/50 border border-border-input rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-action-primary focus:ring-1 focus:ring-action-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-subtle/50 border border-border-input rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-action-primary focus:ring-1 focus:ring-action-primary transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-text-primary">Create Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-action-primary hover:text-action-primary-hover"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-subtle/50 border border-border-input rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-action-primary focus:ring-1 focus:ring-action-primary transition-colors"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="marketingConsent"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 rounded border-border-input text-action-primary focus:ring-action-primary"
                />
                <label htmlFor="marketingConsent" className="text-[11px] text-text-secondary leading-tight">
                  Keep me updated on new coloring book releases, bundles, and discounts.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-action-primary hover:bg-action-primary-hover active:bg-action-primary-deep text-text-inverse text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {loading ? 'Creating Account...' : 'Create Customer Account →'}
              </button>
            </form>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <span>←</span>
            <span>Back to Storefront</span>
          </Link>
          <div className="text-[11px] text-text-tertiary">
            Store Administrator or Team Member?{' '}
            <Link href="/admin/login" className="text-action-primary hover:text-action-primary-hover font-semibold underline">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="w-8 h-8 rounded-full border-2 border-brand-rose border-t-transparent animate-spin" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
