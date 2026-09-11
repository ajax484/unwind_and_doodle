'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import Button from '@/components/Button';

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
        <div className="w-8 h-8 rounded-full border-2 border-action-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-text-tertiary">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading text-text-primary">
          Personal Profile
        </h1>
        <p className="text-xs text-text-secondary">
          Update your contact details and account information.
        </p>
      </div>

      <div className="card-soft p-6 sm:p-8 bg-white border border-border-default shadow-xs space-y-6">
        {feedback && (
          <div
            className={`p-3.5 text-xs rounded-2xl border flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-status-success-bg text-status-success-accent border-status-success-accent/30'
                : 'bg-status-danger-bg text-status-danger-accent border-status-danger-accent/30'
            }`}
          >
            <span>{feedback.type === 'success' ? '✓' : '⚠️'}</span> {feedback.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          {/* Email (Read Only Auth Identity) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary block">
              Email Address (Login Identity)
            </label>
            <input
              type="email"
              disabled
              value={profile?.email || ''}
              className="w-full px-4 py-3 rounded-2xl border border-border-default bg-bg-subtle text-xs sm:text-sm text-text-tertiary cursor-not-allowed"
            />
            <span className="text-[10px] text-text-tertiary">
              🔒 Email is your passwordless login identity and cannot be edited directly.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary block">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Bilal"
                className="w-full px-4 py-3 rounded-2xl border border-border-input text-xs sm:text-sm text-text-primary focus:outline-hidden focus:border-border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary block">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sani"
                className="w-full px-4 py-3 rounded-2xl border border-border-input text-xs sm:text-sm text-text-primary focus:outline-hidden focus:border-border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary block">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full px-4 py-3 rounded-2xl border border-border-input text-xs sm:text-sm text-text-primary focus:outline-hidden focus:border-border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary block">
                WhatsApp Number (Optional)
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full px-4 py-3 rounded-2xl border border-border-input text-xs sm:text-sm text-text-primary focus:outline-hidden focus:border-border-accent"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-rose text-xs !py-3 !px-6 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="card-soft p-6 sm:p-8 bg-status-danger-bg/50 border border-status-danger-accent/30 shadow-xs space-y-3">
        <h3 className="font-heading font-bold text-sm text-status-danger-accent">
          Account Deactivation &amp; Privacy
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          Deactivating your account will anonymize your personal information and disconnect your login.
          Historical transaction and invoice records will be preserved for accounting integrity.
        </p>
        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="text-xs font-semibold text-status-danger-accent hover:text-status-danger-deep underline cursor-pointer pt-1 block"
        >
          Delete My Account →
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        size="sm"
        title="Delete Your Account?"
        description="This action cannot be undone. Your personal details will be anonymized and you will be signed out immediately."
        footer={
          <div className="flex items-center justify-center gap-3 w-full">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={handleDeleteAccount}
              loading={deleting}
              disabled={deleting}
              className="bg-status-danger-accent hover:bg-status-danger-accent/90 shadow-none"
            >
              Yes, Delete Account
            </Button>
          </div>
        }
      >
        <div className="w-12 h-12 rounded-2xl bg-status-danger-bg text-status-danger-accent flex items-center justify-center text-2xl mx-auto">
          ⚠️
        </div>
      </Modal>
    </div>
  );
}
