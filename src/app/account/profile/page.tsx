'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProfileData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  whatsappNumber: string | null;
}

export default function AccountProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/account/profile');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setProfile(json.data);
            setFirstName(json.data.firstName || '');
            setLastName(json.data.lastName || '');
            setPhone(json.data.phone || '');
            setWhatsappNumber(json.data.whatsappNumber || '');
          }
        }
      } catch {
        // Handled in UI
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);

      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          whatsappNumber: whatsappNumber.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update profile');
      }

      window.dispatchEvent(new Event('auth-updated'));
      setFeedback({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error updating profile',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete account');
      }

      window.dispatchEvent(new Event('auth-updated'));
      router.replace('/?accountDeleted=true');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting account');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="card-soft p-12 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#D99BA3] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading text-slate-800">
          Personal Profile
        </h1>
        <p className="text-xs text-slate-500">
          Update your contact details and account information.
        </p>
      </div>

      <div className="card-soft p-6 sm:p-8 bg-white border border-[#E2ECF2] shadow-xs space-y-6">
        {feedback && (
          <div
            className={`p-3.5 text-xs rounded-2xl border flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-red-50 text-red-600 border-red-100'
            }`}
          >
            <span>{feedback.type === 'success' ? '✓' : '⚠️'}</span> {feedback.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          {/* Email (Read Only Auth Identity) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Email Address (Login Identity)
            </label>
            <input
              type="email"
              disabled
              value={profile?.email || ''}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-500 cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400">
              🔒 Email is your passwordless login identity and cannot be edited directly.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Bilal"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sani"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                WhatsApp Number (Optional)
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-pink text-xs !py-3 !px-6 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="card-soft p-6 sm:p-8 bg-red-50/40 border border-red-100 shadow-xs space-y-3">
        <h3 className="font-heading font-bold text-sm text-red-800">
          Account Deactivation &amp; Privacy
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Deactivating your account will anonymize your personal information and disconnect your login.
          Historical transaction and invoice records will be preserved for accounting integrity.
        </p>
        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="text-xs font-semibold text-red-600 hover:text-red-700 underline cursor-pointer pt-1 block"
        >
          Delete My Account →
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-heading font-bold text-lg text-slate-800">
                Delete Your Account?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This action cannot be undone. Your personal details will be anonymized and you will be signed out immediately.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deactivating...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
