"use client";

import React, { useState, useMemo } from "react";
import { V1CampaignBlock } from "@/types/marketing-builder";
import { MarketingSegment } from "@/types/marketing";
import Button from "@/components/Button";
import TextInput from "@/components/TextInput";
import Spinner from "@/components/Spinner";
import { toast } from "sonner";

export interface CampaignReviewModalProps {
  isOpen: boolean;
  campaignId: string | null;
  name: string;
  subject: string;
  previewText: string;
  senderName: string;
  senderEmail: string;
  segmentId: string;
  segments: MarketingSegment[];
  audienceCount: number | null;
  blocks: V1CampaignBlock[];
  onClose: () => void;
  onSaveBeforeAction: () => Promise<string | null>; // Returns campaignId
  onSuccess: () => void;
}

export function CampaignReviewModal({
  isOpen,
  campaignId,
  name,
  subject,
  previewText,
  senderName,
  senderEmail,
  segmentId,
  segments,
  audienceCount,
  blocks,
  onClose,
  onSaveBeforeAction,
  onSuccess,
}: CampaignReviewModalProps) {
  const [sendMode, setSendMode] = useState<"immediate" | "schedule">(
    "immediate",
  );
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSegment = useMemo(
    () => segments.find((s) => s.id === segmentId),
    [segments, segmentId],
  );

  // Validation Checks
  const checks = [
    {
      id: "name",
      label: "Campaign Name",
      valid: Boolean(name.trim()),
      message: name.trim() ? `"${name.trim()}"` : "Campaign name is required",
    },
    {
      id: "subject",
      label: "Subject Line",
      valid: Boolean(subject.trim()),
      message: subject.trim()
        ? `"${subject.trim()}"`
        : "Subject line is required to send",
    },
    {
      id: "previewText",
      label: "Preview Text",
      valid: Boolean(previewText.trim()),
      message: previewText.trim()
        ? `"${previewText.trim()}"`
        : "Optional preview snippet",
      optional: true,
    },
    {
      id: "blocks",
      label: "Email Content Blocks",
      valid: blocks.length > 0,
      message:
        blocks.length > 0
          ? `${blocks.length} content ${blocks.length === 1 ? "block" : "blocks"} configured`
          : "Email body has no content blocks",
    },
    {
      id: "audience",
      label: "Audience Selected",
      valid: Boolean(segmentId && selectedSegment),
      message: selectedSegment
        ? `${selectedSegment.name} (${audienceCount !== null ? audienceCount.toLocaleString() : "calculating"} recipients)`
        : "Audience segment must be selected",
    },
    {
      id: "consent",
      label: "Marketing Consent",
      valid: true,
      message:
        "Email will strictly dispatch to recipients with confirmed marketing consent",
    },
  ];

  const allRequiredValid = checks
    .filter((c) => !c.optional)
    .every((c) => c.valid);

  const handleExecuteSend = async () => {
    try {
      setProcessing(true);
      setErrorMessage(null);

      // 1. Ensure campaign is saved first
      const activeId = await onSaveBeforeAction();
      if (!activeId) {
        throw new Error("Failed to save campaign before sending.");
      }

      if (sendMode === "immediate") {
        // Dispatch campaign immediately
        const res = await fetch(
          `/api/admin/marketing/campaigns/${activeId}/send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
        );
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to dispatch campaign.");
        }

        toast.success(
          `Campaign "${name}" is now sending to ${audienceCount ?? "selected"} recipients!`,
        );
        onSuccess();
      } else {
        // Schedule campaign
        if (!scheduledDate || !scheduledTime) {
          throw new Error("Please specify both scheduled date and time.");
        }

        const scheduledIso = new Date(
          `${scheduledDate}T${scheduledTime}`,
        ).toISOString();

        const res = await fetch(`/api/admin/marketing/campaigns/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "scheduled",
            scheduled_at: scheduledIso,
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to schedule campaign.");
        }

        toast.success(
          `Campaign scheduled for ${new Date(scheduledIso).toLocaleString()}!`,
        );
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Error executing campaign dispatch.",
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl bg-bg-surface rounded-2xl border border-border-default shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-border-default bg-bg-subtle/50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-heading text-text-primary">
              🚀 Review Campaign Before Sending
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Verify readiness and choose immediate or scheduled delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-bg-subtle"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Validation Checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
              Pre-flight Checklist
            </h4>
            <div className="space-y-2 rounded-xl border border-border-default p-4 bg-bg-subtle/30">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-start gap-2.5 text-xs"
                >
                  <span
                    className={`text-sm font-bold leading-none ${
                      check.valid
                        ? "text-status-success-accent"
                        : "text-status-danger-accent"
                    }`}
                  >
                    {check.valid ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-text-primary mr-1.5">
                      {check.label}:
                    </span>
                    <span
                      className={
                        check.valid
                          ? "text-text-secondary"
                          : "text-status-danger-accent font-medium"
                      }
                    >
                      {check.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Mode */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
              Delivery Options
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer flex flex-col justify-between gap-2 transition-all ${
                  sendMode === "immediate"
                    ? "border-brand-rose bg-brand-rose/5 ring-1 ring-brand-rose"
                    : "border-border-default hover:bg-bg-subtle"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="sendMode"
                    value="immediate"
                    checked={sendMode === "immediate"}
                    onChange={() => setSendMode("immediate")}
                    className="text-brand-rose focus:ring-brand-rose"
                  />
                  <span className="text-xs font-bold text-text-primary">
                    Send Immediately
                  </span>
                </div>
                <p className="text-[11px] text-text-tertiary leading-snug">
                  Dispatches to{" "}
                  {audienceCount !== null
                    ? audienceCount.toLocaleString()
                    : "all"}{" "}
                  recipients right away.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer flex flex-col justify-between gap-2 transition-all ${
                  sendMode === "schedule"
                    ? "border-brand-rose bg-brand-rose/5 ring-1 ring-brand-rose"
                    : "border-border-default hover:bg-bg-subtle"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="sendMode"
                    value="schedule"
                    checked={sendMode === "schedule"}
                    onChange={() => setSendMode("schedule")}
                    className="text-brand-rose focus:ring-brand-rose"
                  />
                  <span className="text-xs font-bold text-text-primary">
                    Schedule for Later
                  </span>
                </div>
                <p className="text-[11px] text-text-tertiary leading-snug">
                  Automatically sends at a specified date and time.
                </p>
              </label>
            </div>

            {sendMode === "schedule" && (
              <div className="p-4 rounded-xl border border-border-default bg-bg-subtle/50 space-y-3 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-text-secondary">
                      Date
                    </span>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-border-default bg-white focus:border-brand-rose"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-text-secondary">
                      Time
                    </span>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-border-default bg-white focus:border-brand-rose"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-text-tertiary">
                  Timezone: West Africa Standard Time (WAT / UTC+1)
                </p>
              </div>
            )}
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-text text-xs">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-default bg-bg-subtle/40 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={processing}
          >
            Back to Editor
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={!allRequiredValid || processing}
            onClick={handleExecuteSend}
            className="shadow-sm font-bold"
          >
            {processing ? (
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" /> Processing...
              </span>
            ) : sendMode === "immediate" ? (
              "🚀 Send Campaign Now"
            ) : (
              "⏰ Confirm Schedule"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
