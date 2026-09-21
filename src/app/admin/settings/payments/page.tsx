'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { OrganizationPaymentMethod } from '@/types/payment-settings';

interface ProviderCardProps {
  method: OrganizationPaymentMethod;
  onToggle: (provider: string, enabled: boolean) => Promise<void>;
  onSaveBankDetails?: (details: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    instructions: string;
  }) => Promise<void>;
  isUpdating: boolean;
}

export default function PaymentSettingsPage() {
  const [methods, setMethods] = useState<OrganizationPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);

  // Bank transfer form state
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [bankFormError, setBankFormError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/settings/payment-methods');
      const json = await res.json();

      if (res.ok && json.success) {
        const fetchedMethods: OrganizationPaymentMethod[] = json.data || [];
        setMethods(fetchedMethods);

        const manual = fetchedMethods.find((m) => m.provider === 'manual');
        if (manual) {
          setBankName(manual.bankName || '');
          setAccountName(manual.accountName || '');
          setAccountNumber(manual.accountNumber || '');
          setInstructions(manual.instructions || '');
        }
      } else {
        throw new Error(json.error || 'Failed to fetch payment methods');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading payment methods');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleToggle = async (provider: string, nextEnabled: boolean) => {
    setError(null);
    setBankFormError(null);

    // If enabling manual (bank transfer) and fields are not filled yet
    if (provider === 'manual' && nextEnabled) {
      if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
        setBankFormError(
          'Please enter your Bank Name, Account Name, and Account Number before enabling Bank Transfer.'
        );
        return;
      }
    }

    try {
      setUpdatingProvider(provider);
      const payload: Record<string, unknown> = {
        provider,
        enabled: nextEnabled,
      };

      if (provider === 'manual') {
        payload.bankName = bankName.trim();
        payload.accountName = accountName.trim();
        payload.accountNumber = accountNumber.trim();
        payload.instructions = instructions.trim();
      }

      const res = await fetch('/api/admin/settings/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update payment method');
      }

      setMethods((prev) =>
        prev.map((m) => (m.provider === provider ? json.data : m))
      );
      showSuccess(
        `${provider.toUpperCase()} has been ${nextEnabled ? 'enabled' : 'disabled'}.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingProvider(null);
    }
  };

  const handleSaveBankDetails = async (
    e?: React.FormEvent,
    shouldEnable?: boolean
  ) => {
    if (e) e.preventDefault();
    setError(null);
    setBankFormError(null);

    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      setBankFormError('Bank Name, Account Name, and Account Number are all required.');
      return;
    }

    try {
      setUpdatingProvider('manual');
      const manualMethod = methods.find((m) => m.provider === 'manual');
      const isCurrentlyEnabled =
        shouldEnable !== undefined ? shouldEnable : Boolean(manualMethod?.enabled);

      const res = await fetch('/api/admin/settings/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'manual',
          enabled: isCurrentlyEnabled,
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          instructions: instructions.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update bank details');
      }

      setMethods((prev) =>
        prev.map((m) => (m.provider === 'manual' ? json.data : m))
      );
      showSuccess(
        isCurrentlyEnabled
          ? 'Direct Bank Transfer is active and bank details were saved successfully.'
          : 'Bank details saved successfully.'
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save bank details');
    } finally {
      setUpdatingProvider(null);
    }
  };

  const paystackMethod = methods.find((m) => m.provider === 'paystack');
  const flutterwaveMethod = methods.find((m) => m.provider === 'flutterwave');
  const manualMethod = methods.find((m) => m.provider === 'manual');

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* 1. Header & Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
            <Link href="/admin/settings" className="hover:text-rose-600 transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="text-slate-800">Payment Methods</span>
          </div>
          <h1 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
            Payment Methods
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure which payment gateways and transfer options are available to customers at checkout.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center gap-2 transition-all">
          <span>✅</span>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-2xl border border-rose-200 flex items-center justify-between gap-2 transition-all">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 text-xs text-slate-600">
        <span className="text-2xl">🔒</span>
        <div>
          <span className="font-bold text-slate-800">Historical Integrity:</span> Changing enabled payment methods never alters historical orders or past payment records. At least one payment method must remain active.
        </div>
      </div>

      {/* 2. Payment Method Cards */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* PAYSTACK CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl shrink-0">
                  💳
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-slate-900">
                      Paystack
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        paystackMethod?.enabled
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {paystackMethod?.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Accept card, bank transfer, USSD, and Apple Pay payments seamlessly with automated settlement.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(paystackMethod?.enabled)}
                    disabled={updatingProvider === 'paystack'}
                    onChange={(e) => handleToggle('paystack', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* FLUTTERWAVE CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-slate-900">
                      Flutterwave
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        flutterwaveMethod?.enabled
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {flutterwaveMethod?.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Accept payments from local and international customers via card, mobile money, and bank transfer.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(flutterwaveMethod?.enabled)}
                    disabled={updatingProvider === 'flutterwave'}
                    onChange={(e) => handleToggle('flutterwave', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* BANK TRANSFER (MANUAL) CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:border-slate-300 transition-all space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shrink-0">
                  🏦
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-slate-900">
                      Direct Bank Transfer
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        manualMethod?.enabled
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {manualMethod?.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Allow customers to transfer directly to your designated business bank account. Orders are confirmed once payment is verified.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(manualMethod?.enabled)}
                    disabled={updatingProvider === 'manual'}
                    onChange={(e) => handleToggle('manual', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* Bank Form Error */}
            {bankFormError && (
              <div className="p-3 bg-amber-50 text-amber-900 text-xs rounded-2xl border border-amber-200">
                ⚠️ {bankFormError}
              </div>
            )}

            {/* Bank Transfer Configuration Form */}
            <div className="border-t border-slate-100 pt-6 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-heading font-bold text-sm text-slate-800">
                    Bank Account Details
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {manualMethod?.enabled
                      ? 'These details are currently displayed to customers during bank transfer checkout.'
                      : 'Enter your bank details below. These will be displayed to customers when Direct Bank Transfer is enabled.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveBankDetails} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GTBank / Zenith Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Unwind & Doodle Ltd"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Please use your Order ID as the payment reference."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={updatingProvider === 'manual'}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {updatingProvider === 'manual' ? 'Saving...' : 'Save Bank Details'}
                  </button>
                  {!manualMethod?.enabled && (
                    <button
                      type="button"
                      onClick={() => handleSaveBankDetails(undefined, true)}
                      disabled={updatingProvider === 'manual'}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {updatingProvider === 'manual' ? 'Saving...' : 'Save & Enable Bank Transfer'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
