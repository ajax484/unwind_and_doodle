'use client';

import React, { useState } from 'react';
import { V1CampaignBlockType } from '@/types/marketing-builder';
import { V1_EMAIL_TEMPLATES, V1EmailTemplatePreset } from '@/lib/marketing-templates';
import { Tabs } from '@/components/Tabs';

export interface ComponentPaletteProps {
  onAddBlock: (type: V1CampaignBlockType) => void;
  onApplyTemplate: (template: V1EmailTemplatePreset) => void;
}

const PALETTE_BLOCKS: {
  type: V1CampaignBlockType;
  label: string;
  icon: string;
  description: string;
  category: string;
}[] = [
  {
    type: 'text',
    label: 'Text',
    icon: '📝',
    description: 'Heading, body, and small text styles with token support',
    category: 'Content',
  },
  {
    type: 'image',
    label: 'Image',
    icon: '🖼️',
    description: 'Banner, visual asset, or illustration with custom link',
    category: 'Media',
  },
  {
    type: 'product',
    label: 'Product',
    icon: '🎨',
    description: 'Authoritative catalog item with price, badge, & CTA',
    category: 'Commerce',
  },
  {
    type: 'product_grid',
    label: 'Product Grid',
    icon: '🛍️',
    description: '2-column catalog showcase with live pricing',
    category: 'Commerce',
  },
  {
    type: 'button',
    label: 'Button',
    icon: '🔘',
    description: 'Brand-styled call-to-action pill button',
    category: 'Action',
  },
  {
    type: 'callout',
    label: 'Callout Box',
    icon: '💬',
    description: 'Highlighted notice in Rose, Blue, or Cream theme',
    category: 'Structure',
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '➖',
    description: 'Clean visual horizontal separator',
    category: 'Structure',
  },
];

export function ComponentPalette({ onAddBlock, onApplyTemplate }: ComponentPaletteProps) {
  const [activeTab, setActiveTab] = useState<'blocks' | 'templates'>('blocks');

  return (
    <aside className="w-80 border-r border-border-default bg-bg-surface flex flex-col h-full overflow-hidden shrink-0">
      {/* Top Tab Switcher */}
      <div className="p-3 border-b border-border-default/80 shrink-0">
        <Tabs
          tabs={[
            { id: 'blocks', label: '🧱 Blocks' },
            { id: 'templates', label: '📋 Templates' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'blocks' | 'templates')}
          style="segmented"
          size="sm"
          fullWidth
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'blocks' ? (
          <div>
            <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">
              Add Content Block
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {PALETTE_BLOCKS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => onAddBlock(item.type)}
                  className="w-full p-3 rounded-xl border border-border-default hover:border-brand-rose bg-bg-surface hover:bg-bg-subtle/50 text-left transition-all flex items-start gap-3 group shadow-xs hover:shadow-sm"
                >
                  <span className="text-xl w-8 h-8 rounded-lg bg-bg-subtle flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary group-hover:text-brand-rose">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-text-tertiary bg-bg-subtle px-1.5 py-0.5 rounded font-medium">
                        + Add
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">
              Starter Templates
            </div>
            <div className="space-y-3">
              {V1_EMAIL_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => onApplyTemplate(tmpl)}
                  className="p-3.5 rounded-xl border border-border-default hover:border-brand-rose bg-bg-surface hover:bg-bg-subtle/40 cursor-pointer transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text-primary group-hover:text-brand-rose">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-rose/10 text-brand-rose">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed mb-2">
                    {tmpl.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-2 border-t border-border-default/60">
                    <span>{tmpl.blocks.length} blocks</span>
                    <span className="text-brand-rose font-medium group-hover:underline">
                      Load template →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
