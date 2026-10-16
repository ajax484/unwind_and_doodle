'use client';

import React, { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import Button from '@/components/Button';

export interface ServiceEmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  htmlContent: string;
  onOpenTestSend?: () => void;
}

export function ServiceEmailPreviewModal({
  isOpen,
  onClose,
  subject,
  htmlContent,
  onOpenTestSend,
}: ServiceEmailPreviewModalProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-4xl bg-bg-surface rounded-2xl border border-border-default shadow-2xl overflow-hidden flex flex-col h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-border-default bg-bg-subtle/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold font-heading text-text-primary">
              Email Preview
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-status-success-bg text-status-success-text font-semibold">
              Live Sample
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-40">
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

            {onOpenTestSend && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenTestSend();
                }}
                className="text-xs"
              >
                ✉️ Send Test
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Envelope Info */}
        <div className="p-3 bg-bg-subtle border-b border-border-default text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-tertiary w-16">Subject:</span>
            <span className="font-bold text-text-primary">{subject || '(No subject)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-tertiary w-16">From:</span>
            <span className="text-text-secondary">Unwind & Doodle &lt;no-reply@unwindanddoodle.com&gt;</span>
          </div>
        </div>

        {/* Preview Viewport Canvas */}
        <div className="flex-1 overflow-y-auto bg-slate-100/80 p-4 sm:p-6 flex justify-center items-start">
          <div
            className={`w-full transition-all duration-300 bg-white rounded-xl shadow-md border border-border-default overflow-hidden ${
              viewport === 'mobile' ? 'max-w-[375px]' : 'max-w-[620px]'
            }`}
          >
            <div
              className="p-4"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
