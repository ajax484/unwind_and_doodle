'use client';

import React, { useState, useRef } from 'react';

interface CustomizationUploaderProps {
  onCustomizationChange: (data: { assetUrls: string[]; notes: string }) => void;
}

export default function CustomizationUploader({
  onCustomizationChange,
}: CustomizationUploaderProps) {
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be under 5MB');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/customizations/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to upload photo');
      }

      const newUrls = [...uploadedUrls, json.data.assetUrl];
      setUploadedUrls(newUrls);
      onCustomizationChange({ assetUrls: newUrls, notes });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error uploading file';
      setError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = uploadedUrls.filter((_, idx) => idx !== indexToRemove);
    setUploadedUrls(updated);
    onCustomizationChange({ assetUrls: updated, notes });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    onCustomizationChange({ assetUrls: uploadedUrls, notes: newNotes });
  };

  return (
    <div className="bg-[#FBF0F2] border border-[#F0DCE0] rounded-2xl p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white border border-[#F0DCE0] flex items-center justify-center text-xl shadow-xs text-[#D99BA3]">
          ✨
        </div>
        <div>
          <h4 className="font-heading font-bold text-base text-[#243342]">
            Custom Photo &amp; Dedication
          </h4>
          <p className="text-xs text-[#52657A]">
            Upload your personal photo to be turned into a bespoke coloring illustration!
          </p>
        </div>
      </div>

      {/* Upload Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all bg-white ${
          isDragging
            ? 'border-[#D99BA3] bg-[#FDF7F8]'
            : 'border-[#E2ECF2] hover:border-[#A7C2D4]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileSelect}
          className="hidden"
          id="customization-file-input"
          disabled={uploading}
        />
        <label
          htmlFor="customization-file-input"
          className="cursor-pointer flex flex-col items-center justify-center space-y-2.5"
        >
          <div className="w-12 h-12 rounded-full bg-[#EBF3F8] text-[#4A7A99] flex items-center justify-center text-2xl shadow-xs">
            {uploading ? (
              <span className="w-5 h-5 rounded-full border-2 border-[#D99BA3] border-t-transparent animate-spin" />
            ) : (
              '📷'
            )}
          </div>
          <div>
            <span className="font-heading font-semibold text-xs sm:text-sm text-[#D99BA3] hover:text-[#C67D87] block">
              {uploading ? 'Uploading your photo...' : 'Click or drag photo to upload'}
            </span>
            <p className="text-[11px] text-[#8295A8]">JPEG, PNG, or WebP (Max 5MB)</p>
          </div>
        </label>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-[#FDF0F2] text-[#B33948] text-xs rounded-xl border border-[#F0DCE0] flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Uploaded Previews */}
      {uploadedUrls.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-heading font-bold text-[#52657A] uppercase tracking-wider block">
            Attached Photos ({uploadedUrls.length})
          </span>
          <div className="flex flex-wrap gap-3">
            {uploadedUrls.map((url, idx) => (
              <div
                key={idx}
                className="relative group w-20 h-20 rounded-xl overflow-hidden border border-[#DCE7EE] shadow-xs"
              >
                <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-heading font-semibold"
                  aria-label={`Remove image ${idx + 1}`}
                >
                  ✕ Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dedication / Notes Field */}
      <div>
        <label className="block text-xs font-heading font-bold text-[#243342] mb-1">
          Dedication / Special Instructions (Optional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={handleNotesChange}
          placeholder="e.g. For Sarah on her graduation! Please include our family cat in the drawing."
          className="form-input text-xs"
        />
      </div>
    </div>
  );
}
