'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  MarketingAutomation,
  MarketingAutomationType,
  MarketingAutomationStatus,
  MarketingAutomationConfig,
  MarketingAutomationDelayUnit,
  AutomationTriggerEventType,
  MarketingCampaignListItem,
} from '@/types/marketing';
import { AUTOMATION_TYPE_METADATA } from '@/services/marketing-automation.service';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { TextInput } from '@/components/TextInput';
import { Select } from '@/components/Select';
import Spinner from '@/components/Spinner';

interface AutomationFormProps {
  initialAutomation?: MarketingAutomation | null;
}

export function AutomationForm({ initialAutomation }: AutomationFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialAutomation?.id);

  // Form state
  const [name, setName] = useState(initialAutomation?.name || '');
  const [type, setType] = useState<MarketingAutomationType>(
    initialAutomation?.type || 'welcome'
  );
  const [status, setStatus] = useState<MarketingAutomationStatus>(
    initialAutomation?.status || 'draft'
  );

  // Parse existing config if available
  const existingConfig = (
    initialAutomation?.config &&
    typeof initialAutomation.config === 'object' &&
    !Array.isArray(initialAutomation.config)
      ? initialAutomation.config
      : {}
  ) as Partial<MarketingAutomationConfig>;

  // Trigger state
  const meta = AUTOMATION_TYPE_METADATA[type];
  const defaultTrigger = meta?.compatibleEventTypes[0] || 'customer.created';
  const [triggerType, setTriggerType] = useState<AutomationTriggerEventType>(
    existingConfig.trigger?.type || defaultTrigger
  );

  // Delay state
  const [hasDelay, setHasDelay] = useState<boolean>(
    Boolean(existingConfig.delay && existingConfig.delay.amount > 0)
  );
  const [delayAmount, setDelayAmount] = useState<number>(
    existingConfig.delay?.amount ?? (meta?.defaultDelay?.amount || 1)
  );
  const [delayUnit, setDelayUnit] = useState<MarketingAutomationDelayUnit>(
    existingConfig.delay?.unit ?? (meta?.defaultDelay?.unit || 'hours')
  );

  // Action state
  const [campaignId, setCampaignId] = useState<string>(
    existingConfig.action?.campaignId || ''
  );

  // Data fetching
  const [campaigns, setCampaigns] = useState<MarketingCampaignListItem[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available campaigns for action selection
  useEffect(() => {
    async function loadCampaigns() {
      try {
        setLoadingCampaigns(true);
        const res = await fetch('/api/admin/marketing/campaigns?limit=100');
        const json = await res.json();
        if (res.ok && json.success) {
          setCampaigns(json.data || []);
          if (!campaignId && json.data && json.data.length > 0) {
            setCampaignId(json.data[0].id);
          }
        }
      } catch {
        toast.error('Failed to load campaigns list');
      } finally {
        setLoadingCampaigns(false);
      }
    }
    loadCampaigns();
  }, []);

  // Update trigger type when automation type changes if current trigger is incompatible
  const handleTypeChange = (newType: MarketingAutomationType) => {
    setType(newType);
    const newMeta = AUTOMATION_TYPE_METADATA[newType];
    if (newMeta && !newMeta.compatibleEventTypes.includes(triggerType)) {
      setTriggerType(newMeta.compatibleEventTypes[0]);
    }
    if (newMeta?.defaultDelay) {
      setDelayAmount(newMeta.defaultDelay.amount);
      setDelayUnit(newMeta.defaultDelay.unit);
      setHasDelay(newMeta.defaultDelay.amount > 0);
    }
  };

  const selectedCampaign = campaigns.find((c) => c.id === campaignId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Automation name is required.');
      return;
    }

    if (!campaignId) {
      setErrorMessage('Please select a campaign for the email action.');
      return;
    }

    const config: MarketingAutomationConfig = {
      trigger: {
        type: triggerType,
      },
      ...(hasDelay && delayAmount > 0
        ? {
            delay: {
              amount: Number(delayAmount),
              unit: delayUnit,
            },
          }
        : {}),
      action: {
        type: 'email',
        campaignId,
      },
    };

    try {
      setSubmitting(true);
      const url = isEditing
        ? `/api/admin/marketing/automations/${initialAutomation?.id}`
        : '/api/admin/marketing/automations';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          status,
          config,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save automation');
      }

      toast.success(
        isEditing
          ? 'Automation updated successfully'
          : 'Automation created successfully'
      );
      router.push('/admin/marketing/automations');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Informational Callout */}
      <div className="p-4 rounded-xl bg-status-info-bg border border-status-info-accent/30 text-status-info-text text-sm flex items-start gap-3">
        <span className="text-lg">ℹ️</span>
        <div>
          <p className="font-medium font-heading">Automation Foundation (Step 2A)</p>
          <p className="text-xs opacity-90 mt-0.5">
            Configuring and activating an automation sets up trigger matching against commerce domain events.
            Automated email execution and sending will be enabled in Step 2B.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-text text-sm font-medium"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Config Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Basic Information */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="text-base font-semibold font-heading text-text-primary">
              1. Basic Information
            </h3>

            <TextInput
              label="Automation Name"
              placeholder="e.g. Welcome New Customers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Internal name to identify this automation workflow."
              required
            />

            <div>
              <Select
                label="Automation Type"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as MarketingAutomationType)}
                options={[
                  { label: 'Welcome Series (New Subscribers / Customers)', value: 'welcome' },
                  { label: 'Abandoned Checkout Recovery', value: 'abandoned_checkout' },
                  { label: 'Post-Purchase Follow-up', value: 'post_purchase' },
                  { label: 'Customer Win-Back', value: 'win_back' },
                ]}
                helperText={meta?.description}
              />
            </div>
          </div>

          {/* Card 2: Trigger Event */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold font-heading text-text-primary">
                2. Trigger Event
              </h3>
              <Badge variant="brand" size="sm">
                Event-driven
              </Badge>
            </div>

            <Select
              label="Triggering Domain Event"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as AutomationTriggerEventType)}
              options={meta?.compatibleEventTypes.map((et) => ({
                label: `${et} (Compatible with ${meta.label})`,
                value: et,
              })) || []}
              helperText={`Listens for ${triggerType} domain events emitted by the commerce platform.`}
            />

            <div className="bg-bg-subtle p-3.5 rounded-xl border border-border-default text-xs text-text-secondary space-y-1">
              <span className="font-semibold text-text-primary">Event Payload Requirements:</span>
              <p>
                {triggerType.startsWith('order.')
                  ? 'Event payload must contain valid orderId and customer identifier (email or customerId).'
                  : triggerType === 'checkout.abandoned'
                  ? 'Event payload must contain cartId/checkoutId or customer email.'
                  : 'Event payload must contain customerId or email address.'}
              </p>
            </div>
          </div>

          {/* Card 3: Timing & Delay */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="text-base font-semibold font-heading text-text-primary">
              3. Delay Before Action
            </h3>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setHasDelay(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  !hasDelay
                    ? 'bg-action-primary text-text-inverse border-action-primary'
                    : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-subtle'
                }`}
              >
                Instant (No delay)
              </button>
              <button
                type="button"
                onClick={() => setHasDelay(true)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  hasDelay
                    ? 'bg-action-primary text-text-inverse border-action-primary'
                    : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-subtle'
                }`}
              >
                Delay before sending
              </button>
            </div>

            {hasDelay && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <TextInput
                  label="Wait Amount"
                  type="number"
                  min={1}
                  max={90}
                  value={delayAmount}
                  onChange={(e) => setDelayAmount(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  helperText="Maximum delay is 90 days."
                  required
                />
                <Select
                  label="Time Unit"
                  value={delayUnit}
                  onChange={(e) => setDelayUnit(e.target.value as MarketingAutomationDelayUnit)}
                  options={[
                    { label: 'Minutes', value: 'minutes' },
                    { label: 'Hours', value: 'hours' },
                    { label: 'Days', value: 'days' },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Card 4: Action / Email Campaign */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold font-heading text-text-primary">
                4. Action: Send Email
              </h3>
              <Badge variant="status" statusType="purple" size="sm">
                Email Action
              </Badge>
            </div>

            {loadingCampaigns ? (
              <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
                <Spinner size="sm" />
                <span>Loading available email campaigns...</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-4 rounded-xl bg-status-warning-bg border border-status-warning-accent/30 text-status-warning-text text-sm">
                <p className="font-semibold">No campaigns found</p>
                <p className="mt-1 text-xs">
                  Automations require an email campaign to use as the template. Please create an email campaign first.
                </p>
                <Link
                  href="/admin/marketing/campaigns/new"
                  className="inline-block mt-3 text-xs font-semibold underline"
                >
                  Create a Campaign ➔
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <Select
                  label="Select Campaign Template"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  options={campaigns.map((c) => ({
                    label: `${c.name} (${c.subject || 'No subject'})`,
                    value: c.id,
                  }))}
                  helperText="The subject, content, and sender from this campaign will be sent upon trigger."
                />

                {selectedCampaign && (
                  <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-default text-xs space-y-1 text-text-secondary">
                    <p>
                      <span className="font-semibold text-text-primary">Subject:</span>{' '}
                      {selectedCampaign.subject || '—'}
                    </p>
                    <p>
                      <span className="font-semibold text-text-primary">Status:</span>{' '}
                      {selectedCampaign.status}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Side Column: Preview & Status */}
        <div className="space-y-6">
          {/* Status Selection */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-semibold font-heading text-text-primary">
              Status & Activation
            </h3>

            <Select
              label="Operational Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MarketingAutomationStatus)}
              options={[
                { label: 'Draft (Inactive)', value: 'draft' },
                { label: 'Active (Listening for events)', value: 'active' },
                { label: 'Paused (Temporarily disabled)', value: 'paused' },
              ]}
              helperText={
                status === 'active'
                  ? 'Will respond to events once Step 2B execution is turned on.'
                  : 'Inactive automations do not match or respond to domain events.'
              }
            />
          </div>

          {/* Workflow Sequence Summary */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-semibold font-heading text-text-primary">
              Automation Flow
            </h3>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-default">
              {/* Trigger */}
              <div className="flex items-start gap-3 relative pl-1">
                <span className="w-5 h-5 rounded-full bg-status-info-accent text-text-inverse text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="text-xs font-semibold text-text-primary">When Event Occurs</p>
                  <Badge variant="brand" size="sm" className="mt-1 font-mono text-[10px]">
                    {triggerType}
                  </Badge>
                </div>
              </div>

              {/* Delay */}
              <div className="flex items-start gap-3 relative pl-1">
                <span className="w-5 h-5 rounded-full bg-status-warning-accent text-text-inverse text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="text-xs font-semibold text-text-primary">Delay Duration</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {!hasDelay ? 'Instant (no delay)' : `Wait ${delayAmount} ${delayUnit}`}
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-start gap-3 relative pl-1">
                <span className="w-5 h-5 rounded-full bg-status-purple-base text-text-inverse text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="text-xs font-semibold text-text-primary">Action Executed</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Send Email: {selectedCampaign ? selectedCampaign.name : 'Selected Campaign'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || (campaigns.length === 0 && !loadingCampaigns)}
              className="w-full justify-center"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span>Saving...</span>
                </div>
              ) : isEditing ? (
                'Update Automation'
              ) : (
                'Create Automation'
              )}
            </Button>

            <Link href="/admin/marketing/automations" className="w-full">
              <Button type="button" variant="secondary" className="w-full justify-center">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
