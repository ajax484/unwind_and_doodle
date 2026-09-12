'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';

export interface TestSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string | null;
  onSaveBeforeTest?: () => Promise<string | null>;
}

export function TestSendModal({
  isOpen,
  onClose,
  campaignId,
  onSaveBeforeTest,
}: TestSendModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: 'info' | 'error';
    title: string;
    description: string;
  } | null>(null);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail.trim() || !emailRegex.test(recipientEmail.trim())) {
      setResultMessage({
        type: 'error',
        title: 'Invalid Email',
        description: 'Please enter a valid email address to receive the test email.',
      });
      return;
    }

    try {
      setLoading(true);

      let targetId = campaignId;
      if (!targetId && onSaveBeforeTest) {
        targetId = await onSaveBeforeTest();
      }

      if (!targetId) {
        setResultMessage({
          type: 'error',
          title: 'Save Required',
          description: 'Please save your campaign draft before sending a test.',
        });
        return;
      }

      const res = await fetch(`/api/admin/marketing/campaigns/${targetId}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: recipientEmail.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setResultMessage({
          type: 'error',
          title: 'Send Failed',
          description: json.error || 'Failed to dispatch test email.',
        });
      } else {
        setResultMessage({
          type: 'info',
          title: 'Test Email Dispatched 🎉',
          description: json.message || `Test email dispatched to ${recipientEmail} via provider.`,
        });
      }
    } catch (err: unknown) {
      setResultMessage({
        type: 'error',
        title: 'Request Failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResultMessage(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Send Test Email"
      description="Validate your campaign and verify test delivery capabilities."
      size="md"
    >
      <form onSubmit={handleSendTest} className="space-y-4">
        <div>
          <TextInput
            label="Recipient Email Address"
            type="email"
            required
            placeholder="your-email@example.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            helperText="The test email will be formatted with sample customer data."
          />
        </div>

        {resultMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs leading-relaxed border ${
              resultMessage.type === 'info'
                ? 'bg-brand-blue-light/40 border-brand-blue/30 text-text-primary'
                : 'bg-status-danger-bg border-status-danger-accent/30 text-status-danger-text'
            }`}
          >
            <div className="font-bold font-heading mb-1">{resultMessage.title}</div>
            <div>{resultMessage.description}</div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleClose} type="button">
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={loading || !recipientEmail.trim()}
          >
            {loading ? 'Verifying...' : 'Send Test'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
