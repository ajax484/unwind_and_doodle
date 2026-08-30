'use client';

import React, { useEffect, useState } from 'react';

export default function AccountPreferencesPage() {
  const [emailConsent, setEmailConsent] = useState(true);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch('/api/account/profile');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setEmailConsent(!!json.data.emailMarketingConsent);
            setWhatsappConsent(!!json.data.whatsappMarketingConsent);
          }
        }
      } catch {
        // Handled in UI
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedback(null);

      const res = await fetch('/api/account/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailMarketingConsent: emailConsent,
          whatsappMarketingConsent: whatsappConsent,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update preferences');
      }

      setFeedback({ type: 'success', text: 'Communication preferences updated!' });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error updating preferences',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card-soft p-12 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#D99BA3] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-slate-800">
          Communication &amp; Marketing
        </h1>
        <p className="text-xs text-slate-500">
          Choose how you receive news, mindful coloring tips, and exclusive discounts.
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

        <div className="space-y-6 divide-y divide-slate-100">
          {/* Email Marketing Toggle */}
          <div className="flex items-start justify-between gap-4 pt-4 first:pt-0">
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>📧</span> Email Newsletter &amp; Offers
              </h3>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Receive weekly mindful doodles, subscriber-only launch discounts, and special stationery collection announcements.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D99BA3]"></div>
            </label>
          </div>

          {/* WhatsApp Marketing Toggle */}
          <div className="flex items-start justify-between gap-4 pt-6">
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>💬</span> WhatsApp VIP Updates
              </h3>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Get direct order dispatch alerts, fast delivery coordination, and early access to limited edition drops on WhatsApp.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D99BA3]"></div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-pink text-xs !py-3 !px-6 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving Preferences...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
