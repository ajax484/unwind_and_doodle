'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';
import { Tabs } from '@/components/Tabs';

export interface ServiceEmailHeaderProps {
  name: string;
  category: string;
  isCustomized: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  viewport: 'desktop' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'mobile') => void;
  onSave: () => void;
  onOpenPreview: () => void;
  onOpenTestSend: () => void;
  onOpenResetModal: () => void;
}

export function ServiceEmailHeader({
  name,
  category,
  isCustomized,
  isSaving,
  hasUnsavedChanges,
  viewport,
  onViewportChange,
  onSave,
  onOpenPreview,
  onOpenTestSend,
  onOpenResetModal,
}: ServiceEmailHeaderProps) {
  return (
    <header className="h-16 border-b border-border-default bg-bg-surface px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-2xs">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/admin/settings/service-emails"
          className="text-xs font-semibold text-text-tertiary hover:text-text-primary px-2.5 py-1.5 rounded-lg hover:bg-bg-subtle flex items-center gap-1 transition-colors shrink-0"
        >
          <span>←</span>
          <span>Service Emails</span>
        </Link>

        <div className="h-4 w-px bg-border-default hidden sm:block" />

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-bold font-heading text-text-primary truncate">
            {name}
          </h1>
          <Badge
            variant="status"
            statusType={isCustomized ? 'warning' : 'neutral'}
            size="sm"
          >
            {isCustomized ? 'Customized' : 'System Default'}
          </Badge>
          <span className="text-[11px] uppercase tracking-wider text-text-tertiary font-bold hidden md:inline">
            {category}
          </span>
        </div>

        {/* Unsaved changes indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-text-tertiary ml-2">
          {isSaving ? (
            <span className="flex items-center gap-1 text-brand-rose">
              <Spinner size="sm" /> Saving...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="text-status-warning-accent font-medium">
              • Unsaved changes
            </span>
          ) : (
            <span className="text-status-success-accent flex items-center gap-1">
              ✓ Saved
            </span>
          )}
        </div>
      </div>

      {/* Center: Viewport Switcher */}
      <div className="hidden lg:block w-44">
        <Tabs
          tabs={[
            { id: 'desktop', label: '💻 Desktop' },
            { id: 'mobile', label: '📱 Mobile' },
          ]}
          activeTab={viewport}
          onChange={(id) => onViewportChange(id as 'desktop' | 'mobile')}
          style="segmented"
          size="sm"
          fullWidth
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isCustomized && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenResetModal}
            className="hidden sm:inline-flex text-xs text-status-danger-accent border-status-danger-accent/30 hover:bg-status-danger-bg"
          >
            Reset Default
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenTestSend}
          className="text-xs"
        >
          ✉️ Test Send
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenPreview}
          className="text-xs"
        >
          👁️ Preview
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="text-xs font-bold shadow-2xs"
        >
          {isSaving ? <Spinner size="sm" /> : '💾 Save Changes'}
        </Button>
      </div>
    </header>
  );
}
