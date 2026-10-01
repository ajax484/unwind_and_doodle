'use client';

import React, { useState, useRef, useEffect } from 'react';
import { V1CampaignBlockType } from '@/types/marketing-builder';

export interface BlockInserterProps {
  onInsert: (type: V1CampaignBlockType) => void;
  index: number;
}

const BLOCK_OPTIONS: { type: V1CampaignBlockType; label: string; icon: string; desc: string }[] = [
  { type: 'text', label: 'Text', icon: '📝', desc: 'Heading, body, or small text' },
  { type: 'image', label: 'Image', icon: '🖼️', desc: 'Banner or illustration with link' },
  { type: 'product', label: 'Product', icon: '🎨', desc: 'Featured item from catalog' },
  { type: 'product_grid', label: 'Product Grid', icon: '🛍️', desc: '2-column catalog showcase' },
  { type: 'button', label: 'Button', icon: '🔘', desc: 'Brand call-to-action button' },
  { type: 'callout', label: 'Callout', icon: '💬', desc: 'Highlighted notice or quote' },
  { type: 'divider', label: 'Divider', icon: '➖', desc: 'Clean horizontal spacing rule' },
];

export function BlockInserter({ onInsert, index }: BlockInserterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative py-1 group flex items-center justify-center my-0.5">
      {/* Visual divider line */}
      <div className="absolute inset-x-0 h-px bg-transparent group-hover:bg-brand-rose/40 transition-colors" />

      {/* Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative z-10 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
          isOpen
            ? 'bg-brand-rose text-white ring-2 ring-brand-rose/30 scale-105'
            : 'bg-white text-text-secondary border border-border-default hover:border-brand-rose hover:text-brand-rose opacity-60 group-hover:opacity-100 hover:scale-105'
        }`}
        title="Add block here"
      >
        <span className="text-sm leading-none font-bold">+</span>
        <span>Add block</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full mt-2 z-30 w-72 bg-bg-surface rounded-2xl border border-border-default shadow-xl p-2 animate-fade-in text-left"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
            Insert Content Block
          </div>
          <div className="space-y-1">
            {BLOCK_OPTIONS.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  onInsert(item.type);
                  setIsOpen(false);
                }}
                className="w-full px-2.5 py-2 rounded-xl text-left hover:bg-bg-subtle flex items-center gap-2.5 transition-colors group/item"
              >
                <span className="text-lg w-7 h-7 rounded-lg bg-bg-subtle/80 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-text-primary group-hover/item:text-brand-rose">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-text-tertiary truncate">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
