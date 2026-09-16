'use client';

import React, { useMemo } from 'react';
import { sanitizeRichText, normalizeRichTextForEditor } from '@/lib/rich-text';

interface RichTextContentProps {
  html?: string | null;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Safely renders rich text HTML or legacy plain text with responsive, styled typography.
 */
export const RichTextContent: React.FC<RichTextContentProps> = ({
  html,
  className = '',
  fallback = null,
}) => {
  const sanitizedHtml = useMemo(() => {
    if (!html) return '';
    const normalized = normalizeRichTextForEditor(html);
    return sanitizeRichText(normalized);
  }, [html]);

  if (!sanitizedHtml) {
    return <>{fallback}</>;
  }

  return (
    <div
      className={`rich-text-content text-sm sm:text-base text-text-secondary leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
