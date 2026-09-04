'use client';

import React, { useState } from 'react';

export interface NewsletterSectionProps {
  email?: string;
  status?: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  onEmailChange?: (email: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onSuccess?: () => void;
}

export default function NewsletterSection({
  email: controlledEmail,
  status: controlledStatus,
  message: controlledMessage,
  onEmailChange: controlledOnEmailChange,
  onSubmit: controlledOnSubmit,
  onSuccess,
}: NewsletterSectionProps = {}) {
  const [internalEmail, setInternalEmail] = useState('');
  const [internalStatus, setInternalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [internalMessage, setInternalMessage] = useState('');

  const isControlled = controlledEmail !== undefined && controlledOnSubmit !== undefined;
  const email = isControlled ? controlledEmail : internalEmail;
  const status = isControlled ? (controlledStatus || 'idle') : internalStatus;
  const message = isControlled ? (controlledMessage || '') : internalMessage;

  const handleEmailChange = (val: string) => {
    if (isControlled && controlledOnEmailChange) {
      controlledOnEmailChange(val);
    } else {
      setInternalEmail(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isControlled && controlledOnSubmit) {
      controlledOnSubmit(e);
      return;
    }

    e.preventDefault();
    if (!email.trim()) return;

    try {
      setInternalStatus('loading');
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setInternalStatus('success');
        setInternalMessage(json.message || 'Thank you for joining our community!');
        setInternalEmail('');
        onSuccess?.();
      } else {
        setInternalStatus('error');
        setInternalMessage(json.error || 'Failed to subscribe. Please try again.');
      }
    } catch {
      setInternalStatus('error');
      setInternalMessage('Network error. Please try again later.');
    }
  };

  return (
    <section className="w-full bg-white py-16 sm:py-24 lg:py-32 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F4F8FA] border-2 border-[#EDF3F7] rounded-3xl p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-xs">
          <div className="space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block">
              The Mindful Letter
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-bold text-[#243342]">
              Stay in the loop.
            </h2>
            <p className="text-xs sm:text-sm text-[#52657A] leading-relaxed">
              New product editions, creative journaling prompts, and occasional quiet inspirations in your inbox. No spam.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                required
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                disabled={status === 'loading'}
                className="form-input text-xs sm:text-sm flex-grow !py-3"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-rose text-xs sm:text-sm !py-3 !px-6 whitespace-nowrap"
              >
                {status === 'loading' ? 'Joining...' : 'Subscribe'}
              </button>
            </div>

            {message && (
              <p
                className={`text-xs font-medium ${
                  status === 'success' ? 'text-[#1F7A4D]' : 'text-[#B33948]'
                }`}
              >
                {message}
              </p>
            )}
          </form>

          <p className="text-[11px] text-[#8295A8]">
            By subscribing you agree to receive updates from Unwind &amp; Doodle. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
