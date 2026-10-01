"use client";

import React, { useState } from "react";
import {
  V1CampaignBlock,
  V1TextBlock,
  V1ImageBlock,
  V1ProductBlock,
  V1ProductGridBlock,
  V1ButtonBlock,
  V1CalloutBlock,
  V1DividerBlock,
  CatalogProductSummary,
  MediaAsset,
} from "@/types/marketing-builder";
import { MarketingSegment } from "@/types/marketing";
import TextInput from "@/components/TextInput";
import Select from "@/components/Select";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import { PersonalizationChipInserter } from "../modals/PersonalizationChipInserter";
import { ProductPickerModal } from "../modals/ProductPickerModal";
import { MediaLibraryModal } from "../modals/MediaLibraryModal";
import { formatPrice } from "@/lib/format-utils";

export interface ContextualSettingsProps {
  selectedBlock: V1CampaignBlock | null;
  // Campaign metadata
  name: string;
  subject: string;
  previewText: string;
  senderName: string;
  senderEmail: string;
  segmentId: string;
  segments: MarketingSegment[];
  loadingSegments: boolean;
  audienceCount: number | null;
  loadingAudience: boolean;
  onUpdateMetadata: (field: string, value: any) => void;
  onUpdateBlock: (
    id: string,
    updates: Partial<V1CampaignBlock["data"]>,
  ) => void;
  onDeselectBlock: () => void;
  onDeleteBlock: (id: string) => void;
}

export function ContextualSettings({
  selectedBlock,
  name,
  subject,
  previewText,
  senderName,
  senderEmail,
  segmentId,
  segments,
  loadingSegments,
  audienceCount,
  loadingAudience,
  onUpdateMetadata,
  onUpdateBlock,
  onDeselectBlock,
  onDeleteBlock,
}: ContextualSettingsProps) {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [productPickerState, setProductPickerState] = useState<{
    isOpen: boolean;
    mode: "single" | "multiple";
  }>({ isOpen: false, mode: "single" });

  // --------------------------------------------------------------------------
  // 1. CAMPAIGN / EMAIL SETTINGS (When no block is selected)
  // --------------------------------------------------------------------------
  if (!selectedBlock) {
    return (
      <aside className="w-80 border-l border-border-default bg-bg-surface flex flex-col h-full overflow-hidden shrink-0">
        <div className="p-4 border-b border-border-default flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            ⚙️ Campaign Settings
          </h3>
          <span className="text-[11px] text-text-tertiary">Global Setup</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Campaign Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Campaign Name
            </label>
            <TextInput
              placeholder="e.g. For the Girls Launch"
              value={name}
              onChange={(e) => onUpdateMetadata("name", e.target.value)}
            />
            <p className="text-[11px] text-text-tertiary">
              Internal name for your admin dashboard
            </p>
          </div>

          {/* Subject Line */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Subject Line
            </label>
            <TextInput
              placeholder="e.g. I made something for the girls 🎀"
              value={subject}
              onChange={(e) => onUpdateMetadata("subject", e.target.value)}
            />
            <PersonalizationChipInserter
              onInsert={(token) =>
                onUpdateMetadata("subject", `${subject} ${token}`.trim())
              }
            />
          </div>

          {/* Preview Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Preview Snippet
            </label>
            <TextInput
              placeholder="e.g. And yes, your name goes on it."
              value={previewText}
              onChange={(e) => onUpdateMetadata("previewText", e.target.value)}
            />
            <p className="text-[11px] text-text-tertiary">
              Secondary line visible in the recipient&apos;s inbox preview.
            </p>
          </div>

          {/* Target Audience Segment */}
          <div className="space-y-1.5 pt-2 border-t border-border-default/70">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary">
                Target Audience
              </label>
              {loadingAudience ? (
                <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                  <Spinner size="sm" /> calculating...
                </span>
              ) : audienceCount !== null ? (
                <span className="text-[11px] font-bold text-brand-rose px-1.5 py-0.5 rounded bg-brand-rose/10">
                  {audienceCount.toLocaleString()}{" "}
                  {audienceCount === 1 ? "recipient" : "recipients"}
                </span>
              ) : null}
            </div>

            <Select
              value={segmentId}
              onChange={(e) => onUpdateMetadata("segmentId", e.target.value)}
              disabled={loadingSegments}
            >
              <option value="">Select Audience Segment...</option>
              {segments.map((seg) => (
                <option key={seg.id} value={seg.id}>
                  {seg.name}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-text-tertiary">
              Only subscribers with confirmed email marketing consent will be
              reached.
            </p>
          </div>

          {/* Sender Identity */}
          <div className="space-y-3 pt-2 border-t border-border-default/70">
            <label className="text-xs font-semibold text-text-primary block">
              Sender Identity
            </label>
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-secondary">
                From Name
              </span>
              <TextInput
                placeholder="Unwind & Doodle"
                value={senderName}
                onChange={(e) => onUpdateMetadata("senderName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-secondary">
                From Email
              </span>
              <TextInput
                placeholder="no-reply@unwindanddoodle.com"
                value={senderEmail}
                onChange={(e) =>
                  onUpdateMetadata("senderEmail", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // --------------------------------------------------------------------------
  // 2. BLOCK-SPECIFIC SETTINGS
  // --------------------------------------------------------------------------
  const blockType = selectedBlock.type;
  const blockData = selectedBlock.data as any;

  return (
    <aside className="w-80 border-l border-border-default bg-bg-surface flex flex-col h-full overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-3.5 border-b border-border-default flex items-center justify-between bg-bg-subtle/30 shrink-0">
        <div>
          <span className="text-[10px] uppercase font-bold text-brand-rose tracking-wider">
            Block Inspector
          </span>
          <h3 className="text-xs font-bold text-text-primary capitalize">
            {blockType} Block
          </h3>
        </div>
        <button
          type="button"
          onClick={onDeselectBlock}
          className="text-xs text-text-tertiary hover:text-text-primary px-2 py-1 rounded hover:bg-bg-subtle"
          title="Done editing block"
        >
          ✕ Close
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TEXT BLOCK SETTINGS */}
        {blockType === "text" && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Text Style
              </label>
              <Select
                value={blockData.style || "body"}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { style: e.target.value })
                }
              >
                <option value="heading">Heading (22px Bold)</option>
                <option value="body">Body (15px Standard)</option>
                <option value="small">Small Note (13px Slate)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Alignment
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { align })}
                    className={`py-1.5 text-xs font-medium rounded-lg border capitalize ${
                      (blockData.align || "left") === align
                        ? "bg-brand-rose text-white border-brand-rose"
                        : "border-border-default bg-white text-text-secondary hover:bg-bg-subtle"
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Content
              </label>
              <textarea
                rows={6}
                value={blockData.content || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { content: e.target.value })
                }
                placeholder="Write your email text here..."
                className="w-full text-xs p-2.5 rounded-xl border border-border-default focus:border-brand-rose focus:ring-1 focus:ring-brand-rose outline-none font-sans leading-relaxed resize-y"
              />
            </div>

            <PersonalizationChipInserter
              onInsert={(token) => {
                const current = blockData.content || "";
                onUpdateBlock(selectedBlock.id, {
                  content: `${current} ${token}`.trim(),
                });
              }}
            />
          </>
        )}

        {/* IMAGE BLOCK SETTINGS */}
        {blockType === "image" && (
          <>
            {/* Image Preview & Media Picker Trigger */}
            <div className="p-3 rounded-xl bg-bg-subtle border border-border-default space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">
                  Media Asset
                </span>
                {blockData.url ? (
                  <span className="text-[10px] text-status-success-accent font-semibold">
                    Attached ✓
                  </span>
                ) : (
                  <span className="text-[10px] text-text-tertiary">
                    No image selected
                  </span>
                )}
              </div>

              {blockData.url && (
                <div className="w-full h-32 rounded-lg bg-white border border-border-default overflow-hidden flex items-center justify-center p-1">
                  <img
                    src={blockData.url}
                    alt={blockData.altText || blockData.alt || "Preview"}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => setIsMediaModalOpen(true)}
                className="text-xs font-bold"
              >
                {blockData.url
                  ? "🔄 Replace Image from Media Library"
                  : "🖼️ Choose from Media Library / Upload"}
              </Button>
            </div>

            {/* Width Toggle: Full vs Constrained */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Image Width
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBlock(selectedBlock.id, { width: "full" })
                  }
                  className={`py-1.5 text-xs font-medium rounded-lg border ${
                    (blockData.width || "full") === "full"
                      ? "bg-brand-rose text-white border-brand-rose font-bold"
                      : "border-border-default bg-white text-text-secondary hover:bg-bg-subtle"
                  }`}
                >
                  Full Width (100%)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBlock(selectedBlock.id, { width: "constrained" })
                  }
                  className={`py-1.5 text-xs font-medium rounded-lg border ${
                    blockData.width === "constrained"
                      ? "bg-brand-rose text-white border-brand-rose font-bold"
                      : "border-border-default bg-white text-text-secondary hover:bg-bg-subtle"
                  }`}
                >
                  Constrained (360px)
                </button>
              </div>
            </div>

            {/* Alignment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Alignment
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { align })}
                    className={`py-1.5 text-xs font-medium rounded-lg border capitalize ${
                      (blockData.align || "center") === align
                        ? "bg-brand-rose text-white border-brand-rose"
                        : "border-border-default bg-white text-text-secondary hover:bg-bg-subtle"
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            {/* Alt Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Alt Text (Accessibility)
              </label>
              <TextInput
                placeholder="Descriptive text for email readers"
                value={blockData.altText || blockData.alt || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, {
                    altText: e.target.value,
                    alt: e.target.value,
                  })
                }
              />
            </div>

            {/* Link URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Link Destination (Optional)
              </label>
              <TextInput
                placeholder="https://... when clicked"
                value={blockData.linkUrl || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { linkUrl: e.target.value })
                }
              />
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Caption (Optional)
              </label>
              <TextInput
                placeholder="Photo caption underneath"
                value={blockData.caption || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { caption: e.target.value })
                }
              />
            </div>

            {/* Direct Image URL fallback */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-text-tertiary">
                Direct Image URL
              </label>
              <TextInput
                placeholder="https://... direct image link"
                value={blockData.url || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { url: e.target.value })
                }
              />
            </div>
          </>
        )}

        {/* PRODUCT BLOCK SETTINGS */}
        {blockType === "product" && (
          <>
            <div className="p-3 rounded-xl bg-bg-subtle border border-border-default space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">
                  Catalog Link
                </span>
                <span className="text-[10px] text-brand-rose font-semibold">
                  Authoritative
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() =>
                  setProductPickerState({ isOpen: true, mode: "single" })
                }
              >
                🎨{" "}
                {blockData.productId ? "Change Product" : "Select from Catalog"}
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Badge Override
              </label>
              <TextInput
                placeholder="e.g. Limited Preorder"
                value={blockData.badge || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { badge: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Description Override
              </label>
              <textarea
                rows={3}
                value={blockData.description || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, {
                    description: e.target.value,
                  })
                }
                placeholder="Custom product blurb..."
                className="w-full text-xs p-2.5 rounded-xl border border-border-default focus:border-brand-rose outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                CTA Button Text
              </label>
              <TextInput
                placeholder="Preorder Now"
                value={blockData.ctaText || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { ctaText: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-border-default/70">
              <label className="text-xs font-semibold text-text-primary block">
                Display Options
              </label>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockData.showPrice !== false}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, {
                      showPrice: e.target.checked,
                    })
                  }
                  className="rounded text-brand-rose focus:ring-brand-rose"
                />
                Show catalog price
              </label>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockData.showDescription !== false}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, {
                      showDescription: e.target.checked,
                    })
                  }
                  className="rounded text-brand-rose focus:ring-brand-rose"
                />
                Show description
              </label>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockData.showCta !== false}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, {
                      showCta: e.target.checked,
                    })
                  }
                  className="rounded text-brand-rose focus:ring-brand-rose"
                />
                Show CTA button
              </label>
            </div>
          </>
        )}

        {/* PRODUCT GRID SETTINGS */}
        {blockType === "product_grid" && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Grid Heading
              </label>
              <TextInput
                placeholder="e.g. Community Favorites"
                value={blockData.heading || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { heading: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-primary">
                  Selected Items
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setProductPickerState({ isOpen: true, mode: "multiple" })
                  }
                  className="text-xs text-brand-rose font-bold hover:underline"
                >
                  + Add Products
                </button>
              </div>

              {(blockData.products || []).length === 0 ? (
                <div className="p-4 border border-dashed border-border-default rounded-xl text-center text-xs text-text-tertiary">
                  No products in grid yet. Click above to add.
                </div>
              ) : (
                <div className="space-y-2">
                  {(blockData.products || []).map((item: any, idx: number) => (
                    <div
                      key={item.productId || idx}
                      className="p-2.5 rounded-xl border border-border-default bg-bg-subtle/50 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-text-primary truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] font-bold text-brand-rose">
                          {formatPrice(item.price || 0)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...(blockData.products || [])];
                            next.splice(idx, 1);
                            onUpdateBlock(selectedBlock.id, { products: next });
                          }}
                          className="p-1 hover:text-status-danger-accent text-xs"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* BUTTON BLOCK SETTINGS */}
        {blockType === "button" && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Button Text
              </label>
              <TextInput
                placeholder="e.g. Shop Now 🎀"
                value={blockData.text || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { text: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Destination URL
              </label>
              <TextInput
                placeholder="https://... or /products/..."
                value={blockData.url || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { url: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Style Variant
              </label>
              <Select
                value={blockData.style || "rose"}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { style: e.target.value })
                }
              >
                <option value="rose">Brand Rose (Primary Action)</option>
                <option value="blue">Brand Blue (Secondary Action)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Alignment
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { align })}
                    className={`py-1.5 text-xs font-medium rounded-lg border capitalize ${
                      (blockData.align || "center") === align
                        ? "bg-brand-rose text-white border-brand-rose"
                        : "border-border-default bg-white text-text-secondary hover:bg-bg-subtle"
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CALLOUT BLOCK SETTINGS */}
        {blockType === "callout" && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Theme Variant
              </label>
              <Select
                value={blockData.variant || "rose"}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { variant: e.target.value })
                }
              >
                <option value="rose">Rose (Highlight / Announcement)</option>
                <option value="blue">Blue (Reflection / Story)</option>
                <option value="cream">Cream (Minimal / Neutral)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Title (Optional)
              </label>
              <TextInput
                placeholder="e.g. Personalized Cover Edition ♡"
                value={blockData.title || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { title: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Message
              </label>
              <textarea
                rows={4}
                value={blockData.message || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { message: e.target.value })
                }
                placeholder="Callout note or quote..."
                className="w-full text-xs p-2.5 rounded-xl border border-border-default focus:border-brand-rose outline-none leading-relaxed"
              />
            </div>

            <PersonalizationChipInserter
              onInsert={(token) => {
                const current = blockData.message || "";
                onUpdateBlock(selectedBlock.id, {
                  message: `${current} ${token}`.trim(),
                });
              }}
            />
          </>
        )}

        {/* DIVIDER BLOCK SETTINGS */}
        {blockType === "divider" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Vertical Spacing
            </label>
            <Select
              value={blockData.spacing || "md"}
              onChange={(e) =>
                onUpdateBlock(selectedBlock.id, { spacing: e.target.value })
              }
            >
              <option value="sm">Small (16px)</option>
              <option value="md">Medium (24px)</option>
              <option value="lg">Large (36px)</option>
            </Select>
          </div>
        )}

        {/* DELETE BLOCK CTA */}
        <div className="pt-4 border-t border-border-default">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => onDeleteBlock(selectedBlock.id)}
            className="text-status-danger-accent border-status-danger-accent/30 hover:bg-status-danger-bg"
          >
            🗑️ Delete Block
          </Button>
        </div>
      </div>

      {/* Product Picker Modal */}
      {productPickerState.isOpen && (
        <ProductPickerModal
          isOpen={productPickerState.isOpen}
          mode={productPickerState.mode}
          initialSelectedIds={
            productPickerState.mode === "single"
              ? blockData.productId
                ? [blockData.productId]
                : []
              : (blockData.products || []).map((p: any) => p.productId)
          }
          onSelect={(selected: CatalogProductSummary[]) => {
            if (productPickerState.mode === "single" && selected[0]) {
              const p = selected[0];
              onUpdateBlock(selectedBlock.id, {
                productId: p.id,
                title: p.title,
                price: p.price,
                imageUrl: p.imageUrl || undefined,
                slug: p.slug,
                description: blockData.description || p.description,
              });
            } else if (productPickerState.mode === "multiple") {
              onUpdateBlock(selectedBlock.id, {
                products: selected.map((p) => ({
                  productId: p.id,
                  title: p.title,
                  price: p.price,
                  imageUrl: p.imageUrl || undefined,
                  slug: p.slug,
                })),
              });
            }
          }}
          onClose={() =>
            setProductPickerState({ isOpen: false, mode: "single" })
          }
        />
      )}

      {/* Media Library Modal */}
      {isMediaModalOpen && (
        <MediaLibraryModal
          isOpen={isMediaModalOpen}
          onSelectMedia={(asset: MediaAsset) => {
            if (selectedBlock) {
              onUpdateBlock(selectedBlock.id, {
                mediaId: asset.id,
                url: asset.url,
                altText: blockData.altText || asset.altText,
                alt: blockData.alt || asset.altText,
              });
            }
          }}
          onClose={() => setIsMediaModalOpen(false)}
        />
      )}
    </aside>
  );
}
