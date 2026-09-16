'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { normalizeRichTextForEditor, isRichTextEmpty } from '@/lib/rich-text';

interface RichTextEditorProps {
  value?: string | null;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  minHeight = '140px',
}) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

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
            class: 'border-t border-slate-200 my-4',
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

  // Synchronize incoming value changes (e.g. after async fetch)
  useEffect(() => {
    if (!editor) return;

    const normalizedValue = normalizeRichTextForEditor(value);
    const currentHtml = editor.getHTML();

    if (normalizedValue !== currentHtml && (value !== undefined)) {
      if (isRichTextEmpty(normalizedValue) && isRichTextEmpty(currentHtml)) {
        return;
      }
      editor.commands.setContent(normalizedValue, false);
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

  if (!editor) {
    return (
      <div className={`w-full rounded-xl border border-slate-200 bg-white p-4 animate-pulse min-h-[${minHeight}] ${className}`}>
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
        <div className="h-4 bg-slate-100 rounded w-2/3" />
      </div>
    );
  }

  const toolbarBtnClass = (isActive: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 min-w-[28px] h-8 select-none ${
      isActive
        ? 'bg-slate-200/90 text-slate-900 font-semibold shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    } disabled:opacity-40 disabled:cursor-not-allowed`;

  return (
    <div
      className={`rich-text-editor-container w-full rounded-xl border border-slate-200 bg-white focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all shadow-2xs overflow-hidden ${
        disabled ? 'opacity-60 pointer-events-none bg-slate-50' : ''
      } ${className}`}
    >
      {/* Responsive Wrapping Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-slate-200/80 bg-slate-50/90 select-none">
        {/* Text Styles */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={toolbarBtnClass(editor.isActive('bold'))}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <span className="font-bold text-sm">B</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={toolbarBtnClass(editor.isActive('italic'))}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <span className="italic text-sm font-serif">I</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={toolbarBtnClass(editor.isActive('strike'))}
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <span className="line-through text-xs font-semibold">S</span>
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={toolbarBtnClass(editor.isActive('paragraph'))}
            title="Normal text"
            aria-label="Normal text"
          >
            <span>Normal</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={toolbarBtnClass(editor.isActive('heading', { level: 2 }))}
            title="Heading 2"
            aria-label="Heading 2"
          >
            <span className="font-bold">H2</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={toolbarBtnClass(editor.isActive('heading', { level: 3 }))}
            title="Heading 3"
            aria-label="Heading 3"
          >
            <span className="font-bold">H3</span>
          </button>
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={toolbarBtnClass(editor.isActive('bulletList'))}
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
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={toolbarBtnClass(editor.isActive('orderedList'))}
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
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={toolbarBtnClass(editor.isActive('blockquote'))}
            title="Blockquote"
            aria-label="Blockquote"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </button>
        </div>

        {/* Formatting, Rule & Link */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-0.5">
          <button
            type="button"
            onClick={openLinkDialog}
            className={toolbarBtnClass(editor.isActive('link'))}
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
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className={toolbarBtnClass(false)}
            title="Horizontal Divider"
            aria-label="Horizontal Divider"
          >
            <span className="font-bold text-xs tracking-tighter">―</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            className={toolbarBtnClass(false)}
            title="Clear Formatting"
            aria-label="Clear Formatting"
          >
            <span className="text-[11px] font-medium text-slate-500">Tx</span>
          </button>
        </div>

        {/* History Undo / Redo */}
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
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
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
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
        <div className="flex items-center gap-2 p-2 bg-slate-100/90 border-b border-slate-200 text-xs">
          <label htmlFor="tiptap-link-url" className="font-semibold text-slate-700 whitespace-nowrap">
            Link URL:
          </label>
          <input
            id="tiptap-link-url"
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
            className="flex-1 px-2 py-1 rounded border border-slate-300 text-xs bg-white text-slate-800 focus:outline-hidden focus:border-brand-blue"
            autoFocus
          />
          <button
            type="button"
            onClick={applyLink}
            className="px-2.5 py-1 rounded bg-brand-blue-deep text-white font-medium hover:bg-brand-blue-dark transition-colors"
          >
            Save
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                setShowLinkModal(false);
              }}
              className="px-2 py-1 rounded text-red-600 hover:bg-red-50 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLinkModal(false)}
            className="px-2 py-1 rounded text-slate-500 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div style={{ minHeight }} className="p-3 text-xs sm:text-sm text-slate-800 focus:outline-hidden cursor-text">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
