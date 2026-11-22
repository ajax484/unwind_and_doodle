'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  DEFAULT_HOMEPAGE_CONFIG,
  HOMEPAGE_SECTION_LABELS,
  HomepageConfig,
  HomepageSectionKey,
} from '@/types/homepage-settings';

export default function AdminHomepageSettingsPage() {
  const [config, setConfig] = useState<HomepageConfig>(DEFAULT_HOMEPAGE_CONFIG);
  const [activeSection, setActiveSection] = useState<HomepageSectionKey>('hero');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings/homepage');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load homepage settings');
      }
      setConfig(json.data.config);
      setUpdatedAt(json.data.updatedAt);
      setIsDefault(Boolean(json.data.isDefault));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load homepage settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.sections.length) return;
    setConfig((prev) => {
      const next = [...prev.sections];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, sections: next };
    });
  };

  const toggleSection = (key: HomepageSectionKey) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)),
    }));
  };

  const updateCopy = <K extends HomepageSectionKey>(
    section: K,
    field: keyof HomepageConfig['copy'][K],
    value: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      copy: {
        ...prev.copy,
        [section]: {
          ...prev.copy[section],
          [field]: value,
        },
      },
    }));
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_HOMEPAGE_CONFIG);
    toast.info('Loaded defaults. Save to publish.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save homepage settings');
      }
      setConfig(json.data.config);
      setUpdatedAt(json.data.updatedAt);
      setIsDefault(false);
      toast.success('Homepage updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save homepage settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl pb-16">
        <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-96 bg-white rounded-3xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/admin/settings" className="hover:text-rose-600 transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Homepage</span>
          </div>
          <h1 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
            Homepage Layout &amp; Copy
          </h1>
          {updatedAt && !isDefault && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              Last saved {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            View Live ↗
          </Link>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Section Order & Visibility */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3 h-fit">
          <h2 className="font-heading font-bold text-sm text-slate-900">Sections &amp; Order</h2>

          <div className="space-y-2">
            {config.sections.map((section, idx) => {
              const meta = HOMEPAGE_SECTION_LABELS[section.key];
              const isSelected = activeSection === section.key;
              return (
                <div
                  key={section.key}
                  className={`flex items-center justify-between gap-2 p-3 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-rose-300 bg-rose-50/40'
                      : 'border-slate-200/80 bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                  >
                    <span className="text-base">{meta.icon}</span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {idx + 1}. {meta.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {section.enabled ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveSection(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${meta.label} up`}
                      className="w-7 h-7 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, 1)}
                      disabled={idx === config.sections.length - 1}
                      aria-label={`Move ${meta.label} down`}
                      className="w-7 h-7 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={section.enabled}
                      aria-label={`Toggle ${meta.label}`}
                      onClick={() => toggleSection(section.key)}
                      className={`ml-1 w-9 h-5 rounded-full transition-colors relative ${
                        section.enabled ? 'bg-rose-500' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`block w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform ${
                          section.enabled ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Section Copy Editor */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
              <span>{HOMEPAGE_SECTION_LABELS[activeSection].icon}</span>
              <span>{HOMEPAGE_SECTION_LABELS[activeSection].label}</span>
            </h2>
          </div>

          {activeSection === 'hero' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">Headline Line 1</span>
                  <input
                    type="text"
                    value={config.copy.hero.headlineLead}
                    onChange={(e) => updateCopy('hero', 'headlineLead', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">Accent Blue</span>
                  <input
                    type="text"
                    value={config.copy.hero.headlineBlue}
                    onChange={(e) => updateCopy('hero', 'headlineBlue', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">Accent Rose</span>
                  <input
                    type="text"
                    value={config.copy.hero.headlineRose}
                    onChange={(e) => updateCopy('hero', 'headlineRose', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Subtitle</span>
                <textarea
                  rows={3}
                  value={config.copy.hero.subtitle}
                  onChange={(e) => updateCopy('hero', 'subtitle', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">Primary CTA Label</span>
                  <input
                    type="text"
                    value={config.copy.hero.primaryCtaLabel}
                    onChange={(e) => updateCopy('hero', 'primaryCtaLabel', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">Primary CTA Link</span>
                  <input
                    type="text"
                    value={config.copy.hero.primaryCtaHref}
                    onChange={(e) => updateCopy('hero', 'primaryCtaHref', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">Secondary CTA Label</span>
                  <input
                    type="text"
                    value={config.copy.hero.secondaryCtaLabel}
                    onChange={(e) => updateCopy('hero', 'secondaryCtaLabel', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">Secondary CTA Link</span>
                  <input
                    type="text"
                    value={config.copy.hero.secondaryCtaHref}
                    onChange={(e) => updateCopy('hero', 'secondaryCtaHref', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Social Proof Label</span>
                <input
                  type="text"
                  value={config.copy.hero.socialProofLabel}
                  onChange={(e) => updateCopy('hero', 'socialProofLabel', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
            </div>
          )}

          {activeSection === 'categories' && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Badge</span>
                <input
                  type="text"
                  value={config.copy.categories.badge}
                  onChange={(e) => updateCopy('categories', 'badge', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Heading</span>
                <input
                  type="text"
                  value={config.copy.categories.title}
                  onChange={(e) => updateCopy('categories', 'title', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Subtitle</span>
                <textarea
                  rows={2}
                  value={config.copy.categories.subtitle}
                  onChange={(e) => updateCopy('categories', 'subtitle', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
            </div>
          )}

          {activeSection === 'featured_products' && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Eyebrow</span>
                <input
                  type="text"
                  value={config.copy.featured_products.eyebrow}
                  onChange={(e) => updateCopy('featured_products', 'eyebrow', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Heading</span>
                <input
                  type="text"
                  value={config.copy.featured_products.title}
                  onChange={(e) => updateCopy('featured_products', 'title', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">CTA Label</span>
                <input
                  type="text"
                  value={config.copy.featured_products.ctaLabel}
                  onChange={(e) => updateCopy('featured_products', 'ctaLabel', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
            </div>
          )}

          {activeSection === 'custom_keepsake' && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Badge</span>
                <input
                  type="text"
                  value={config.copy.custom_keepsake.badge}
                  onChange={(e) => updateCopy('custom_keepsake', 'badge', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">Headline Line 1</span>
                  <input
                    type="text"
                    value={config.copy.custom_keepsake.headlineLead}
                    onChange={(e) => updateCopy('custom_keepsake', 'headlineLead', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">Headline Accent</span>
                  <input
                    type="text"
                    value={config.copy.custom_keepsake.headlineAccent}
                    onChange={(e) => updateCopy('custom_keepsake', 'headlineAccent', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Description</span>
                <textarea
                  rows={3}
                  value={config.copy.custom_keepsake.description}
                  onChange={(e) => updateCopy('custom_keepsake', 'description', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">CTA Label</span>
                  <input
                    type="text"
                    value={config.copy.custom_keepsake.ctaLabel}
                    onChange={(e) => updateCopy('custom_keepsake', 'ctaLabel', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">CTA Link</span>
                  <input
                    type="text"
                    value={config.copy.custom_keepsake.ctaHref}
                    onChange={(e) => updateCopy('custom_keepsake', 'ctaHref', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
              </div>
            </div>
          )}

          {activeSection === 'brand_philosophy' && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Badge</span>
                <input
                  type="text"
                  value={config.copy.brand_philosophy.badge}
                  onChange={(e) => updateCopy('brand_philosophy', 'badge', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Heading</span>
                <input
                  type="text"
                  value={config.copy.brand_philosophy.title}
                  onChange={(e) => updateCopy('brand_philosophy', 'title', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Body</span>
                <textarea
                  rows={3}
                  value={config.copy.brand_philosophy.body}
                  onChange={(e) => updateCopy('brand_philosophy', 'body', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">CTA Label</span>
                  <input
                    type="text"
                    value={config.copy.brand_philosophy.ctaLabel}
                    onChange={(e) => updateCopy('brand_philosophy', 'ctaLabel', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">CTA Link</span>
                  <input
                    type="text"
                    value={config.copy.brand_philosophy.ctaHref}
                    onChange={(e) => updateCopy('brand_philosophy', 'ctaHref', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
              </div>
            </div>
          )}

          {activeSection === 'reviews' && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Eyebrow</span>
                <input
                  type="text"
                  value={config.copy.reviews.eyebrow}
                  onChange={(e) => updateCopy('reviews', 'eyebrow', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Heading</span>
                <input
                  type="text"
                  value={config.copy.reviews.title}
                  onChange={(e) => updateCopy('reviews', 'title', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
            </div>
          )}

          {activeSection === 'newsletter' && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Eyebrow</span>
                <input
                  type="text"
                  value={config.copy.newsletter.eyebrow}
                  onChange={(e) => updateCopy('newsletter', 'eyebrow', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Heading</span>
                <input
                  type="text"
                  value={config.copy.newsletter.title}
                  onChange={(e) => updateCopy('newsletter', 'title', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Description</span>
                <textarea
                  rows={2}
                  value={config.copy.newsletter.description}
                  onChange={(e) => updateCopy('newsletter', 'description', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">Button Label</span>
                <input
                  type="text"
                  value={config.copy.newsletter.buttonLabel}
                  onChange={(e) => updateCopy('newsletter', 'buttonLabel', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
