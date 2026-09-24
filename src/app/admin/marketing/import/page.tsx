'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ImportPreviewReport,
  ConfirmedProductMappingItem,
  ExecuteImportResult,
  ImportBatchListItem,
  ProductMappingStatus,
} from '@/types/historical-import';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';

interface CatalogProduct {
  id: string;
  name: string;
  status: string;
}

export default function HistoricalImportPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');

  // Upload & parse states
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [validating, setValidating] = useState(false);
  const [previewReport, setPreviewReport] = useState<ImportPreviewReport | null>(null);

  // Product mapping overrides: normTitle -> ConfirmedProductMappingItem
  const [mappings, setMappings] = useState<Record<string, ConfirmedProductMappingItem>>({});
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);

  // Execution states
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ExecuteImportResult | null>(null);

  // Batches history
  const [batches, setBatches] = useState<ImportBatchListItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load catalog products for mapping dropdown
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/admin/products?limit=200');
        const json = await res.json();
        if (json.success && json.data) {
          const list: any[] = Array.isArray(json.data?.products)
            ? json.data.products
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (list.length > 0) {
            setCatalogProducts(
              list.map((p: any) => ({
                id: p.id,
                name: p.name,
                status: p.status,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Could not fetch catalog products for mapping', err);
      }
    }
    fetchProducts();
  }, []);

  // Load past batches when history tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      fetchBatches();
    }
  }, [activeTab]);

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      const res = await fetch('/api/admin/marketing/import/batches');
      const json = await res.json();
      if (json.success) {
        setBatches(json.data || []);
      }
    } catch (err) {
      toast.error('Failed to load past import batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      toast.error('Please upload a valid .csv file');
      return;
    }

    setFile(selected);
    setPreviewReport(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text || '');
    };
    reader.readAsText(selected);
  };

  // Validate and generate preview report
  const handleValidate = async () => {
    if (!csvContent) {
      toast.error('Please select a CSV file first');
      return;
    }

    try {
      setValidating(true);
      const res = await fetch('/api/admin/marketing/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file?.name || 'bumpa-import.csv',
          csvContent,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to validate CSV');
      }

      const report = json.data as ImportPreviewReport;
      setPreviewReport(report);

      if (report.catalogProducts && report.catalogProducts.length > 0) {
        setCatalogProducts(report.catalogProducts);
      }

      // Initialize default mappings from suggested report
      const initialMap: Record<string, ConfirmedProductMappingItem> = {};
      for (const p of report.products.items) {
        initialMap[p.normalizedTitle] = {
          targetProductId: p.suggestedProductId,
          status: p.status,
        };
      }
      setMappings(initialMap);

      if (report.errors.length > 0) {
        toast.error('CSV validation found critical errors');
      } else {
        toast.success(`Validated ${report.orders.total} orders and ${report.customers.total} customers`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error validating CSV');
    } finally {
      setValidating(false);
    }
  };

  // Update mapping for an individual product
  const updateProductMapping = (normTitle: string, targetId: string | null, status: ProductMappingStatus) => {
    setMappings((prev) => ({
      ...prev,
      [normTitle]: {
        targetProductId: targetId,
        status,
      },
    }));
  };

  // Execute import
  const handleExecuteImport = async () => {
    if (!csvContent || !previewReport) return;

    try {
      setImporting(true);
      const res = await fetch('/api/admin/marketing/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file?.name || 'bumpa-import.csv',
          csvContent,
          confirmedProductMappings: mappings,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Import execution failed');
      }

      setImportResult(json.data as ExecuteImportResult);
      toast.success('Historical migration completed successfully!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error executing import');
    } finally {
      setImporting(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setCsvContent('');
    setPreviewReport(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary flex items-center gap-2">
            <span>📥</span> Historical Commerce Import
          </h1>
          <p className="mt-1 text-sm text-text-secondary max-w-3xl">
            Import historical Bumpa customers and orders safely into Unwind &amp; Doodle. Unlocks customer recognition,
            product-aware audiences, and dynamic recommendations without triggering live marketing campaigns.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-bg-subtle p-1 rounded-lg border border-border-default shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'import'
                ? 'bg-bg-surface text-text-primary shadow-xs border border-border-default'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Import Wizard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'history'
                ? 'bg-bg-surface text-text-primary shadow-xs border border-border-default'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Import History
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 bg-status-info-bg border border-status-info-accent/30 rounded-xl flex items-start gap-3">
        <span className="text-xl shrink-0">🛡️</span>
        <div className="text-xs text-status-info-text space-y-1">
          <p className="font-semibold text-sm">Marketing Automation Isolation Invariant</p>
          <p>
            Historical imports are written directly with their original historical timestamps. Domain events (
            <code>order.created</code>, <code>order.paid</code>, <code>order.received</code>) and automation workers are
            strictly bypassed. Existing customer records and consent choices are unconditionally preserved.
          </p>
        </div>
      </div>

      {activeTab === 'history' ? (
        /* History View */
        <div className="bg-bg-surface border border-border-default rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary font-heading">Past Import Batches</h2>
            <Button variant="outline" size="sm" onClick={fetchBatches} disabled={loadingBatches}>
              {loadingBatches ? <Spinner size="sm" /> : 'Refresh'}
            </Button>
          </div>

          {loadingBatches ? (
            <div className="py-12 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-text-tertiary text-sm">
              No historical import batches found for this organization.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-text-secondary">
                <thead className="bg-bg-subtle text-text-primary border-b border-border-default">
                  <tr>
                    <th className="py-3 px-4 font-semibold">File Name</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Customers</th>
                    <th className="py-3 px-4 font-semibold">Orders</th>
                    <th className="py-3 px-4 font-semibold">Items</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text-primary">{b.fileName}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="status"
                          statusType={
                            b.status === 'completed'
                              ? 'success'
                              : b.status === 'failed'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono">{b.customersCount}</td>
                      <td className="py-3 px-4 font-mono">{b.ordersCount}</td>
                      <td className="py-3 px-4 font-mono">{b.itemsCount}</td>
                      <td className="py-3 px-4">{new Date(b.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Wizard View */
        <div className="space-y-6">
          {/* Step 1: Upload Card */}
          <div className="bg-bg-surface border border-border-default rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-text-primary font-heading flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-action-primary text-text-inverse text-xs">
                1
              </span>
              Select Bumpa Export File
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-action-secondary-bg file:text-action-secondary-text hover:file:bg-border-default cursor-pointer"
              />

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handleValidate}
                  disabled={!file || validating || Boolean(importResult)}
                  variant="primary"
                  size="sm"
                >
                  {validating ? (
                    <>
                      <Spinner size="sm" className="mr-2" /> Validating...
                    </>
                  ) : (
                    'Validate & Preview'
                  )}
                </Button>

                {file && (
                  <Button onClick={resetUpload} variant="outline" size="sm">
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {file && (
              <p className="text-xs text-text-tertiary">
                Selected: <span className="font-medium text-text-secondary">{file.name}</span> (
                {(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Step 2: Validation Preview Cards */}
          {previewReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Customers Metric */}
                <div className="p-4 bg-bg-surface border border-border-default rounded-xl shadow-xs">
                  <div className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">Customers</div>
                  <div className="text-2xl font-bold font-heading text-text-primary mt-1">
                    {previewReport.customers.total}
                  </div>
                  <div className="mt-2 text-[11px] text-text-secondary space-y-0.5">
                    <div>New: <span className="font-semibold text-status-success-accent">{previewReport.customers.newCount}</span></div>
                    <div>Existing (reconciled): <span className="font-semibold text-status-info-accent">{previewReport.customers.existingCount}</span></div>
                  </div>
                </div>

                {/* Orders Metric */}
                <div className="p-4 bg-bg-surface border border-border-default rounded-xl shadow-xs">
                  <div className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">Orders</div>
                  <div className="text-2xl font-bold font-heading text-text-primary mt-1">
                    {previewReport.orders.total}
                  </div>
                  <div className="mt-2 text-[11px] text-text-secondary space-y-0.5">
                    <div>Valid: <span className="font-semibold">{previewReport.orders.validCount}</span></div>
                    <div>Duplicates (skipped): <span className="font-semibold text-text-tertiary">{previewReport.orders.duplicateCount}</span></div>
                  </div>
                </div>

                {/* Products Metric */}
                <div className="p-4 bg-bg-surface border border-border-default rounded-xl shadow-xs">
                  <div className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">Distinct Products</div>
                  <div className="text-2xl font-bold font-heading text-text-primary mt-1">
                    {previewReport.products.totalDistinct}
                  </div>
                  <div className="mt-2 text-[11px] text-text-secondary space-y-0.5">
                    <div>Auto-Mapped: <span className="font-semibold text-status-success-accent">{previewReport.products.mappedCount}</span></div>
                    <div>Unmapped / Review: <span className="font-semibold text-status-warning-accent">{previewReport.products.unmappedCount + previewReport.products.ambiguousCount}</span></div>
                  </div>
                </div>

                {/* Consent Metric */}
                <div className="p-4 bg-bg-surface border border-border-default rounded-xl shadow-xs">
                  <div className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">Consent Breakdown</div>
                  <div className="text-2xl font-bold font-heading text-text-primary mt-1">
                    {previewReport.consent.optedInCount}
                    <span className="text-xs font-normal text-text-tertiary ml-1">opted in</span>
                  </div>
                  <div className="mt-2 text-[11px] text-text-secondary space-y-0.5">
                    <div>Opted out: <span className="font-semibold">{previewReport.consent.optedOutCount}</span></div>
                    <div>Unknown (default safe: No): <span className="font-semibold">{previewReport.consent.unknownCount}</span></div>
                  </div>
                </div>
              </div>

              {/* Warnings List if any */}
              {previewReport.warnings.length > 0 && (
                <div className="p-4 bg-status-warning-bg/40 border border-status-warning-accent/30 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-status-warning-text flex items-center gap-1.5">
                    <span>⚠️</span> Validation Warnings ({previewReport.warnings.length})
                  </div>
                  <ul className="text-xs text-status-warning-text space-y-1 list-disc list-inside max-h-36 overflow-y-auto">
                    {previewReport.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Step 3: Interactive Product Mapping Table */}
              <div className="bg-bg-surface border border-border-default rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-text-primary font-heading flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-action-primary text-text-inverse text-xs">
                        2
                      </span>
                      Review Product Mappings
                    </h2>
                    <p className="text-xs text-text-secondary mt-1">
                      Map historical product titles from Bumpa to canonical store products. Unmapped products remain safely
                      in the order history without falsely matching catalog IDs in audience queries.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-border-default rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg-subtle text-text-primary border-b border-border-default font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Historical Product Title</th>
                        <th className="py-2.5 px-3 w-24">Units</th>
                        <th className="py-2.5 px-3 w-32">Status</th>
                        <th className="py-2.5 px-3">Map to Catalog Product</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {previewReport.products.items.map((prod) => {
                        const currentMapping = mappings[prod.normalizedTitle] || {
                          targetProductId: prod.suggestedProductId,
                          status: prod.status,
                        };

                        return (
                          <tr key={prod.normalizedTitle} className="hover:bg-bg-subtle/40 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-medium text-text-primary block">{prod.historicalTitle}</span>
                              {prod.potentialMatches && prod.potentialMatches.length > 1 && (
                                <span className="text-[10px] text-text-tertiary">
                                  Multiple possible matches found in catalog.
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-text-secondary">{prod.occurrences}</td>
                            <td className="py-3 px-3">
                              <Badge
                                variant="status"
                                statusType={
                                  currentMapping.status === 'mapped' && currentMapping.targetProductId
                                    ? 'success'
                                    : currentMapping.status === 'ignored'
                                    ? 'neutral'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {currentMapping.status === 'mapped' && currentMapping.targetProductId
                                  ? 'Mapped'
                                  : currentMapping.status === 'ignored'
                                  ? 'Ignored'
                                  : 'Unmapped'}
                              </Badge>
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={
                                  currentMapping.status === 'ignored'
                                    ? '__ignored__'
                                    : currentMapping.targetProductId || '__unmapped__'
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__unmapped__') {
                                    updateProductMapping(prod.normalizedTitle, null, 'unmapped');
                                  } else if (val === '__ignored__') {
                                    updateProductMapping(prod.normalizedTitle, null, 'ignored');
                                  } else {
                                    updateProductMapping(prod.normalizedTitle, val, 'mapped');
                                  }
                                }}
                                className="w-full text-xs bg-bg-surface border border-border-default rounded-md px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                              >
                                <option value="__unmapped__">⚠️ Keep Unmapped (Historical Only)</option>
                                <option value="__ignored__">🚫 Ignore Product (Skip Line Items)</option>
                                {catalogProducts.length > 0 ? (
                                  <optgroup label={`Catalog Products (${catalogProducts.length})`}>
                                    {catalogProducts.map((cp) => (
                                      <option key={cp.id} value={cp.id}>
                                        {cp.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : (
                                  <optgroup label="Catalog Products">
                                    <option disabled value="">No catalog products available</option>
                                  </optgroup>
                                )}
                                {currentMapping.targetProductId &&
                                  !catalogProducts.some((cp) => cp.id === currentMapping.targetProductId) && (
                                    <option value={currentMapping.targetProductId}>
                                      {prod.suggestedProductName || 'Selected Catalog Product'}
                                    </option>
                                  )}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 4: Execute Card */}
              <div className="bg-bg-surface border border-border-default rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-text-primary font-heading flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-action-primary text-text-inverse text-xs">
                      3
                    </span>
                    Ready to Import
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Confirmed mappings will be saved to your organization’s catalog mapping dictionary.
                  </p>
                </div>

                <Button
                  onClick={handleExecuteImport}
                  disabled={importing || !previewReport.canProceed || Boolean(importResult)}
                  variant="primary"
                  size="md"
                >
                  {importing ? (
                    <>
                      <Spinner size="sm" className="mr-2" /> Importing Data...
                    </>
                  ) : (
                    'Confirm & Import Historical Data'
                  )}
                </Button>
              </div>

              {/* Completion Results Modal/Card */}
              {importResult && (
                <div
                  className={`bg-bg-surface border-2 rounded-xl p-6 shadow-md space-y-4 animate-in fade-in duration-200 ${
                    importResult.status === 'completed'
                      ? 'border-status-success-accent'
                      : importResult.status === 'partial'
                      ? 'border-status-warning-accent'
                      : 'border-status-error-accent'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 font-bold font-heading text-lg ${
                      importResult.status === 'completed'
                        ? 'text-status-success-accent'
                        : importResult.status === 'partial'
                        ? 'text-status-warning-text'
                        : 'text-status-error-text'
                    }`}
                  >
                    <span>
                      {importResult.status === 'completed' ? '🎉' : importResult.status === 'partial' ? '⚠️' : '❌'}
                    </span>
                    {importResult.status === 'completed'
                      ? 'Historical Migration Complete!'
                      : importResult.status === 'partial'
                      ? 'Historical Migration Completed with Warnings'
                      : 'Historical Migration Failed'}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-bg-subtle rounded-lg">
                      <div className="text-text-tertiary">New Customers</div>
                      <div className="text-lg font-bold text-text-primary mt-1">
                        {importResult.importedCustomersCount}
                      </div>
                    </div>
                    <div className="p-3 bg-bg-subtle rounded-lg">
                      <div className="text-text-tertiary">Existing Customers Updated</div>
                      <div className="text-lg font-bold text-text-primary mt-1">
                        {importResult.updatedCustomersCount}
                      </div>
                    </div>
                    <div className="p-3 bg-bg-subtle rounded-lg">
                      <div className="text-text-tertiary">Orders Imported</div>
                      <div className="text-lg font-bold text-text-primary mt-1">
                        {importResult.importedOrdersCount}
                      </div>
                    </div>
                    <div className="p-3 bg-bg-subtle rounded-lg">
                      <div className="text-text-tertiary">Duplicates Skipped</div>
                      <div className="text-lg font-bold text-text-primary mt-1">
                        {importResult.skippedOrdersCount}
                      </div>
                    </div>
                  </div>

                  {importResult.warnings.length > 0 && (
                    <div className="p-3 bg-status-warning-bg/40 border border-status-warning-accent/30 rounded-lg space-y-1">
                      <div className="text-xs font-semibold text-status-warning-text">
                        Warnings ({importResult.warnings.length})
                      </div>
                      <ul className="text-xs text-status-warning-text space-y-0.5 list-disc list-inside max-h-32 overflow-y-auto">
                        {importResult.warnings.slice(0, 10).map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                        {importResult.warnings.length > 10 && (
                          <li className="italic">...and {importResult.warnings.length - 10} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <Link href="/admin/customers">
                      <Button variant="outline" size="sm">
                        View Customers
                      </Button>
                    </Link>
                    <Link href="/admin/orders">
                      <Button variant="outline" size="sm">
                        View Orders
                      </Button>
                    </Link>
                    <Link href="/admin/marketing/segments">
                      <Button variant="outline" size="sm">
                        Go to Audiences &amp; Segments
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
