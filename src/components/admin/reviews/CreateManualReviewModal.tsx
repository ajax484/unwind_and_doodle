'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/Modal';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

interface ProductOption {
  id: string;
  name: string;
}

interface OrderOption {
  id: string;
  orderNumber: string;
  customerName: string;
  customerId: string | null;
}

interface ReviewImage {
  storagePath: string;
  name?: string;
}

interface CreateManualReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_SOURCES = ['WhatsApp', 'Instagram', 'Google', 'In-Person', 'Website'];

export function CreateManualReviewModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateManualReviewModalProps) {
  // Form fields
  const [productId, setProductId] = useState('');
  const [attributionMode, setAttributionMode] = useState<'standalone' | 'order'>('standalone');
  const [reviewerName, setReviewerName] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [source, setSource] = useState('');
  const [createdAt, setCreatedAt] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );
  const [status, setStatus] = useState<'approved' | 'pending'>('approved');
  const [images, setImages] = useState<ReviewImage[]>([]);

  // Async data & UI states
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [orderQuery, setOrderQuery] = useState('');
  const [searchingOrders, setSearchingOrders] = useState(false);
  const [orderResults, setOrderResults] = useState<OrderOption[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available products
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch('/api/admin/products?limit=100');
      const json = await res.json();
      if (res.ok && json.success) {
        const prods = (json.data?.products || []).map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name,
        }));
        setProducts(prods);
        if (prods.length > 0 && !productId) {
          setProductId(prods[0].id);
        }
      }
    } catch {
      // Fallback silently if fetching fails
    } finally {
      setLoadingProducts(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setError(null);
    }
  }, [isOpen, fetchProducts]);

  // Search orders when in 'order' attribution mode
  useEffect(() => {
    if (attributionMode !== 'order' || !orderQuery.trim()) {
      setOrderResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingOrders(true);
        const res = await fetch(`/api/admin/orders?limit=10&search=${encodeURIComponent(orderQuery.trim())}`);
        const json = await res.json();
        if (res.ok && json.success) {
          const list: OrderOption[] = (json.data?.orders || []).map(
            (o: { id: string; order_number: string; customer?: { id?: string; name?: string } | null }) => ({
              id: o.id,
              orderNumber: o.order_number,
              customerName: o.customer?.name || 'Customer',
              customerId: o.customer?.id || null,
            })
          );
          setOrderResults(list);
        }
      } catch {
        // Ignored
      } finally {
        setSearchingOrders(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [attributionMode, orderQuery]);

  // Select an order
  const handleSelectOrder = (order: OrderOption) => {
    setSelectedOrder(order);
    if (!reviewerName.trim()) {
      setReviewerName(order.customerName);
    }
  };

  // Upload image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setError('You can upload a maximum of 5 images.');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/products/upload-image', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();
        if (res.ok && json.success && (json.storagePath || json.data?.storagePath)) {
          const path = json.storagePath || json.data?.storagePath;
          setImages((prev) => [...prev, { storagePath: path, name: file.name }]);
        } else {
          setError(json.error || 'Failed to upload image');
        }
      }
    } catch {
      setError('Failed to upload image.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit manual review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError('Please select a product.');
      return;
    }
    if (!reviewerName.trim()) {
      setError('Reviewer name is required.');
      return;
    }
    if (!body.trim()) {
      setError('Review content is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        productId,
        rating,
        reviewerName: reviewerName.trim(),
        title: title.trim() || undefined,
        body: body.trim(),
        orderId: attributionMode === 'order' && selectedOrder ? selectedOrder.id : undefined,
        customerId: attributionMode === 'order' && selectedOrder ? selectedOrder.customerId : undefined,
        source: source.trim() || undefined,
        status,
        createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
        images: images.map((img) => ({ storagePath: img.storagePath })),
      };

      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create review');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating manual review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Add Review"
      className="max-h-[90vh] flex flex-col overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Spinner size="sm" /> Loading products...
              </div>
            ) : (
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-rose-400"
                required
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Attribution Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Attribution</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAttributionMode('standalone');
                  setSelectedOrder(null);
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  attributionMode === 'standalone'
                    ? 'bg-rose-50/70 border-rose-300 text-rose-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Standalone Reviewer
              </button>
              <button
                type="button"
                onClick={() => setAttributionMode('order')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  attributionMode === 'order'
                    ? 'bg-rose-50/70 border-rose-300 text-rose-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Link to Order
              </button>
            </div>
          </div>

          {/* Order Search & Selection if mode === 'order' */}
          {attributionMode === 'order' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Search Order</label>
              {selectedOrder ? (
                <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-300 rounded-xl">
                  <div>
                    <div className="font-bold text-xs text-slate-800 font-mono">
                      #{selectedOrder.orderNumber}
                    </div>
                    <div className="text-[11px] text-slate-500">{selectedOrder.customerName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Search order number or customer name..."
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-400"
                  />
                  {searchingOrders && (
                    <div className="text-[11px] text-slate-400 py-1">Searching orders...</div>
                  )}
                  {orderResults.length > 0 && (
                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                      {orderResults.map((o) => (
                        <div
                          key={o.id}
                          onClick={() => handleSelectOrder(o)}
                          className="p-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold font-mono text-slate-800">
                              #{o.orderNumber}
                            </span>
                            <span className="ml-2 text-slate-500">{o.customerName}</span>
                          </div>
                          <span className="text-[11px] text-rose-600 font-semibold">Select</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reviewer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reviewer Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="e.g. Fatima A."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-400"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rating</label>
            <div className="flex items-center gap-1.5 text-2xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className={`cursor-pointer transition-transform hover:scale-110 ${
                    (hoverRating !== null ? hoverRating >= star : rating >= star)
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }`}
                  aria-label={`${star} star`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-xs font-semibold text-slate-600">{rating} out of 5</span>
            </div>
          </div>

          {/* Review Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Review Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Beautiful and relaxing!"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-400"
            />
          </div>

          {/* Review Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Review Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the customer's testimonial..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-400"
            />
          </div>

          {/* Source Tag */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_SOURCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    source === s
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Or enter custom source..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-400"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Review Date</label>
            <input
              type="datetime-local"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-rose-400"
            />
          </div>

          {/* Photo Uploader */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Photos ({images.length}/5)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group"
                >
                  <img
                    src={img.storagePath}
                    alt={img.name || 'Review image'}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold opacity-90 hover:opacity-100 shadow-xs"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {images.length < 5 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="manual-review-photos-input"
                />
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploadingImage ? <Spinner size="sm" /> : <span>📷</span>}
                  <span>Upload Photos</span>
                </button>
              </div>
            )}
          </div>

          {/* Publication Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Publication Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs ${
                  status === 'approved'
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="reviewStatus"
                  value="approved"
                  checked={status === 'approved'}
                  onChange={() => setStatus('approved')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Approve & Publish Immediately</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs ${
                  status === 'pending'
                    ? 'bg-amber-50/70 border-amber-300 text-amber-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="reviewStatus"
                  value="pending"
                  checked={status === 'pending'}
                  onChange={() => setStatus('pending')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>Save as Pending Draft</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || loadingProducts}
          >
            {isSubmitting ? 'Saving...' : 'Save Review'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
