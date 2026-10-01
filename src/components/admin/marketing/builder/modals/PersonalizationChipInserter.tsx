'use client';

import React from 'react';
import { SUPPORTED_PERSONALIZATION_TOKENS, PersonalizationToken } from '@/types/marketing-builder';

export interface PersonalizationChipInserterProps {
  onInsert: (tokenStr: string) => void;
  className?: string;
}

export function PersonalizationChipInserter({
  onInsert,
  className = '',
}: PersonalizationChipInserterProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">Insert Personalization Token:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUPPORTED_PERSONALIZATION_TOKENS.map((item: PersonalizationToken) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onInsert(item.token)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-bg-accent text-text-accent hover:bg-brand-rose/20 transition-colors border border-border-accent/40"
            title={`Example: "${item.sampleValue}"`}
          >
            <span className="opacity-70">✨</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
