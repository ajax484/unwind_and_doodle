'use client';

import React from 'react';
import { V1CampaignBlock } from '@/types/marketing-builder';

export interface BlockWrapperProps {
  block: V1CampaignBlock;
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  image: 'Image',
  product: 'Product Card',
  product_grid: 'Product Grid',
  button: 'Button',
  callout: 'Callout',
  divider: 'Divider',
};

export function BlockWrapper({
  block,
  isSelected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  children,
}: BlockWrapperProps) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative group rounded-xl transition-all duration-150 p-2 my-1 cursor-pointer ${
        isSelected
          ? 'ring-2 ring-brand-rose bg-brand-rose/5'
          : 'hover:ring-1 hover:ring-border-strong/40 hover:bg-black/[0.01]'
      }`}
    >
      {/* Action Toolbar Header on Select or Hover */}
      <div
        className={`absolute -top-3.5 right-3 z-20 flex items-center gap-1 bg-neutral-charcoal text-white text-xs px-2 py-0.5 rounded-lg shadow-lg transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-300 mr-1.5">
          {BLOCK_TYPE_LABELS[block.type] || block.type}
        </span>

        {/* Move Up */}
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          className="p-1 hover:text-brand-rose disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          ▲
        </button>

        {/* Move Down */}
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          className="p-1 hover:text-brand-rose disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          ▼
        </button>

        <span className="text-slate-600">|</span>

        {/* Duplicate */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1 hover:text-brand-blue"
          title="Duplicate block"
        >
          📋
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 hover:text-status-danger-accent"
          title="Delete block"
        >
          🗑️
        </button>
      </div>

      {/* Render Block Content */}
      <div className="relative pointer-events-auto">{children}</div>
    </div>
  );
}
