'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { sanitizeHtml } from '@/lib/sanitize-html';

export interface EmailEditorProps {
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmailEditor({
  value,
  onChange,
  placeholder = 'Write your email content here...',
  disabled = false,
}: EmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Synchronize incoming value into contentEditable when not internally edited
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText;
    onChange(html, text);
  }, [onChange]);

  const exec = (command: string, arg?: string) => {
    if (disabled) return;
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleInsertLink = () => {
    if (disabled) return;
    const url = window.prompt('Enter destination URL (https://...):');
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
      exec('createLink', url);
    } else if (url) {
      alert('Please enter a valid URL starting with https://, http://, or mailto:');
    }
  };

  const handleInsertVariable = (variableName: string) => {
    if (disabled) return;
    if (editorRef.current) {
      editorRef.current.focus();
      // Insert token text at current cursor selection
      document.execCommand('insertText', false, `{{${variableName}}}`);
      handleInput();
    }
  };

  return (
    <div className="w-full flex flex-col rounded-2xl border border-border-default bg-bg-surface shadow-xs transition-all focus-within:ring-2 focus-within:ring-border-brand focus-within:border-border-brand">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-b border-border-default bg-bg-subtle/50 rounded-t-2xl">
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings */}
          <button
            type="button"
            title="Heading 1"
            disabled={disabled}
            onClick={() => exec('formatBlock', '<h1>')}
            className="px-2.5 py-1 text-xs font-bold font-heading rounded-lg hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            H1
          </button>
          <button
            type="button"
            title="Heading 2"
            disabled={disabled}
            onClick={() => exec('formatBlock', '<h2>')}
            className="px-2.5 py-1 text-xs font-bold font-heading rounded-lg hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            H2
          </button>
          <button
            type="button"
            title="Paragraph"
            disabled={disabled}
            onClick={() => exec('formatBlock', '<p>')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Normal
          </button>

          <div className="h-4 w-px bg-border-default mx-1" />

          {/* Formatting */}
          <button
            type="button"
            title="Bold"
            disabled={disabled}
            onClick={() => exec('bold')}
            className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            B
          </button>
          <button
            type="button"
            title="Italic"
            disabled={disabled}
            onClick={() => exec('italic')}
            className="px-2.5 py-1 text-xs italic font-serif rounded-lg hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            I
          </button>

          <div className="h-4 w-px bg-border-default mx-1" />

          {/* Lists */}
          <button
            type="button"
            title="Bullet List"
            disabled={disabled}
            onClick={() => exec('insertUnorderedList')}
            className="px-2 py-1 text-xs rounded-lg hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            • List
          </button>
          <button
            type="button"
            title="Numbered List"
            disabled={disabled}
            onClick={() => exec('insertOrderedList')}
            className="px-2 py-1 text-xs rounded-lg hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            1. List
          </button>

          <div className="h-4 w-px bg-border-default mx-1" />

          {/* Link */}
          <button
            type="button"
            title="Insert Link"
            disabled={disabled}
            onClick={handleInsertLink}
            className="px-2.5 py-1 text-xs rounded-lg hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            🔗 Link
          </button>
        </div>

        {/* Personalization Variable Chips */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-border-default/60">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
            Variables:
          </span>
          <button
            type="button"
            title="Insert Customer First Name"
            disabled={disabled}
            onClick={() => handleInsertVariable('first_name')}
            className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-action-secondary-bg text-action-secondary-text hover:bg-action-secondary/20 transition-colors border border-border-brand/30"
          >
            &#123;&#123;first_name&#125;&#125;
          </button>
          <button
            type="button"
            title="Insert Customer Last Name"
            disabled={disabled}
            onClick={() => handleInsertVariable('last_name')}
            className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-action-secondary-bg text-action-secondary-text hover:bg-action-secondary/20 transition-colors border border-border-brand/30"
          >
            &#123;&#123;last_name&#125;&#125;
          </button>
        </div>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onBlur={handleInput}
        role="textbox"
        aria-multiline="true"
        aria-label="Email content"
        data-placeholder={placeholder}
        className="p-4 min-h-[260px] max-h-[500px] overflow-y-auto text-sm text-text-primary focus:outline-none prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:pointer-events-none"
      />
    </div>
  );
}
