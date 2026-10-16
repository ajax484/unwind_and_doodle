'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ServiceEmailCategory,
  ServiceEmailTemplateSummary,
} from '@/types/service-email';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';
import TextInput from '@/components/TextInput';
import { Tabs } from '@/components/Tabs';

const CATEGORY_LABELS: Record<ServiceEmailCategory, string> = {
  order: 'Order Lifecycle',
  customer: 'Customer Communications',
  team: 'Team Notifications',
  admin: 'Inventory & Alerts',
};

const CATEGORY_ICONS: Record<ServiceEmailCategory, string> = {
  order: '📦',
  customer: '💬',
  team: '👥',
  admin: '🔔',
};

export default function ServiceEmailsListingPage() {
  const [templates, setTemplates] = useState<ServiceEmailTemplateSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'customized' | 'default'>('all');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings/service-emails');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load templates');
      }
      setTemplates(json.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error loading templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filter templates based on search, category tab, and status
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      // Category filter
      if (selectedCategory !== 'all' && tpl.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'customized' && !tpl.isCustomized) {
        return false;
      }
      if (statusFilter === 'default' && tpl.isCustomized) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = tpl.name.toLowerCase().includes(query);
        const matchesDesc = tpl.description.toLowerCase().includes(query);
        const matchesKey = tpl.key.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesKey;
      }

      return true;
    });
  }, [templates, selectedCategory, statusFilter, searchQuery]);

  // Group filtered templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Partial<Record<ServiceEmailCategory, ServiceEmailTemplateSummary[]>> = {};

    for (const tpl of filteredTemplates) {
      if (!groups[tpl.category]) {
        groups[tpl.category] = [];
      }
      groups[tpl.category]?.push(tpl);
    }

    return groups;
  }, [filteredTemplates]);

  const categories: ServiceEmailCategory[] = ['order', 'customer', 'team', 'admin'];

  // Counts for quick stats
  const totalCount = templates.length;
  const customizedCount = templates.filter((t) => t.isCustomized).length;
  const defaultCount = totalCount - customizedCount;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border-default">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-text-primary">
            Service Emails
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-text-secondary">
              {totalCount} registered transactional templates
            </span>
            <span className="text-text-tertiary">•</span>
            <span className="text-xs text-status-warning-accent font-semibold">
              {customizedCount} customized
            </span>
            <span className="text-text-tertiary">•</span>
            <span className="text-xs text-text-tertiary">
              {defaultCount} system default
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-bg-surface p-3 rounded-2xl border border-border-default shadow-2xs">
        {/* Search */}
        <div className="w-full md:w-80">
          <TextInput
            placeholder="Search templates by name, key, or usage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="overflow-x-auto">
          <Tabs
            tabs={[
              { id: 'all', label: 'All Categories' },
              { id: 'order', label: '📦 Orders' },
              { id: 'customer', label: '💬 Customers' },
              { id: 'team', label: '👥 Team' },
              { id: 'admin', label: '🔔 Alerts' },
            ]}
            activeTab={selectedCategory}
            onChange={setSelectedCategory}
            style="segmented"
            size="sm"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          <span className="text-text-tertiary font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-bg-subtle border border-border-default rounded-lg px-2.5 py-1.5 font-medium text-text-primary focus:outline-hidden focus:border-brand-rose"
          >
            <option value="all">All Statuses</option>
            <option value="customized">Customized Only</option>
            <option value="default">System Default Only</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner size="lg" />
          <span className="text-xs text-text-tertiary">Loading templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        /* Empty State */
        <div className="bg-bg-surface border border-border-default rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-bg-subtle flex items-center justify-center mx-auto text-xl">
            🔍
          </div>
          <h3 className="text-sm font-bold text-text-primary">No templates found</h3>
          <p className="text-xs text-text-secondary">
            No service emails matched your search or category filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        /* Grouped Templates Grid */
        <div className="space-y-8">
          {categories.map((catKey) => {
            const list = groupedTemplates[catKey];
            if (!list || list.length === 0) return null;

            return (
              <section key={catKey} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center gap-2 pb-1 border-b border-border-default">
                  <span className="text-base">{CATEGORY_ICONS[catKey]}</span>
                  <h2 className="text-sm font-bold font-heading text-text-primary">
                    {CATEGORY_LABELS[catKey]}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-bg-subtle text-text-tertiary font-semibold ml-auto">
                    {list.length}
                  </span>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((tpl) => (
                    <div
                      key={tpl.key}
                      className="bg-bg-surface border border-border-default rounded-2xl p-4 flex flex-col justify-between hover:border-brand-rose/60 hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="space-y-3">
                        {/* Badges & Status */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge
                            variant="status"
                            statusType={tpl.isCustomized ? 'warning' : 'neutral'}
                            size="sm"
                          >
                            {tpl.isCustomized ? 'Customized' : 'System Default'}
                          </Badge>

                          <Badge
                            variant="status"
                            statusType={tpl.isActive ? 'success' : 'neutral'}
                            size="sm"
                          >
                            {tpl.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        {/* Title and Key */}
                        <div>
                          <h3 className="text-sm font-bold font-heading text-text-primary group-hover:text-brand-rose transition-colors">
                            {tpl.name}
                          </h3>
                          <span className="font-mono text-[10px] text-text-tertiary">
                            {tpl.key}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                          {tpl.description}
                        </p>
                      </div>

                      {/* Card Footer & Action */}
                      <div className="pt-4 mt-4 border-t border-border-default flex items-center justify-between gap-2">
                        <span className="text-[11px] text-text-tertiary">
                          {tpl.updatedAt
                            ? `Updated ${new Date(tpl.updatedAt).toLocaleDateString()}`
                            : 'Default'}
                        </span>

                        <Link href={`/admin/settings/service-emails/${tpl.key}`}>
                          <Button variant="primary" size="sm" className="text-xs font-semibold">
                            Edit Template
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
