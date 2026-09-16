'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { Badge, BadgeStatusType } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { TextInput } from '@/components/TextInput';
import { Select } from '@/components/Select';
import Button from '@/components/Button';
import {
  AdminAuditLogItem,
  AdminAuditLogDetail,
  AdminAuditLogListResponse,
} from '@/types/admin-audit-log';

export default function AdminAuditLogsPage() {
  // Data state
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter options state
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableEntityTypes, setAvailableEntityTypes] = useState<string[]>([]);

  // Filter inputs
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [actorTypeFilter, setActorTypeFilter] = useState<'all' | 'admin' | 'system'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Detail Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLogDetail, setSelectedLogDetail] = useState<AdminAuditLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch list of audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter);
      if (entityTypeFilter && entityTypeFilter !== 'all') params.set('entityType', entityTypeFilter);
      if (actorTypeFilter && actorTypeFilter !== 'all') params.set('actorType', actorTypeFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('sortBy', sortBy);
      params.set('page', String(currentPage));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch audit logs');
      }

      const responseData: AdminAuditLogListResponse = json.data;
      setLogs(responseData.items || []);
      setTotalCount(responseData.pagination.total);
      setTotalPages(responseData.pagination.totalPages);

      // Populate filter dropdown choices if available
      if (responseData.filterOptions) {
        setAvailableActions((prev) => {
          const combined = Array.from(new Set([...prev, ...(responseData.filterOptions.actions || [])])).sort();
          return combined;
        });
        setAvailableEntityTypes((prev) => {
          const combined = Array.from(new Set([...prev, ...(responseData.filterOptions.entityTypes || [])])).sort();
          return combined;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching audit logs';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, actionFilter, entityTypeFilter, actorTypeFilter, startDate, endDate, sortBy, currentPage]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Open detail view
  const handleViewDetail = async (logId: string) => {
    setSelectedLogId(logId);
    setDetailModalOpen(true);
    setDetailLoading(true);

    try {
      const res = await fetch(`/api/admin/audit-logs/${logId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load audit log details');
      }

      setSelectedLogDetail(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load audit log details';
      toast.error(msg);
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setActionFilter('all');
    setEntityTypeFilter('all');
    setActorTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return isoString;
    }
  };

  // Define DataTable columns
  const columns: DataTableColumn<AdminAuditLogItem>[] = [
    {
      id: 'createdAt',
      header: 'Timestamp',
      width: '180px',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-text-secondary whitespace-nowrap">
          {formatTimestamp(row.createdAt)}
        </span>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      width: '190px',
      cell: ({ row }) => {
        if (row.actor.type === 'system') {
          return (
            <div className="flex items-center gap-1.5">
              <Badge variant="tag" statusType="neutral" size="sm">
                🤖 System
              </Badge>
            </div>
          );
        }

        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Badge variant="brand" size="sm">
                👤 Admin
              </Badge>
              <span className="text-xs font-medium text-text-primary truncate max-w-[120px]" title={row.actor.displayName}>
                {row.actor.displayName}
              </span>
            </div>
            {row.actor.email && (
              <span className="text-[11px] text-text-tertiary truncate max-w-[170px]" title={row.actor.email}>
                {row.actor.email}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'action',
      header: 'Action / Event',
      width: '180px',
      cell: ({ row }) => {
        let badgeType: BadgeStatusType = 'neutral';
        if (row.action.includes('create') || row.action.includes('published') || row.action.includes('completed')) {
          badgeType = 'success';
        } else if (row.action.includes('update') || row.action.includes('transition') || row.action.includes('adjusted')) {
          badgeType = 'info';
        } else if (row.action.includes('delete') || row.action.includes('cancel') || row.action.includes('rejected')) {
          badgeType = 'danger';
        }

        return (
          <Badge variant="status" statusType={badgeType} size="sm" dot>
            {row.action}
          </Badge>
        );
      },
    },
    {
      id: 'entity',
      header: 'Entity',
      width: '170px',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-text-primary capitalize">
            {row.entityType}
          </span>
          <span className="text-[11px] font-mono text-text-tertiary truncate max-w-[150px]" title={row.entityId}>
            {row.entityId}
          </span>
        </div>
      ),
    },
    {
      id: 'summary',
      header: 'Summary / Details',
      cell: ({ row }) => (
        <div className="text-xs text-text-secondary max-w-md line-clamp-2" title={row.summary}>
          {row.summary}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      width: '110px',
      align: 'right',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewDetail(row.id)}
          className="text-xs h-7 px-2.5"
        >
          View Details
        </Button>
      ),
    },
  ];

  const hasActiveFilters =
    Boolean(search) ||
    actionFilter !== 'all' ||
    entityTypeFilter !== 'all' ||
    actorTypeFilter !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    sortBy !== 'newest';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Breadcrumbs */}
      <div className="space-y-2">
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Settings', href: '/admin/settings' },
            { label: 'Audit Logs', isCurrent: true },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary tracking-tight">
              System Audit Logs
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Immutable audit trail of administrative operations, catalog mutations, and automated system events.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAuditLogs()}
              disabled={loading}
              className="gap-1.5"
            >
              <span>🔄</span> Refresh
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-text-tertiary hover:text-text-primary"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-bg-surface border border-border-default rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Text Search */}
          <div className="lg:col-span-2">
            <TextInput
              placeholder="Search by entity ID, action, or payload..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon={<span>🔍</span>}
              size="sm"
            />
          </div>

          {/* Action Filter */}
          <div>
            <Select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
            >
              <option value="all">All Actions</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </Select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <Select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
            >
              <option value="all">All Entity Types</option>
              {availableEntityTypes.map((ent) => (
                <option key={ent} value={ent}>
                  {ent.charAt(0).toUpperCase() + ent.slice(1)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1 border-t border-border-default/60">
          {/* Actor Type Filter */}
          <div>
            <Select
              value={actorTypeFilter}
              onChange={(e) => {
                setActorTypeFilter(e.target.value as 'all' | 'admin' | 'system');
                setCurrentPage(1);
              }}
              size="sm"
            >
              <option value="all">All Actors (Admin & System)</option>
              <option value="admin">Administrator Actions Only</option>
              <option value="system">System Automated Events Only</option>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as 'newest' | 'oldest');
                setCurrentPage(1);
              }}
              size="sm"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </Select>
          </div>

          {/* Date Range Start */}
          <div className="flex flex-col">
            <input
              type="date"
              aria-label="Start Date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 text-xs rounded-xl border border-border-input bg-bg-surface text-text-primary shadow-xs focus:ring-2 focus:ring-border-brand focus:outline-hidden"
            />
          </div>

          {/* Date Range End */}
          <div className="flex flex-col">
            <input
              type="date"
              aria-label="End Date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 text-xs rounded-xl border border-border-input bg-bg-surface text-text-primary shadow-xs focus:ring-2 focus:ring-border-brand focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-status-danger-bg text-status-danger-text border border-status-danger-accent/30 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => fetchAuditLogs()}>
            Try Again
          </Button>
        </div>
      )}

      {/* 4. Main Data Table */}
      <DataTable
        columns={columns}
        data={logs}
        state={loading ? 'loading' : logs.length === 0 ? 'empty' : 'default'}
        showPagination={totalCount > 0}
        emptyTitle="No Audit Logs Found"
        emptyDescription={
          hasActiveFilters
            ? 'No audit log entries matched your current search and filter criteria. Try clearing some filters.'
            : 'No audit records have been recorded yet.'
        }
        paginationProps={{
          currentPage,
          totalPages,
          totalCount,
          pageSize,
          itemLabel: 'audit logs',
          onPageChange: (newPage) => setCurrentPage(newPage),
        }}
      />

      {/* 5. Detail Inspection Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedLogDetail(null);
        }}
        title="Audit Record Details"
        description="Comprehensive payload inspection and historical diff state."
        size="lg"
      >
        {detailLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-secondary">Loading audit details...</p>
          </div>
        ) : selectedLogDetail ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* Metadata Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-bg-subtle rounded-xl border border-border-default text-xs">
              <div>
                <span className="text-text-tertiary block font-medium">Record ID</span>
                <span className="font-mono text-text-primary select-all text-[11px]">
                  {selectedLogDetail.id}
                </span>
              </div>
              <div>
                <span className="text-text-tertiary block font-medium">Timestamp</span>
                <span className="text-text-primary">
                  {formatTimestamp(selectedLogDetail.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-text-tertiary block font-medium">Action</span>
                <span className="font-semibold text-text-primary">
                  {selectedLogDetail.action}
                </span>
              </div>
              <div>
                <span className="text-text-tertiary block font-medium">Actor</span>
                <span className="text-text-primary">
                  {selectedLogDetail.actor.type === 'system'
                    ? '🤖 System Automated'
                    : `👤 ${selectedLogDetail.actor.displayName} ${selectedLogDetail.actor.email ? `(${selectedLogDetail.actor.email})` : ''}`}
                </span>
              </div>
              <div>
                <span className="text-text-tertiary block font-medium">Entity Type</span>
                <span className="text-text-primary capitalize">
                  {selectedLogDetail.entityType}
                </span>
              </div>
              <div>
                <span className="text-text-tertiary block font-medium">Entity ID</span>
                <span className="font-mono text-text-primary select-all text-[11px]">
                  {selectedLogDetail.entityId}
                </span>
              </div>
            </div>

            {/* Before and After State Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before State */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Before State (Previous)
                  </h4>
                  <Badge variant="tag" size="sm">
                    {selectedLogDetail.hasBeforeData ? 'Captured' : 'None / Null'}
                  </Badge>
                </div>
                <div className="p-3 bg-bg-surface border border-border-default rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 shadow-inner text-text-primary">
                  {selectedLogDetail.beforeData ? (
                    <pre>{JSON.stringify(selectedLogDetail.beforeData, null, 2)}</pre>
                  ) : (
                    <span className="text-text-tertiary italic">No previous state recorded</span>
                  )}
                </div>
              </div>

              {/* After State */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    After State (Resulting)
                  </h4>
                  <Badge variant="tag" size="sm">
                    {selectedLogDetail.hasAfterData ? 'Captured' : 'None / Null'}
                  </Badge>
                </div>
                <div className="p-3 bg-bg-surface border border-border-default rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 shadow-inner text-text-primary">
                  {selectedLogDetail.afterData ? (
                    <pre>{JSON.stringify(selectedLogDetail.afterData, null, 2)}</pre>
                  ) : (
                    <span className="text-text-tertiary italic">No resulting state recorded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-text-tertiary text-sm">
            Could not load audit record details.
          </div>
        )}
      </Modal>
    </div>
  );
}
