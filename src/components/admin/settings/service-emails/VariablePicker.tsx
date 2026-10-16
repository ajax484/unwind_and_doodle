'use client';

import React from 'react';
import { ServiceEmailVariable } from '@/types/service-email';

export interface VariablePickerProps {
  variables: ServiceEmailVariable[];
  onSelectVariable: (token: string) => void;
  label?: string;
  className?: string;
}

export function VariablePicker({
  variables,
  onSelectVariable,
  label = 'Insert Variable',
  className = '',
}: VariablePickerProps) {
  if (!variables || variables.length === 0) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => onSelectVariable(`{{${v.key}}}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-bg-accent text-text-accent hover:bg-brand-rose/20 transition-colors border border-border-accent/40"
            title={`Example: ${v.example}`}
          >
            <span>✨</span>
            <span>{v.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
