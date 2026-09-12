'use client';

import React, { useState } from 'react';
import { sanitizeHtml, replacePersonalizationTags } from '@/lib/sanitize-html';
import { Tabs } from '@/components/Tabs';

export interface EmailPreviewProps {
  senderName: string;
  senderEmail: string;
  subject: string;
  previewText?: string;
  htmlContent: string;
}

export function EmailPreview({
  senderName,
  senderEmail,
  subject,
  previewText,
  htmlContent,
}: EmailPreviewProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

  // Replace personalization tokens with sample data for visual preview
  const sampleData = {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com',
  };

  const previewSubject = replacePersonalizationTags(subject || '(No subject)', sampleData);
  const previewSnippet = replacePersonalizationTags(previewText || '', sampleData);
  const sanitizedBody = sanitizeHtml(replacePersonalizationTags(htmlContent || '<p>No content written yet.</p>', sampleData));

  return (
    <div className="flex flex-col gap-4">
      {/* Viewport switcher */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          Email Preview
        </span>
        <div className="w-48">
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
      </div>

      {/* Preview viewport wrapper */}
      <div className="flex justify-center p-4 sm:p-6 bg-bg-subtle/70 rounded-2xl border border-border-default min-h-[420px] overflow-hidden">
        <div
          className={`w-full transition-all duration-300 bg-white rounded-xl shadow-md border border-border-default overflow-hidden flex flex-col ${
            viewport === 'mobile' ? 'max-w-[375px]' : 'max-w-xl'
          }`}
        >
          {/* Email Envelope Header */}
          <div className="p-4 bg-slate-50/80 border-b border-border-default/60 flex flex-col gap-2 text-xs">
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
                  Jane Doe &lt;jane.doe@example.com&gt;
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-0.5 pt-0.5">
              <span className="text-sm font-bold font-heading text-text-primary break-words">
                {previewSubject}
              </span>
              {previewSnippet && (
                <span className="text-[11px] text-text-tertiary italic break-words">
                  {previewSnippet}
                </span>
              )}
            </div>
          </div>

          {/* Email Rendered Body */}
          <div
            className="p-6 overflow-y-auto max-h-[500px] text-sm text-text-primary leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />

          {/* Email Footer Preview */}
          <div className="mt-auto p-4 bg-slate-50 border-t border-border-default/40 text-[11px] text-text-tertiary text-center">
            <p>Unwind & Doodle • 123 Creativity Lane</p>
            <p className="mt-1">
              You received this email because you opted into marketing updates. Unsubscribe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
