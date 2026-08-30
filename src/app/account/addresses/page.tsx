'use client';

import React, { useEffect, useState } from 'react';

interface AddressRecord {
  id: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  state: string;
  lga?: string | null;
  locationId?: string | null;
  isDefault: boolean;
}

interface LocationOption {
  id: string;
  name: string;
  state: string;
}

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);

  // Form fields
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [stateVal, setStateVal] = useState('Lagos');
  const [lgaVal, setLgaVal] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [addrRes, locRes] = await Promise.all([
        fetch('/api/account/addresses'),
        fetch('/api/locations'),
      ]);

      const addrJson = await addrRes.json();
      const locJson = await locRes.json();

      if (addrJson.success) setAddresses(addrJson.data || []);
      if (locJson.success) setLocations(locJson.data || []);
    } catch {
      // Handled in UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingAddress(null);
    setRecipientName('');
    setPhone('');
    setAddressLine1('');
    setAddressLine2('');
    setStateVal('Lagos');
    setLgaVal('');
    setLocationId(locations[0]?.id || '');
    setIsDefault(addresses.length === 0);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (addr: AddressRecord) => {
    setEditingAddress(addr);
    setRecipientName(addr.recipientName);
    setPhone(addr.phone);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || '');
    setStateVal(addr.state);
    setLgaVal(addr.lga || '');
    setLocationId(addr.locationId || '');
    setIsDefault(addr.isDefault);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        state: stateVal.trim(),
        lga: lgaVal.trim() || undefined,
        locationId: locationId || undefined,
        isDefault,
      };

      const url = editingAddress
        ? `/api/account/addresses/${editingAddress.id}`
        : '/api/account/addresses';
      const method = editingAddress ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save address');
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this delivery address?')) return;
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch {
      // Ignored
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/account/addresses/${id}/default`, { method: 'POST' });
      if (res.ok) {
        loadData();
      }
    } catch {
      // Ignored
    }
  };

  if (loading) {
    return (
      <div className="card-soft p-12 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#D99BA3] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading addresses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-800">
            Saved Addresses
          </h1>
          <p className="text-xs text-slate-500">
            Manage your saved delivery addresses for faster checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="btn-pink text-xs !py-2.5 !px-4 self-start sm:self-auto cursor-pointer"
        >
          + Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="card-soft p-12 text-center space-y-4 bg-white border border-[#E2ECF2]">
          <span className="text-4xl block">📍</span>
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-base text-slate-800">
              No saved addresses
            </h3>
            <p className="text-xs text-slate-500">
              Add a delivery address to speed up future checkouts.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="btn-pink text-xs !px-6 cursor-pointer"
          >
            Add Address Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`card-soft p-6 bg-white border shadow-xs space-y-4 flex flex-col justify-between ${
                addr.isDefault ? 'border-[#D99BA3] ring-2 ring-[#D99BA3]/10' : 'border-[#E2ECF2]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-sm text-slate-800">
                    {addr.recipientName}
                  </span>
                  {addr.isDefault ? (
                    <span className="bg-[#FBF0F2] text-[#D99BA3] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Default
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-[11px] text-[#4A7A99] hover:underline font-semibold cursor-pointer"
                    >
                      Set as Default
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {addr.addressLine1}
                  {addr.addressLine2 && <><br />{addr.addressLine2}</>}
                  <br />
                  {addr.lga && `${addr.lga}, `}{addr.state}
                </p>

                <p className="text-xs text-slate-500 pt-1">
                  📞 {addr.phone}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(addr)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(addr.id)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-heading font-bold text-lg text-slate-800">
                {editingAddress ? 'Edit Address' : 'Add New Delivery Address'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Bilal Sani"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. 14 Mindful Grove, Lekki Phase 1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Apartment, Suite, Unit (Optional)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Apt 4B"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    City / LGA
                  </label>
                  <input
                    type="text"
                    value={lgaVal}
                    onChange={(e) => setLgaVal(e.target.value)}
                    placeholder="e.g. Eti-Osa"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3]"
                  />
                </div>
              </div>

              {locations.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Delivery Hub / Location
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3] bg-white"
                  >
                    <option value="">Select a delivery hub</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.state})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefaultCheckbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-[#D99BA3] focus:ring-[#D99BA3]"
                />
                <label htmlFor="isDefaultCheckbox" className="text-xs text-slate-700 cursor-pointer">
                  Set as default delivery address
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-pink text-xs !px-6 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
