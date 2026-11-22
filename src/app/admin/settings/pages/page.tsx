'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  STOREFRONT_PAGE_META,
  STOREFRONT_PAGE_SLUGS,
  StorefrontContactInfo,
  StorefrontFaqItem,
  StorefrontPageHighlight,
  StorefrontPageRecord,
  StorefrontPageSection,
  StorefrontPageSlug,
} from '@/types/storefront-pages';

export default function AdminStorefrontPagesEditor() {
  const [pages, setPages] = useState<StorefrontPageRecord[]>([]);
  const [activeSlug, setActiveSlug] = useState<StorefrontPageSlug>('about');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable form state for active page
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [sections, setSections] = useState<StorefrontPageSection[]>([]);
  const [highlights, setHighlights] = useState<StorefrontPageHighlight[]>([]);
  const [faqItems, setFaqItems] = useState<StorefrontFaqItem[]>([]);
  const [contactInfo, setContactInfo] = useState<StorefrontContactInfo>({
    email: '',
    whatsapp: '',
    instagram: '',
    hours: '',
    location: '',
  });
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  const hydrateForm = useCallback((page: StorefrontPageRecord) => {
    setTitle(page.title || '');
    setSubtitle(page.subtitle || '');
    setSections(page.content?.sections || []);
    setHighlights(page.content?.highlights || []);
    setFaqItems(page.content?.faqItems || []);
    setContactInfo({
      email: page.content?.contactInfo?.email || '',
      whatsapp: page.content?.contactInfo?.whatsapp || '',
      instagram: page.content?.contactInfo?.instagram || '',
      hours: page.content?.contactInfo?.hours || '',
      location: page.content?.contactInfo?.location || '',
    });
    setSeoTitle(page.seoTitle || '');
    setSeoDescription(page.seoDescription || '');
  }, []);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings/pages');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load pages');
      }
      const list: StorefrontPageRecord[] = json.data || [];
      setPages(list);
      const current = list.find((p) => p.slug === activeSlug) || list[0];
      if (current) {
        hydrateForm(current);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load storefront pages');
    } finally {
      setLoading(false);
    }
  }, [activeSlug, hydrateForm]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleSelectSlug = (slug: StorefrontPageSlug) => {
    setActiveSlug(slug);
    const found = pages.find((p) => p.slug === slug);
    if (found) hydrateForm(found);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Page title is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        content: {
          sections: sections
            .map((s) => ({ heading: s.heading.trim(), body: s.body.trim() }))
            .filter((s) => s.heading && s.body),
          ...(activeSlug === 'delivery'
            ? {
                highlights: highlights
                  .map((h) => ({ label: h.label.trim(), value: h.value.trim() }))
                  .filter((h) => h.label && h.value),
              }
            : {}),
          ...(activeSlug === 'faq'
            ? {
                faqItems: faqItems
                  .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
                  .filter((f) => f.question && f.answer),
              }
            : {}),
          ...(activeSlug === 'contact' ? { contactInfo } : {}),
        },
      };

      const res = await fetch(`/api/admin/settings/pages/${activeSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save page');
      }

      const saved: StorefrontPageRecord = json.data;
      setPages((prev) => prev.map((p) => (p.slug === activeSlug ? saved : p)));
      hydrateForm(saved);
      toast.success(`${STOREFRONT_PAGE_META[activeSlug].label} saved and published`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = STOREFRONT_PAGE_META[activeSlug];

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
            <Link href="/admin/settings" className="hover:text-rose-600 transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="text-slate-800">Storefront Pages</span>
          </div>
          <h1 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
            Storefront Pages
          </h1>
        </div>

        <Link
          href={activeMeta.route}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors self-start sm:self-auto"
        >
          <span>View Live {activeMeta.route}</span>
          <span>↗</span>
        </Link>
      </div>

      {/* Page Tabs */}
      <div className="flex flex-wrap gap-2">
        {STOREFRONT_PAGE_SLUGS.map((slug) => {
          const meta = STOREFRONT_PAGE_META[slug];
          const isActive = slug === activeSlug;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => handleSelectSlug(slug)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Header Fields */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-heading font-bold text-base text-slate-900">Page Header</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input text-xs w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
              <textarea
                rows={2}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="form-input text-xs w-full"
              />
            </div>
          </div>

          {/* Delivery Highlights */}
          {activeSlug === 'delivery' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-base text-slate-900">Timeline Highlights</h2>
                <button
                  type="button"
                  onClick={() => setHighlights((prev) => [...prev, { label: '', value: '' }])}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  + Add Highlight
                </button>
              </div>
              <div className="space-y-3">
                {highlights.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Label (e.g. Lagos Delivery)"
                      value={item.label}
                      onChange={(e) =>
                        setHighlights((prev) =>
                          prev.map((h, i) => (i === idx ? { ...h, label: e.target.value } : h))
                        )
                      }
                      className="form-input text-xs sm:col-span-5"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 1–3 business days)"
                      value={item.value}
                      onChange={(e) =>
                        setHighlights((prev) =>
                          prev.map((h, i) => (i === idx ? { ...h, value: e.target.value } : h))
                        )
                      }
                      className="form-input text-xs sm:col-span-6"
                    />
                    <button
                      type="button"
                      onClick={() => setHighlights((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold sm:col-span-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Channels */}
          {activeSlug === 'contact' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h2 className="font-heading font-bold text-base text-slate-900">Support Channels</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo((prev) => ({ ...prev, email: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={contactInfo.whatsapp}
                    onChange={(e) => setContactInfo((prev) => ({ ...prev, whatsapp: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={contactInfo.instagram}
                    onChange={(e) => setContactInfo((prev) => ({ ...prev, instagram: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Support Hours</label>
                  <input
                    type="text"
                    value={contactInfo.hours}
                    onChange={(e) => setContactInfo((prev) => ({ ...prev, hours: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={contactInfo.location}
                    onChange={(e) => setContactInfo((prev) => ({ ...prev, location: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FAQ Items */}
          {activeSlug === 'faq' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-base text-slate-900">Questions &amp; Answers</h2>
                <button
                  type="button"
                  onClick={() => setFaqItems((prev) => [...prev, { question: '', answer: '' }])}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  + Add Question
                </button>
              </div>
              <div className="space-y-4">
                {faqItems.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-500">FAQ #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setFaqItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Question"
                      value={item.question}
                      onChange={(e) =>
                        setFaqItems((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, question: e.target.value } : f))
                        )
                      }
                      className="form-input text-xs w-full bg-white"
                    />
                    <textarea
                      rows={3}
                      placeholder="Answer"
                      value={item.answer}
                      onChange={(e) =>
                        setFaqItems((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, answer: e.target.value } : f))
                        )
                      }
                      className="form-input text-xs w-full bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Sections */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-base text-slate-900">Content Sections</h2>
              <button
                type="button"
                onClick={() => setSections((prev) => [...prev, { heading: '', body: '' }])}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                + Add Section
              </button>
            </div>
            {sections.length === 0 ? (
              <p className="text-xs text-slate-400">No extra sections added.</p>
            ) : (
              <div className="space-y-4">
                {sections.map((section, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-500">Section #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setSections((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Section heading"
                      value={section.heading}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, heading: e.target.value } : s))
                        )
                      }
                      className="form-input text-xs w-full bg-white"
                    />
                    <textarea
                      rows={4}
                      placeholder="Section body"
                      value={section.body}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, body: e.target.value } : s))
                        )
                      }
                      className="form-input text-xs w-full bg-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Bar */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Publish'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
