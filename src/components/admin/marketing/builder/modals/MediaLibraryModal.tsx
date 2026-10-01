'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MediaAsset } from '@/types/marketing-builder';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import Spinner from '@/components/Spinner';
import { Tabs } from '@/components/Tabs';
import { toast } from 'sonner';

export interface MediaLibraryModalProps {
  isOpen: boolean;
  onSelectMedia: (asset: MediaAsset) => void;
  onClose: () => void;
}

export function MediaLibraryModal({
  isOpen,
  onSelectMedia,
  onClose,
}: MediaLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  // Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Media Library
  const loadMedia = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/marketing/media');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMediaList(json.data);
      }
    } catch (err) {
      console.error('Failed to load marketing media library', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMedia();
      setSelectedAsset(null);
      setSearch('');
    }
  }, [isOpen]);

  const filteredMedia = useMemo(() => {
    if (!search.trim()) return mediaList;
    const q = search.toLowerCase();
    return mediaList.filter(
      (m) =>
        m.filename.toLowerCase().includes(q) ||
        (m.altText && m.altText.toLowerCase().includes(q))
    );
  }, [mediaList, search]);

  // Handle File Upload
  const handleFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    // Validate format and size
    const validFiles: File[] = [];
    for (const f of fileArr) {
      if (!f.type.startsWith('image/')) {
        toast.error(`"${f.name}" is not an image file.`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 10MB limit.`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgressMsg(`Uploading ${validFiles.length} ${validFiles.length === 1 ? 'image' : 'images'}...`);

      const formData = new FormData();
      validFiles.forEach((f) => formData.append('files', f));

      const res = await fetch('/api/admin/marketing/media/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Upload failed');
      }

      toast.success('Image uploaded successfully!');
      const newAssets: MediaAsset[] = Array.isArray(json.assets)
        ? json.assets
        : [json.data];

      await loadMedia();

      // If single upload, auto-select and insert
      if (newAssets.length === 1 && newAssets[0]) {
        onSelectMedia(newAssets[0]);
        onClose();
      } else {
        setActiveTab('library');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error uploading file');
    } finally {
      setUploading(false);
      setUploadProgressMsg('');
    }
  };

  // Handle Delete
  const handleDelete = async (asset: MediaAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete "${asset.filename}" from the media library? Campaigns currently using this image will not be automatically altered.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/marketing/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: asset.url }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete');
      }

      toast.success('Media asset deleted');
      setMediaList((prev) => prev.filter((m) => m.url !== asset.url));
      if (selectedAsset?.url === asset.url) {
        setSelectedAsset(null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error deleting image');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-3xl bg-bg-surface rounded-2xl border border-border-default shadow-2xl overflow-hidden flex flex-col h-[85vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border-default flex items-center justify-between bg-bg-subtle/50">
          <div>
            <h3 className="text-base font-bold font-heading text-text-primary">
              🖼️ Campaign Media Library
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Upload, search, and reuse images across your Unwind &amp; Doodle marketing campaigns.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-bg-subtle cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-border-default/60 flex items-center justify-between">
          <div className="w-64">
            <Tabs
              tabs={[
                { id: 'library', label: `📁 Library (${mediaList.length})` },
                { id: 'upload', label: '⬆️ Upload New' },
              ]}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as 'library' | 'upload')}
              style="segmented"
              size="sm"
              fullWidth
            />
          </div>

          {activeTab === 'library' && (
            <div className="w-64">
              <TextInput
                placeholder="Search images..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'upload' ? (
            <div className="h-full flex flex-col justify-center items-center">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files) {
                    handleFiles(e.dataTransfer.files);
                  }
                }}
                className={`w-full max-w-lg p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-brand-rose bg-brand-rose/10 scale-102'
                    : 'border-border-default hover:border-brand-rose/60 bg-bg-subtle/40 hover:bg-bg-subtle'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                  }}
                />

                {uploading ? (
                  <div className="space-y-3 py-6">
                    <Spinner size="lg" />
                    <div className="text-xs font-semibold text-text-primary">
                      {uploadProgressMsg || 'Uploading images...'}
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-4xl block mb-3 opacity-60">📸</span>
                    <h4 className="text-sm font-bold font-heading text-text-primary mb-1">
                      Drag and drop image files here
                    </h4>
                    <p className="text-xs text-text-secondary max-w-xs leading-relaxed mb-4">
                      or click to browse from your computer. Supports JPG, PNG, WEBP, GIF, SVG up to 10MB.
                    </p>
                    <Button variant="primary" size="sm" type="button">
                      Browse Files
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Spinner size="lg" />
                  <span className="text-xs text-text-tertiary mt-2">Loading media library...</span>
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border-default rounded-2xl bg-bg-subtle/30">
                  <span className="text-3xl block mb-2 opacity-50">🖼️</span>
                  <div className="text-sm font-semibold text-text-secondary">
                    {search ? `No images matching "${search}"` : 'No media assets uploaded yet'}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1 mb-4">
                    Upload banners, illustrations, or graphics to use in your emails.
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('upload')}>
                    Upload Your First Image
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredMedia.map((asset) => {
                    const isSelected = selectedAsset?.url === asset.url;
                    return (
                      <div
                        key={asset.id || asset.url}
                        onClick={() => setSelectedAsset(asset)}
                        className={`group relative rounded-xl border p-2 bg-white flex flex-col justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-brand-rose ring-2 ring-brand-rose/20 bg-brand-rose/5 shadow-md'
                            : 'border-border-default hover:border-brand-rose/60 hover:shadow-sm'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-full h-28 rounded-lg overflow-hidden bg-bg-subtle flex items-center justify-center border border-border-default/60">
                          <img
                            src={asset.url}
                            alt={asset.altText || asset.filename}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Meta */}
                        <div className="mt-2 min-w-0">
                          <div className="text-xs font-semibold text-text-primary truncate" title={asset.filename}>
                            {asset.filename}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-text-tertiary mt-0.5">
                            <span>{asset.size ? `${Math.round(asset.size / 1024)} KB` : 'Image'}</span>
                            {isSelected && (
                              <span className="text-brand-rose font-bold">Selected ✓</span>
                            )}
                          </div>
                        </div>

                        {/* Hover Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(asset, e)}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white text-xs transition-opacity cursor-pointer"
                          title="Delete image from library"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border-default flex items-center justify-between bg-bg-subtle/40">
          <div className="text-xs text-text-secondary truncate max-w-sm">
            {selectedAsset ? (
              <span>
                Selected: <strong className="text-text-primary">{selectedAsset.filename}</strong>
              </span>
            ) : (
              <span>Select an image or upload a new one.</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedAsset}
              onClick={() => {
                if (selectedAsset) {
                  onSelectMedia(selectedAsset);
                  onClose();
                }
              }}
            >
              Insert Selected Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
