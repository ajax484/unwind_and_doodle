'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminUnauthorizedPage() {
  const router = useRouter();

  const handleSwitchAccount = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      window.dispatchEvent(new Event('auth-updated'));
      router.push('/auth?next=/admin');
    } catch {
      router.push('/auth?next=/admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm text-center space-y-6">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mx-auto border border-amber-100 shadow-xs">
          🛡️
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-heading text-slate-900">Access Denied</h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            You don&apos;t have permission to access the store administration area.
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 text-left space-y-1.5">
          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
            <span>ℹ️</span> Organization Membership Required
          </div>
          <p className="text-[11px] leading-relaxed">
            Administrative access requires an active team membership with administrative privileges. If you are a team member, please sign in with your designated organization credentials.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="w-full py-3.5 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-heading font-bold transition-colors shadow-sm cursor-pointer"
          >
            Sign In with Different Account
          </button>

          <Link
            href="/"
            className="w-full block py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
          >
            Return to Store
          </Link>
        </div>

        <div className="text-[11px] text-slate-400">
          Unwind &amp; Doodle Security Boundary
        </div>
      </div>
    </div>
  );
}
