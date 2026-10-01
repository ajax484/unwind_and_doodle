'use client';

import React, { useState, useMemo } from 'react';
import { V1CampaignBlock, TEST_PERSONAS, TestPersona } from '@/types/marketing-builder';
import { renderMarketingTemplate } from '@/services/marketing-renderer.service';
import { Tabs } from '@/components/Tabs';
import Select from '@/components/Select';
import Button from '@/components/Button';

export interface EmailPreviewDrawerProps {
  isOpen: boolean;
  blocks: V1CampaignBlock[];
  subject: string;
  previewText?: string;
  senderName: string;
  senderEmail: string;
  onClose: () => void;
}

export function EmailPreviewDrawer({
  isOpen,
  blocks,
  subject,
  previewText,
  senderName,
  senderEmail,
  onClose,
}: EmailPreviewDrawerProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(TEST_PERSONAS[0].id);

  const activePersona: TestPersona =
    TEST_PERSONAS.find((p) => p.id === selectedPersonaId) || TEST_PERSONAS[0];

  // Render personalized body through the authoritative renderer
  const personalizedHtml = useMemo(() => {
    return renderMarketingTemplate({ blocks }, activePersona.context, { isHtml: true });
  }, [blocks, activePersona]);

  // Personalized subject & preview text
  const personalizedSubject = useMemo(() => {
    return renderMarketingTemplate(subject || '(No subject)', activePersona.context, { isHtml: false });
  }, [subject, activePersona]);

  const personalizedPreview = useMemo(() => {
    return renderMarketingTemplate(previewText || '', activePersona.context, { isHtml: false });
  }, [previewText, activePersona]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-4xl bg-bg-surface rounded-2xl border border-border-default shadow-2xl overflow-hidden flex flex-col h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-border-default bg-bg-subtle/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold font-heading text-text-primary">
              📧 Email Preview
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-status-success-bg text-status-success-text font-semibold">
              Live Renderer
            </span>
          </div>

          {/* Viewport + Persona Selectors */}
          <div className="flex items-center gap-3">
            {/* Viewport Switcher */}
            <div className="w-44">
              <Tabs
                tabs={[
                  { id: 'desktop', label: '💻 Desktop' },
                  { id: 'mobile', label: '📱 Mobile' },
                ]}
                activeTab={viewport}
                onChange={(id) => setViewport(id as 'desktop' | 'mobile')}
                style="segmented"
                size="sm"
                fullWidth
              />
            </div>

            {/* Persona Switcher */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-text-tertiary font-medium">Preview as:</span>
              <Select
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                className="text-xs py-1"
              >
                {TEST_PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-bg-subtle ml-2"
              title="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Center Rendered Preview */}
        <div className="flex-1 bg-bg-subtle/80 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
          <div
            className={`w-full transition-all duration-300 bg-white rounded-2xl shadow-xl border border-border-default overflow-hidden flex flex-col ${
              viewport === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]'
            }`}
          >
            {/* Inbox Envelope Header */}
            <div className="p-4 bg-slate-50/90 border-b border-border-default/80 flex flex-col gap-2 text-xs">
              <div className="flex items-baseline justify-between border-b border-slate-200/50 pb-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-semibold text-text-secondary">From:</span>
                  <span className="text-text-primary font-medium truncate">
                    {senderName || 'Unwind & Doodle'}{' '}
                    <span className="text-text-tertiary text-[11px]">
                      &lt;{senderEmail || 'no-reply@unwindanddoodle.com'}&gt;
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between border-b border-slate-200/50 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-text-secondary">To:</span>
                  <span className="text-text-primary font-medium">
                    {activePersona.context.firstName} {activePersona.context.lastName} &lt;
                    {activePersona.context.email}&gt;
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 pt-0.5">
                <span className="text-sm font-bold font-heading text-text-primary break-words">
                  {personalizedSubject}
                </span>
                {personalizedPreview && (
                  <span className="text-[11px] text-text-tertiary italic break-words">
                    {personalizedPreview}
                  </span>
                )}
              </div>
            </div>

            {/* Email Rendered Body */}
            <div
              className="p-6 overflow-y-auto text-sm text-text-primary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: personalizedHtml }}
            />

            {/* Footer */}
            <div className="p-5 bg-slate-50 border-t border-border-default/60 text-[11px] text-text-tertiary text-center space-y-1">
              <p className="font-semibold text-text-secondary">Unwind &amp; Doodle • Abuja, Nigeria</p>
              <p>You received this email because you subscribed to our creative updates.</p>
              <p className="pt-1">
                <span className="underline cursor-pointer">Unsubscribe</span>
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 border-t border-border-default bg-bg-surface flex items-center justify-between text-xs">
          <div className="text-text-tertiary">
            Personalization rendered using test persona context: <strong className="text-text-secondary">{activePersona.context.firstName} {activePersona.context.lastName}</strong>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Back to Editor
          </Button>
        </div>
      </div>
    </div>
  );
}
