'use client';

import React from 'react';
import { V1CampaignBlockType } from '@/types/marketing-builder';
import Button from '@/components/Button';

export interface ServiceEmailPaletteProps {
  onAddBlock: (type: V1CampaignBlockType) => void;
  onRestoreDefaults: () => void;
  showItemsTableBlock?: boolean;
  onAddItemsTableBlock?: () => void;
}

const AVAILABLE_BLOCKS: {
  type: V1CampaignBlockType;
  label: string;
  icon: string;
}[] = [
  { type: 'text', label: 'Text', icon: '📝' },
  { type: 'button', label: 'Button', icon: '🔘' },
  { type: 'callout', label: 'Callout', icon: '💬' },
  { type: 'divider', label: 'Divider', icon: '➖' },
  { type: 'image', label: 'Image', icon: '🖼️' },
];

export function ServiceEmailPalette({
  onAddBlock,
  onRestoreDefaults,
  showItemsTableBlock = false,
  onAddItemsTableBlock,
}: ServiceEmailPaletteProps) {
  return (
    <aside className="w-64 border-r border-border-default bg-bg-surface flex flex-col h-full shrink-0">
      <div className="p-3.5 border-b border-border-default">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
          Components
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {AVAILABLE_BLOCKS.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onAddBlock(item.type)}
            className="w-full p-2.5 rounded-xl border border-border-default bg-white hover:border-brand-rose hover:bg-bg-subtle/50 transition-all text-left flex items-center gap-2.5 group cursor-pointer shadow-2xs"
          >
            <span className="text-lg w-7 h-7 flex items-center justify-center rounded-lg bg-bg-subtle group-hover:bg-brand-rose/10 transition-colors">
              {item.icon}
            </span>
            <span className="text-xs font-semibold text-text-primary group-hover:text-brand-rose">
              {item.label}
            </span>
          </button>
        ))}

        {showItemsTableBlock && onAddItemsTableBlock && (
          <button
            type="button"
            onClick={onAddItemsTableBlock}
            className="w-full p-2.5 rounded-xl border border-border-default bg-white hover:border-brand-rose hover:bg-bg-subtle/50 transition-all text-left flex items-center gap-2.5 group cursor-pointer shadow-2xs"
          >
            <span className="text-lg w-7 h-7 flex items-center justify-center rounded-lg bg-bg-subtle group-hover:bg-brand-rose/10 transition-colors">
              📋
            </span>
            <span className="text-xs font-semibold text-text-primary group-hover:text-brand-rose">
              Order Items Table
            </span>
          </button>
        )}
      </div>

      <div className="p-3 border-t border-border-default">
        <Button
          variant="outline"
          size="sm"
          onClick={onRestoreDefaults}
          className="w-full text-xs"
        >
          Reset Layout
        </Button>
      </div>
    </aside>
  );
}
