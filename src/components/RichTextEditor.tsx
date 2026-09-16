'use client';

import React, { useEffect, useCallback, useState, useId } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { normalizeRichTextForEditor, isRichTextEmpty } from '@/lib/rich-text';

export const richTextEditorVariants = cva(
  [
    'rich-text-editor-container relative flex flex-col w-full transition-all duration-150',
    'bg-bg-surface rounded-xl border border-border-input shadow-xs overflow-hidden',
    'focus-within:ring-2 focus-within:ring-border-brand focus-within:border-border-brand',
    'hover:border-border-brand/70',
  ],
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
      hasError: {
        true: 'border-status-danger-accent focus-within:ring-status-danger-accent focus-within:border-status-danger-accent hover:border-status-danger-accent',
        false: '',
      },
      disabled: {
        true: 'opacity-60 pointer-events-none bg-neutral-border-soft/40 cursor-not-allowed',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      hasError: false,
      disabled: false,
    },
  }
);

export interface RichTextEditorProps extends VariantProps<typeof richTextEditorVariants> {
  /**
   * HTML value of the rich text editor.
   */
  value?: string | null;

  /**
   * Callback fired whenever the editor contents change.
   */
  onChange: (html: string) => void;

  /**
   * Accessible label rendered above the rich text editor.
   */
  label?: React.ReactNode;

  /**
   * Optional helper text rendered below the editor.
   */
  helperText?: React.ReactNode;

  /**
   * Error message displayed below the editor with role="alert".
   */
  errorMessage?: React.ReactNode;

  /**
   * Marks the editor field as required, displaying an asterisk.
   */
  required?: boolean;

  /**
   * Placeholder string shown when editor is empty.
   */
  placeholder?: string;

  /**
   * Custom min-height for the editable area (e.g. '160px').
   */
  minHeight?: string;

  /**
   * Additional container CSS classes.
   */
  className?: string;

  /**
   * Custom element ID for accessibility pairing.
   */
  id?: string;

  /**
   * Test identifier for end-to-end and Storybook testing.
   */
  'data-testid'?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label,
  helperText,
  errorMessage,
  required = false,
  placeholder,
  size = 'md',
  hasError: customHasError,
  disabled = false,
  minHeight,
  className = '',
  id: customId,
  'data-testid': testId = 'rich-text-editor',
}) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  const hasError = Boolean(customHasError || errorMessage);
  const isEditorDisabled = Boolean(disabled);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Sizing-scale minimum heights
  const resolvedMinHeight = minHeight || (size === 'sm' ? '110px' : size === 'lg' ? '180px' : '140px');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-5 my-2 space-y-1',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-5 my-2 space-y-1',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-slate-300 pl-4 py-1 italic my-2 text-slate-600',
          },
        },
        horizontalRule: {
          HTMLAttributes: {
            class: 'border-t border-border-input my-4',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand-blue-deep underline font-medium hover:text-brand-blue-hover',
        },
      }),
    ],
    content: normalizeRichTextForEditor(value),
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      if (isRichTextEmpty(html)) {
        onChange('');
      } else {
        onChange(html);
      }
    },
  });

  // Synchronize incoming value changes
  useEffect(() => {
    if (!editor) return;

    const normalizedValue = normalizeRichTextForEditor(value);
    const currentHtml = editor.getHTML();

    if (normalizedValue !== currentHtml && value !== undefined) {
      if (isRichTextEmpty(normalizedValue) && isRichTextEmpty(currentHtml)) {
        return;
      }
      editor.commands.setContent(normalizedValue, { emitUpdate: false });
    }
  }, [value, editor]);

  // Synchronize disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkModal(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;

    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setShowLinkModal(false);
      return;
    }

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl) && !/^mailto:/i.test(formattedUrl) && !/^tel:/i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: formattedUrl }).run();
    setShowLinkModal(false);
  }, [editor, linkUrl]);

  const toolbarBtnClass = (isActive: boolean) =>
    cn(
      'rounded-md font-medium transition-colors flex items-center justify-center select-none disabled:opacity-40 disabled:cursor-not-allowed',
      size === 'sm' ? 'px-2 py-1 text-[11px] min-w-[24px] h-7' : 'px-2.5 py-1.5 text-xs min-w-[28px] h-8',
      isActive
        ? 'bg-neutral-border-input text-text-primary font-bold shadow-2xs'
        : 'text-text-secondary hover:text-text-primary hover:bg-neutral-border-soft'
    );

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)} data-testid={testId}>
      {/* Accessible Label Header */}
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-xs font-bold text-text-primary flex items-center gap-1">
            <span>{label}</span>
            {required && <span className="text-status-danger-accent" aria-hidden="true">*</span>}
          </label>
        </div>
      )}

      {/* Editor Frame */}
      <div
        id={id}
        role="region"
        aria-label={typeof label === 'string' ? label : 'Rich text editor'}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={
          errorMessage ? errorId : helperText ? helperId : undefined
        }
        className={cn(richTextEditorVariants({ size, hasError, disabled }))}
      >
        {/* Responsive Wrapping Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-border-input/80 bg-neutral-cream/60 select-none">
          {/* Text Styles */}
          <div className="flex items-center gap-0.5 border-r border-border-input pr-1.5 mr-0.5">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={isEditorDisabled || !editor?.can().chain().focus().toggleBold().run()}
              className={toolbarBtnClass(editor?.isActive('bold') ?? false)}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
            >
              <span className="font-bold text-sm">B</span>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={isEditorDisabled || !editor?.can().chain().focus().toggleItalic().run()}
              className={toolbarBtnClass(editor?.isActive('italic') ?? false)}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
            >
              <span className="italic text-sm font-serif">I</span>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              disabled={isEditorDisabled || !editor?.can().chain().focus().toggleStrike().run()}
              className={toolbarBtnClass(editor?.isActive('strike') ?? false)}
              title="Strikethrough"
              aria-label="Strikethrough"
            >
              <span className="line-through text-xs font-semibold">S</span>
            </button>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-0.5 border-r border-border-input pr-1.5 mr-0.5">
            <button
              type="button"
              onClick={() => editor?.chain().focus().setParagraph().run()}
              disabled={isEditorDisabled}
              className={toolbarBtnClass(editor?.isActive('paragraph') ?? false)}
              title="Normal paragraph"
              aria-label="Normal text"
            >
              <span>Normal</span>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              disabled={isEditorDisabled}
              className={toolbarBtnClass(editor?.isActive('heading', { level: 2 }) ?? false)}
              title="Heading 2"
              aria-label="Heading 2"
            >
              <span className="font-bold">H2</span>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              disabled={isEditorDisabled}
              className={toolbarBtnClass(editor?.isActive('heading', { level: 3 }) ?? false)}
              title="Heading 3"
              aria-label="Heading 3"
            >
              <span className="font-bold">H3</span>
            </button>
          </div>

          {/* Lists & Quotes */}
          <div className="flex items-center gap-0.5 border-r border-border-input pr-1.5 mr-0.5">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={isEditorDisabled}
              className={toolbarBtnClass(editor?.isActive('bulletList') ?? false)}
              title="Bullet List"
              aria-label="Bullet List"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="9" y1="6" x2="20" y2="6" />
                <line x1="9" y1="12" x2="20" y2="12" />
                <line x1="9" y1="18" x2="20" y2="18" />
                <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                <circle cx="4" cy="18" r="1.5" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              disabled={isEditorDisabled}
              className={toolbarBtnClass(editor?.isActive('orderedList') ?? false)}
              title="Numbered List"
              aria-label="Numbered List"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="10" y1="6" x2="20" y2="6" />
                <line x1="10" y1="12" x2="20" y2="12" />
                <line x1="10" y1="18" x2="20" y2="18" />
                <text x="2" y="7" fontSize="8" fill="currentColor" fontFamily="sans-serif">1</text>
                <text x="2" y="13" fontSize="8" fill="currentColor" fontFamily="sans-serif">2</text>
                <text x="2" y="19" fontSize="8" fill="currentColor" fontFamily="sans-serif">3</text>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              disabled={isEditorDisabled}
              className={toolbarBtnClass(editor?.isActive('blockquote') ?? false)}
              title="Blockquote"
              aria-label="Blockquote"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </button>
          </div>

          {/* Formatting, Rule & Link */}
          <div className="flex items-center gap-0.5 border-r border-border-input pr-1.5 mr-0.5">
            <button
              type="button"
              onClick={openLinkDialog}
              disabled={isEditorDisabled}
              className={toolbarBtnClass(editor?.isActive('link') ?? false)}
              title="Insert / Edit Link"
              aria-label="Insert or Edit Link"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              disabled={isEditorDisabled}
              className={toolbarBtnClass(false)}
              title="Horizontal Divider"
              aria-label="Horizontal Divider"
            >
              <span className="font-bold text-xs tracking-tighter">―</span>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
              disabled={isEditorDisabled}
              className={toolbarBtnClass(false)}
              title="Clear Formatting"
              aria-label="Clear Formatting"
            >
              <span className="text-[11px] font-medium text-text-tertiary">Tx</span>
            </button>
          </div>

          {/* History Undo / Redo */}
          <div className="flex items-center gap-0.5 ml-auto">
            <button
              type="button"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={isEditorDisabled || !editor?.can().chain().focus().undo().run()}
              className={toolbarBtnClass(false)}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={isEditorDisabled || !editor?.can().chain().focus().redo().run()}
              className={toolbarBtnClass(false)}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
              </svg>
            </button>
          </div>
        </div>

        {/* Inline Link Modal */}
        {showLinkModal && (
          <div className="flex items-center gap-2 p-2 bg-neutral-border-soft/70 border-b border-border-input text-xs">
            <label htmlFor={`${id}-link-input`} className="font-semibold text-text-primary whitespace-nowrap">
              Link URL:
            </label>
            <input
              id={`${id}-link-input`}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyLink();
                } else if (e.key === 'Escape') {
                  setShowLinkModal(false);
                }
              }}
              className="flex-1 px-2 py-1 rounded border border-border-input text-xs bg-bg-surface text-text-primary focus:outline-hidden focus:border-border-brand"
              autoFocus
            />
            <button
              type="button"
              onClick={applyLink}
              className="px-2.5 py-1 rounded bg-brand-blue-deep text-white font-medium hover:bg-brand-blue-hover transition-colors shadow-2xs"
            >
              Save
            </button>
            {editor?.isActive('link') && (
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  setShowLinkModal(false);
                }}
                className="px-2 py-1 rounded text-status-danger-accent hover:bg-status-danger-accent/10 transition-colors"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowLinkModal(false)}
              className="px-2 py-1 rounded text-text-tertiary hover:bg-neutral-border-soft transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Editable Area */}
        <div
          style={{ minHeight: resolvedMinHeight }}
          className="p-3 text-text-primary focus:outline-hidden cursor-text"
        >
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="animate-pulse space-y-2 py-1">
              <div className="h-4 bg-neutral-border-soft rounded w-1/3" />
              <div className="h-4 bg-neutral-border-soft rounded w-2/3" />
            </div>
          )}
        </div>
      </div>

      {/* Accessible Footer Message (Error or Helper) */}
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-xs text-status-danger-accent font-medium">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-text-tertiary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

export default RichTextEditor;
