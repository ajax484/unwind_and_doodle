'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PublicInvitationDetail } from '@/types/admin-team';

export default function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [invitation, setInvitation] = useState<PublicInvitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  // Unauthenticated onboarding mode
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signup');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // 1. Fetch invitation metadata
  useEffect(() => {
    async function loadInvitation() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/invitations/${token}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Invalid or expired invitation link');
        }

        setInvitation(json.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid invitation link');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadInvitation();
    }
  }, [token]);

  // 2. Fetch current user session to determine auth state & email match
  useEffect(() => {
    async function checkSession() {
      try {
        setAuthLoading(true);
        const res = await fetch('/api/auth/session');
        const json = await res.json();

        if (res.ok && json.authenticated && json.data?.user) {
          setCurrentUserEmail(json.data.user.email || null);
        } else {
          setCurrentUserEmail(null);
        }
      } catch {
        setCurrentUserEmail(null);
      } finally {
        setAuthLoading(false);
      }
    }

    checkSession();
  }, []);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      setError(null);

      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to accept invitation');
      }

      setAcceptSuccess(true);
      window.dispatchEvent(new Event('auth-updated'));
      setTimeout(() => {
        router.replace('/admin');
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleAccountCreateAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation?.email) return;
    if (!password || password.length < 6) {
      setError('Please choose a password with at least 6 characters');
      return;
    }

    try {
      setSubmittingAuth(true);
      setError(null);

      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          fullName: 'Team Member',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to accept invitation');
      }

      setAcceptSuccess(true);
      window.dispatchEvent(new Event('auth-updated'));
      setTimeout(() => {
        router.replace('/admin');
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSignOutAndSwitch = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setCurrentUserEmail(null);
      window.dispatchEvent(new Event('auth-updated'));
    } catch {
      setCurrentUserEmail(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2ECF2] shadow-sm flex items-center justify-center text-2xl animate-spin mb-4">
          ⚙️
        </div>
        <p className="text-sm font-heading font-semibold text-slate-600">Verifying invitation...</p>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center text-3xl mx-auto mb-4">
            ⚠️
          </div>
          <h1 className="text-xl font-bold font-heading text-slate-800">Invalid Invitation</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {error || 'The invitation link you followed is not valid or has expired.'}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation || invitation.isExpired || invitation.isAccepted) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center text-3xl mx-auto mb-4">
            ⚠️
          </div>
          <h1 className="text-xl font-bold font-heading text-slate-800">
            {invitation?.isAccepted ? 'Invitation Already Accepted' : 'Invitation Expired'}
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {invitation?.isAccepted
              ? 'This invitation link has already been used to join the team.'
              : 'This invitation link has expired. Please request a new invitation from your store administrator.'}
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/admin/login"
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Admin Sign In
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isEmailMatching =
    currentUserEmail &&
    currentUserEmail.trim().toLowerCase() === invitation.email.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl">
        {/* Organization Brand */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center text-3xl mx-auto mb-3 shadow-xs">
            🛡️
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
            Team Invitation
          </span>
          <h1 className="text-xl font-bold font-heading text-slate-800 mt-2">
            Join {invitation.organizationName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            You have been invited to collaborate as an{' '}
            <strong className="text-slate-700 capitalize font-bold">{invitation.role}</strong>.
          </p>
        </div>

        {/* Invitation Info Box */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 mb-6 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Invited Email:</span>
            <span className="font-bold text-slate-700">{invitation.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Role:</span>
            <span className="font-bold text-rose-600 capitalize">{invitation.role}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Expires:</span>
            <span className="text-slate-500">
              {new Date(invitation.expiresAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Success message */}
        {acceptSuccess ? (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center text-emerald-700 space-y-1 animate-in zoom-in-95">
            <span className="text-2xl block">🎉</span>
            <p className="text-xs font-bold">Welcome to the team!</p>
            <p className="text-[11px] text-emerald-600">Redirecting to admin console...</p>
          </div>
        ) : authLoading ? (
          <div className="py-4 text-center text-slate-400 text-xs">Checking your account session...</div>
        ) : !currentUserEmail ? (
          /* STATE 1: Unauthenticated -> Direct Setup & Accept Form */
          <div className="space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAuthTab('signup')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  authTab === 'signup' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('signin')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  authTab === 'signin' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAccountCreateAndAccept} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={invitation.email}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {authTab === 'signup' ? 'Create Password' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-rose-500 hover:text-rose-600"
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
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAuth || accepting}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submittingAuth || accepting
                  ? 'Joining Organization...'
                  : authTab === 'signup'
                  ? 'Set Password & Join Team →'
                  : 'Sign In & Join Team →'}
              </button>
            </form>
          </div>
        ) : isEmailMatching ? (
          /* STATE 2: Authenticated with matching email */
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-800">
              <span className="text-sm">✓</span>
              <span>
                Signed in as <strong>{currentUserEmail}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {accepting ? 'Joining Organization...' : 'Accept Invitation & Join Team'}
            </button>
          </div>
        ) : (
          /* STATE 3: Authenticated with mismatched email */
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Account Mismatch</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                You are currently signed in as <strong>{currentUserEmail}</strong>, but this invitation was sent to{' '}
                <strong>{invitation.email}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOutAndSwitch}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              Sign Out &amp; Switch to {invitation.email}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
