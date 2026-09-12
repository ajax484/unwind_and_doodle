'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import Badge from '@/components/Badge';

export interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  segmentName: string;
  estimatedAudience: number | null;
  subject: string;
  onConfirmSchedule: (timing: 'now' | 'later', scheduledAt?: string) => Promise<void>;
}

export function ScheduleModal({
  isOpen,
  onClose,
  campaignName,
  segmentName,
  estimatedAudience,
  subject,
  onConfirmSchedule,
}: ScheduleModalProps) {
  const [timing, setTiming] = useState<'now' | 'later'>('later');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (timing === 'later') {
      if (!scheduledAt) {
        setError('Please select a date and time to schedule this campaign.');
        return;
      }
      const selectedDate = new Date(scheduledAt);
      if (Number.isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
        setError('Scheduled date must be in the future.');
        return;
      }
    }

    try {
      setLoading(true);
      await onConfirmSchedule(timing, timing === 'later' ? new Date(scheduledAt).toISOString() : undefined);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to schedule campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Campaign Schedule"
      description="Review campaign details before scheduling."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campaign Summary Box */}
        <div className="p-4 rounded-xl bg-bg-subtle/70 border border-border-default space-y-3 text-xs">
          <div className="flex justify-between items-start gap-2">
            <span className="text-text-tertiary font-medium">Campaign:</span>
            <span className="font-bold text-text-primary text-right">{campaignName || 'Untitled Campaign'}</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-text-tertiary font-medium">Audience Segment:</span>
            <span className="font-medium text-text-primary text-right">{segmentName || 'None selected'}</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-text-tertiary font-medium">Estimated Audience:</span>
            <span className="font-bold text-action-secondary-text">
              {estimatedAudience !== null ? `${estimatedAudience.toLocaleString()} customers` : 'Calculating...'}
            </span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-text-tertiary font-medium">Subject Line:</span>
            <span className="font-medium text-text-primary text-right break-all">{subject || '(Empty subject)'}</span>
          </div>

          {/* Dynamic Audience Caveat */}
          <div className="p-2.5 rounded-lg bg-status-warning-bg/40 border border-status-warning-accent/30 text-[11px] text-text-secondary">
            ⚠️ <strong>Dynamic Audience:</strong> The recipient count above is an estimate evaluated right now. Audience eligibility (including marketing consent) will be dynamically evaluated when sent.
          </div>
        </div>

        {/* Schedule Timing Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-text-primary">
            Delivery Timing
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                timing === 'later'
                  ? 'border-border-brand bg-action-secondary-bg/30 text-action-secondary-text font-semibold'
                  : 'border-border-default hover:bg-bg-subtle text-text-secondary'
              }`}
            >
              <input
                type="radio"
                name="delivery_timing"
                value="later"
                checked={timing === 'later'}
                onChange={() => setTiming('later')}
                className="text-action-primary focus:ring-action-primary"
              />
              <span className="text-xs">Schedule for Later</span>
            </label>

            <label
              className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                timing === 'now'
                  ? 'border-border-brand bg-action-secondary-bg/30 text-action-secondary-text font-semibold'
                  : 'border-border-default hover:bg-bg-subtle text-text-secondary'
              }`}
            >
              <input
                type="radio"
                name="delivery_timing"
                value="now"
                checked={timing === 'now'}
                onChange={() => setTiming('now')}
                className="text-action-primary focus:ring-action-primary"
              />
              <span className="text-xs">Send Now</span>
            </label>
          </div>

          {timing === 'later' && (
            <div className="pt-2">
              <TextInput
                label="Date & Time"
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                helperText="Select a future date and time for scheduled delivery."
              />
            </div>
          )}

          {timing === 'now' && (
            <div className="p-3 rounded-xl bg-status-info-bg/40 border border-status-info-accent/30 text-xs text-text-secondary">
              ℹ️ In Step 1F, email provider delivery is not yet connected. Saving as &quot;Send Now&quot; will mark the campaign as ready, but real delivery will begin in Step 1G.
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-text text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Confirming...' : timing === 'later' ? 'Schedule Campaign' : 'Confirm'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
