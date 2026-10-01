"use client";

import React from "react";
import Link from "next/link";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Spinner from "@/components/Spinner";
import { Tabs } from "@/components/Tabs";

export interface BuilderHeaderProps {
  name: string;
  status: string;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  viewport: "desktop" | "mobile";
  onViewportChange: (viewport: "desktop" | "mobile") => void;
  onSave: () => void;
  onOpenPreview: () => void;
  onOpenTestSend: () => void;
  onOpenReview: () => void;
}

export function BuilderHeader({
  name,
  status,
  isSaving,
  hasUnsavedChanges,
  viewport,
  onViewportChange,
  onSave,
  onOpenPreview,
  onOpenTestSend,
  onOpenReview,
}: BuilderHeaderProps) {
  return (
    <header className="h-16 border-b border-border-default bg-bg-surface px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/admin/marketing/campaigns"
          className="text-xs font-semibold text-text-tertiary hover:text-text-primary px-2.5 py-1.5 rounded-lg hover:bg-bg-subtle flex items-center gap-1 transition-colors flex-shrink-0"
        >
          <span>←</span>
          <span className="hidden sm:inline">Campaigns</span>
        </Link>

        <div className="h-4 w-px bg-border-default hidden sm:block" />

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-bold font-heading text-text-primary truncate">
            {name.trim() || "Untitled Campaign"}
          </h1>
          <Badge
            variant="status"
            statusType={
              status === "sent"
                ? "success"
                : status === "scheduled"
                  ? "warning"
                  : status === "sending"
                    ? "info"
                    : "neutral"
            }
            size="sm"
          >
            {status}
          </Badge>
        </div>

        {/* Autosave / Save state indicator */}
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
              ✓ All changes saved
            </span>
          )}
        </div>
      </div>

      {/* Center: Viewport Switcher */}
      <div className="hidden lg:block w-44">
        <Tabs
          tabs={[
            { id: "desktop", label: "💻 Desktop" },
            { id: "mobile", label: "📱 Mobile" },
          ]}
          activeTab={viewport}
          onChange={(id) => onViewportChange(id as "desktop" | "mobile")}
          style="segmented"
          size="sm"
          fullWidth
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Test Send */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenTestSend}
          className="hidden sm:inline-flex text-xs"
        >
          ✉️ Test Send
        </Button>

        {/* Full Preview */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenPreview}
          className="text-xs"
        >
          👁️ Preview
        </Button>

        {/* Manual Save */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="text-xs"
        >
          {isSaving ? <Spinner size="sm" /> : "💾 Save"}
        </Button>

        {/* Review & Send */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenReview}
          className="text-xs font-bold shadow-sm"
        >
          🚀 Review &amp; Send
        </Button>
      </div>
    </header>
  );
}
