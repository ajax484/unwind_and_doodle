'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { MarketingCampaign, MarketingSegment } from '@/types/marketing';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import Select from '@/components/Select';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';
import { Tabs } from '@/components/Tabs';
import { EmailEditor } from './EmailEditor';
import { EmailPreview } from './EmailPreview';
import { TestSendModal } from './TestSendModal';
import { ScheduleModal } from './ScheduleModal';

export interface CampaignComposerProps {
  initialCampaign?: MarketingCampaign | null;
}

export function CampaignComposer({ initialCampaign }: CampaignComposerProps) {
  const router = useRouter();

  // Campaign State
  const [campaignId, setCampaignId] = useState<string | null>(initialCampaign?.id || null);
  const [name, setName] = useState(initialCampaign?.name || '');
  const [subject, setSubject] = useState(initialCampaign?.subject || '');
  const [previewText, setPreviewText] = useState(initialCampaign?.preview_text || '');
  const [senderName, setSenderName] = useState(initialCampaign?.sender_name || 'Unwind & Doodle');
  const [senderEmail, setSenderEmail] = useState(
    initialCampaign?.sender_email || 'no-reply@unwindanddoodle.com'
  );
  const [segmentId, setSegmentId] = useState<string>(initialCampaign?.segment_id || '');
  const [contentHtml, setContentHtml] = useState<string>(
    typeof initialCampaign?.content === 'object' && initialCampaign?.content !== null && 'html' in initialCampaign.content
      ? (initialCampaign.content as { html: string }).html
      : ''
  );
  const [status, setStatus] = useState<string>(initialCampaign?.status || 'draft');
  const [scheduledAt, setScheduledAt] = useState<string | null>(initialCampaign?.scheduled_at || null);

  // Lookups & Audience State
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isTestSendOpen, setIsTestSendOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'compose' | 'preview'>('compose');

  // Load Segments
  useEffect(() => {
    async function loadSegments() {
      try {
        setLoadingSegments(true);
        const res = await fetch('/api/admin/marketing/segments?active=true');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSegments(json.data);
        }
      } catch (err) {
        console.error('Failed to load marketing segments', err);
      } finally {
        setLoadingSegments(false);
      }
    }
    loadSegments();
  }, []);

  // Fetch Audience Count when segment changes
  useEffect(() => {
    if (!segmentId) {
      setAudienceCount(null);
      return;
    }

    async function loadAudience() {
      try {
        setLoadingAudience(true);
        const res = await fetch(`/api/admin/marketing/segments/${segmentId}/count`);
        const json = await res.json();
        if (json.success && typeof json.count === 'number') {
          setAudienceCount(json.count);
        } else {
          setAudienceCount(null);
        }
      } catch (err) {
        console.error('Failed to load segment audience count', err);
        setAudienceCount(null);
      } finally {
        setLoadingAudience(false);
      }
    }

    loadAudience();
  }, [segmentId]);

  // Track changes
  const markChanged = () => setHasUnsavedChanges(true);

  // Client validation
  const validateForm = (isDraft = false): boolean => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push('Campaign name is required.');
    }

    if (!isDraft) {
      if (!subject.trim()) {
        errors.push('Subject line is required before scheduling or sending a test.');
      }
      if (!senderName.trim()) {
        errors.push('Sender name is required.');
      }
      if (!senderEmail.trim()) {
        errors.push('Sender email is required.');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(senderEmail.trim())) {
          errors.push('Sender email is not a valid email address.');
        }
      }
      if (!segmentId) {
        errors.push('An audience segment must be selected.');
      }
      if (!contentHtml.trim() || contentHtml.trim() === '<p></p>' || contentHtml.trim() === '<br>') {
        errors.push('Email content cannot be empty.');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save draft
  const handleSaveDraft = async (): Promise<string | null> => {
    if (!validateForm(true)) {
      toast.error('Please fix validation errors before saving.');
      return null;
    }

    try {
      setSaving(true);
      setValidationErrors([]);

      const payload = {
        name: name.trim(),
        subject: subject.trim() || null,
        preview_text: previewText.trim() || null,
        sender_name: senderName.trim() || null,
        sender_email: senderEmail.trim() || null,
        segment_id: segmentId || null,
        content: { html: contentHtml, text: '' },
        status: status === 'scheduled' ? 'scheduled' : 'draft',
        scheduled_at: scheduledAt || null,
      };

      if (campaignId) {
        // Update existing campaign
        const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to update draft.');
        }

        setHasUnsavedChanges(false);
        toast.success('Draft saved successfully.');
        return campaignId;
      } else {
        // Create new campaign
        const res = await fetch('/api/admin/marketing/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to create campaign draft.');
        }

        const newId = json.data.id;
        setCampaignId(newId);
        setHasUnsavedChanges(false);
        toast.success('Draft created successfully.');

        // Seamlessly transition URL to edit view
        window.history.replaceState(null, '', `/admin/marketing/campaigns/${newId}`);
        return newId;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving draft';
      toast.error(msg);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Handle schedule action click
  const handleOpenSchedule = async () => {
    if (!validateForm(false)) {
      toast.error('Please complete all required campaign fields before scheduling.');
      return;
    }

    // Ensure draft is saved first
    const savedId = await handleSaveDraft();
    if (savedId) {
      setIsScheduleOpen(true);
    }
  };

  // Confirm schedule
  const handleConfirmSchedule = async (timing: 'now' | 'later', scheduleTimestamp?: string) => {
    if (!campaignId) return;

    const newStatus = timing === 'later' ? 'scheduled' : 'draft';
    const newScheduledAt = timing === 'later' ? scheduleTimestamp : null;

    const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        scheduled_at: newScheduledAt,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to schedule campaign.');
    }

    setStatus(newStatus);
    setScheduledAt(newScheduledAt || null);
    toast.success(
      timing === 'later'
        ? `Campaign scheduled for ${new Date(scheduleTimestamp!).toLocaleString()}`
        : 'Campaign marked as ready. (Provider delivery enabled in Step 1G)'
    );
  };

  const selectedSegment = useMemo(() => {
    return segments.find((s) => s.id === segmentId);
  }, [segments, segmentId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div className="flex flex-col gap-1">
          <Link
            href="/admin/marketing/campaigns"
            className="text-xs font-semibold text-action-primary hover:underline flex items-center gap-1 w-fit"
          >
            ← Back to Campaigns
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading text-text-primary">
              {name.trim() || 'New Email Campaign'}
            </h1>
            <Badge
              variant="status"
              statusType={
                status === 'scheduled'
                  ? 'purple'
                  : status === 'sent'
                  ? 'success'
                  : status === 'failed'
                  ? 'danger'
                  : 'neutral'
              }
              size="sm"
            >
              {status.toUpperCase()}
            </Badge>
            {hasUnsavedChanges ? (
              <span className="text-xs text-status-warning-accent font-medium">• Unsaved changes</span>
            ) : (
              <span className="text-xs text-text-tertiary">All changes saved</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setIsTestSendOpen(true)}
          >
            Send Test
          </Button>

          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={handleOpenSchedule}
          >
            {status === 'scheduled' ? 'Update Schedule' : 'Schedule / Send'}
          </Button>
        </div>
      </div>

      {/* Validation Errors Alert Banner */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-text text-xs space-y-1">
          <div className="font-bold font-heading">Please resolve the following:</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mobile View Switcher */}
      <div className="lg:hidden">
        <Tabs
          tabs={[
            { id: 'compose', label: '✏️ Compose' },
            { id: 'preview', label: '👁️ Preview' },
          ]}
          activeTab={mobileTab}
          onChange={(id) => setMobileTab(id as 'compose' | 'preview')}
          style="segmented"
          fullWidth
        />
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls & Editor */}
        <div
          className={`lg:col-span-7 space-y-6 ${
            mobileTab === 'compose' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Card 1: Campaign Metadata */}
          <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs space-y-4">
            <h2 className="text-base font-bold font-heading text-text-primary border-b border-border-default/60 pb-3">
              1. Campaign Details
            </h2>

            <div>
              <TextInput
                label="Internal Campaign Name *"
                placeholder="e.g. August Back-to-School Launch"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  markChanged();
                }}
                helperText="For admin organization reference; not shown to email recipients."
              />
            </div>
          </div>

          {/* Card 2: Audience Selection & Dynamic Count */}
          <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
              <h2 className="text-base font-bold font-heading text-text-primary">
                2. Audience Selection
              </h2>
              {loadingAudience ? (
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <Spinner size="sm" />
                  <span>Calculating audience...</span>
                </div>
              ) : audienceCount !== null ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-secondary font-medium">Estimated Audience:</span>
                  <Badge variant="status" statusType="purple" size="md">
                    {audienceCount.toLocaleString()} customers
                  </Badge>
                </div>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Target Segment *
              </label>
              <Select
                value={segmentId}
                onChange={(e) => {
                  setSegmentId(e.target.value);
                  markChanged();
                }}
                placeholder="-- Select a customer segment --"
                options={[
                  { label: '-- Select a customer segment --', value: '' },
                  ...segments.map((seg) => ({
                    label: seg.name,
                    value: seg.id,
                  })),
                ]}
                disabled={loadingSegments}
                helperText="Enforces mandatory email marketing consent dynamically via the segmentation engine."
              />
            </div>

            {selectedSegment && (
              <div className="p-3 bg-bg-subtle rounded-xl text-xs text-text-secondary space-y-1">
                <div className="font-semibold text-text-primary">
                  {selectedSegment.name}
                </div>
                {selectedSegment.description && (
                  <p className="text-text-tertiary">{selectedSegment.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Envelope Settings */}
          <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs space-y-4">
            <h2 className="text-base font-bold font-heading text-text-primary border-b border-border-default/60 pb-3">
              3. Email Envelope
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <TextInput
                  label="Sender Name *"
                  placeholder="e.g. Unwind & Doodle"
                  value={senderName}
                  onChange={(e) => {
                    setSenderName(e.target.value);
                    markChanged();
                  }}
                />
              </div>

              <div>
                <TextInput
                  label="Sender Email *"
                  type="email"
                  placeholder="no-reply@unwindanddoodle.com"
                  value={senderEmail}
                  onChange={(e) => {
                    setSenderEmail(e.target.value);
                    markChanged();
                  }}
                  helperText="Configured system identity for provider delivery."
                />
              </div>
            </div>

            <div>
              <TextInput
                label="Subject Line *"
                placeholder="e.g. A little something for your next order"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  markChanged();
                }}
              />
            </div>

            <div>
              <TextInput
                label="Preview Text"
                placeholder="e.g. Discover our newest cozy collection inside..."
                value={previewText}
                onChange={(e) => {
                  setPreviewText(e.target.value);
                  markChanged();
                }}
                helperText="Snippet shown beside the subject line in email inboxes."
              />
            </div>
          </div>

          {/* Card 4: Email Content Editor */}
          <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs space-y-4">
            <h2 className="text-base font-bold font-heading text-text-primary border-b border-border-default/60 pb-3">
              4. Compose Email Content
            </h2>

            <EmailEditor
              value={contentHtml}
              onChange={(html) => {
                setContentHtml(html);
                markChanged();
              }}
              placeholder="Start drafting your marketing email here. Use formatting buttons or insert personalization variables..."
            />
          </div>
        </div>

        {/* Right Column: Interactive Live Preview (Sticky on Desktop) */}
        <div
          className={`lg:col-span-5 lg:sticky lg:top-6 ${
            mobileTab === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          <EmailPreview
            senderName={senderName}
            senderEmail={senderEmail}
            subject={subject}
            previewText={previewText}
            htmlContent={contentHtml}
          />
        </div>
      </div>

      {/* Test Send Modal */}
      <TestSendModal
        isOpen={isTestSendOpen}
        onClose={() => setIsTestSendOpen(false)}
        campaignId={campaignId}
        onSaveBeforeTest={handleSaveDraft}
      />

      {/* Schedule Confirmation Modal */}
      <ScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        campaignName={name}
        segmentName={selectedSegment?.name || 'No segment selected'}
        estimatedAudience={audienceCount}
        subject={subject}
        onConfirmSchedule={handleConfirmSchedule}
      />
    </div>
  );
}
