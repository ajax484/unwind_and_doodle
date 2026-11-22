'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AdminMediaItem } from '@/types/admin-product';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import Spinner from '@/components/Spinner';
import TextInput from '@/components/TextInput';
import {
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  isAllowedImageMimeType,
  isAllowedVideoMimeType,
} from '@/lib/product-media-storage';
import {
  compressImageForUpload,
  uploadFormDataWithRetry,
} from '@/lib/image-upload-utils';

interface UploadQueueItem {
  id: string;
  file: File;
  type: 'image' | 'video';
  status: 'queued' | 'compressing' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  savedBytes?: number;
}

export interface ProductMediaManagerProps {
  media: AdminMediaItem[];
  onChange: (updatedMedia: AdminMediaItem[]) => void;
  productId?: string;
  productName?: string;
  disabled?: boolean;
}

/**
 * Utility to extract a frame from a Video File or URL as a JPEG File
 */
export async function captureVideoThumbnail(
  source: File | string,
  seekTime: number = 0.5
): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let objectUrl: string | null = null;
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);

    video.onloadedmetadata = () => {
      const targetTime = Math.min(
        seekTime,
        video.duration > 0 ? Math.max(0.1, video.duration / 2) : 0.1
      );
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 640;

        let targetW = width;
        let targetH = height;
        const maxDim = 1200;
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDim) / targetW);
            targetW = maxDim;
          } else {
            targetW = Math.round((targetW * maxDim) / targetH);
            targetH = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          clearTimeout(timer);
          resolve(null);
          return;
        }

        ctx.drawImage(video, 0, 0, targetW, targetH);
        canvas.toBlob(
          (blob) => {
            cleanup();
            clearTimeout(timer);
            if (!blob) {
              resolve(null);
              return;
            }
            const baseName =
              typeof source === 'string'
                ? 'video-thumbnail'
                : source.name.replace(/\.[^/.]+$/, '');
            const file = new File([blob], `${baseName}-poster.jpg`, { type: 'image/jpeg' });
            resolve(file);
          },
          'image/jpeg',
          0.85
        );
      } catch {
        cleanup();
        clearTimeout(timer);
        resolve(null);
      }
    };

    video.onerror = () => {
      cleanup();
      clearTimeout(timer);
      resolve(null);
    };

    if (typeof source === 'string') {
      video.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      video.src = objectUrl;
    }
  });
}

export default function ProductMediaManager({
  media,
  onChange,
  productId,
  productName = 'Product',
  disabled = false,
}: ProductMediaManagerProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Uploading state
  const [uploadingType, setUploadingType] = useState<'image' | 'video' | 'thumbnail' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const mediaRef = useRef<AdminMediaItem[]>(media);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  // Drag & drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Modals
  const [previewItem, setPreviewItem] = useState<AdminMediaItem | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingAltText, setEditingAltText] = useState('');
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);

  const updateQueueItem = (id: string, patch: Partial<UploadQueueItem>) => {
    setUploadQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const dismissQueueItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadSingleQueuedFile = async (queueItem: UploadQueueItem) => {
    const { id, file, type } = queueItem;

    // Client-side validations
    if (type === 'image') {
      if (!isAllowedImageMimeType(file.type, file.name)) {
        updateQueueItem(id, {
          status: 'error',
          error: 'Invalid image format. Allowed: JPG, PNG, WEBP, GIF.',
        });
        return;
      }
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        updateQueueItem(id, {
          status: 'error',
          error: `Exceeds ${MAX_IMAGE_FILE_SIZE / (1024 * 1024)}MB limit.`,
        });
        return;
      }
    } else {
      if (!isAllowedVideoMimeType(file.type, file.name)) {
        updateQueueItem(id, {
          status: 'error',
          error: 'Invalid video format. Allowed: MP4, WEBM, QuickTime (MOV).',
        });
        return;
      }
      if (file.size > MAX_VIDEO_FILE_SIZE) {
        updateQueueItem(id, {
          status: 'error',
          error: `Exceeds ${MAX_VIDEO_FILE_SIZE / (1024 * 1024)}MB limit.`,
        });
        return;
      }
    }

    try {
      let fileToUpload = file;
      let savedBytes = 0;

      if (type === 'image') {
        updateQueueItem(id, { status: 'compressing', progress: 5, error: undefined });
        const compressed = await compressImageForUpload(file);
        fileToUpload = compressed.file;
        savedBytes = Math.max(0, compressed.originalSize - compressed.compressedSize);
      }

      updateQueueItem(id, { status: 'uploading', progress: 10, savedBytes, error: undefined });

      const thumbnailPromise =
        type === 'video'
          ? captureVideoThumbnail(file).catch(() => null)
          : Promise.resolve(null);

      const uploadData = await uploadFormDataWithRetry<{
        storagePath: string;
        altText?: string;
      }>(
        '/api/admin/products/upload-media',
        () => {
          const formData = new FormData();
          formData.append('file', fileToUpload);
          if (productId) formData.append('productId', productId);
          return formData;
        },
        {
          maxRetries: 2,
          onProgress: (pct) => {
            updateQueueItem(id, { progress: Math.max(10, pct) });
          },
        }
      );

      let generatedThumbnailPath: string | null = null;
      const capturedThumbnailFile = await thumbnailPromise;
      if (capturedThumbnailFile) {
        try {
          const thumbData = await uploadFormDataWithRetry<{ storagePath: string }>(
            '/api/admin/products/upload-media',
            () => {
              const thumbFormData = new FormData();
              thumbFormData.append('file', capturedThumbnailFile);
              thumbFormData.append('isThumbnail', 'true');
              if (productId) thumbFormData.append('productId', productId);
              return thumbFormData;
            },
            { maxRetries: 1 }
          );
          if (thumbData?.storagePath) {
            generatedThumbnailPath = thumbData.storagePath;
          }
        } catch {
          // Non-critical
        }
      }

      const nextMedia = [
        ...mediaRef.current,
        {
          type,
          storage_path: uploadData.storagePath,
          thumbnail_path: generatedThumbnailPath,
          alt_text: uploadData.altText || `${productName} ${type}`,
          sort_order: mediaRef.current.length,
        },
      ];
      mediaRef.current = nextMedia;
      onChange(nextMedia);

      updateQueueItem(id, { status: 'done', progress: 100 });
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((q) => q.id !== id));
      }, 1500);
    } catch (err: unknown) {
      updateQueueItem(id, {
        status: 'error',
        error: err instanceof Error ? err.message : `Error uploading ${type}`,
      });
    }
  };

  // 1. Multi-file Upload Handler for Images and Videos
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'video'
  ) => {
    const selectedFiles = Array.from(e.target.files || []);
    e.target.value = '';
    if (selectedFiles.length === 0) return;

    setUploadError(null);
    setUploadingType(type);

    const newItems: UploadQueueItem[] = selectedFiles.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      type,
      status: 'queued',
      progress: 0,
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);

    // Process with controlled concurrency (2 files at a time)
    const concurrency = 2;
    let cursor = 0;
    const worker = async () => {
      while (cursor < newItems.length) {
        const current = newItems[cursor++];
        await uploadSingleQueuedFile(current);
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(concurrency, newItems.length) }, () => worker())
      );
    } finally {
      setUploadingType(null);
    }
  };

  const handleRetryQueueItem = async (item: UploadQueueItem) => {
    setUploadingType(item.type);
    try {
      await uploadSingleQueuedFile(item);
    } finally {
      setUploadingType(null);
    }
  };

  // 2. Video Thumbnail Upload / Replace
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || editingItemIndex === null) return;

    if (!isAllowedImageMimeType(file.type, file.name)) {
      setUploadError('Thumbnail must be an image (JPG, PNG, WEBP, GIF).');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      setUploadError(`Thumbnail exceeds maximum size of ${MAX_IMAGE_FILE_SIZE / (1024 * 1024)}MB.`);
      e.target.value = '';
      return;
    }

    try {
      setUploadingType('thumbnail');
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('isThumbnail', 'true');
      if (productId) {
        formData.append('productId', productId);
      }

      const res = await fetch('/api/admin/products/upload-media', {
        method: 'POST',
        body: formData,
      });

      let json: { success?: boolean; error?: string; data?: { storagePath: string } } | null = null;
      const text = await res.text();
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          res.status === 413
            ? 'Thumbnail is too large for the server to process (HTTP 413).'
            : `Upload failed with status HTTP ${res.status}: ${text.slice(0, 150) || res.statusText}`
        );
      }

      if (!res.ok || !json?.success || !json.data) {
        throw new Error(json?.error || 'Failed to upload thumbnail');
      }

      const updated = [...media];
      updated[editingItemIndex] = {
        ...updated[editingItemIndex],
        thumbnail_path: json.data.storagePath,
      };
      onChange(updated);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error uploading thumbnail');
    } finally {
      setUploadingType(null);
      e.target.value = '';
    }
  };

  // Remove video thumbnail
  const handleRemoveThumbnail = async (index: number) => {
    const item = media[index];
    if (!item?.thumbnail_path) return;

    // Clean up storage object in background if possible
    try {
      fetch('/api/admin/products/upload-media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePaths: [item.thumbnail_path] }),
      }).catch(() => {});
    } catch {}

    const updated = [...media];
    updated[index] = {
      ...updated[index],
      thumbnail_path: null,
    };
    onChange(updated);
  };

  // Auto-capture poster frame from existing video
  const handleAutoCapturePoster = async (index: number) => {
    const item = media[index];
    if (!item || item.type !== 'video') return;

    try {
      setIsCapturingFrame(true);
      setUploadError(null);

      const capturedFile = await captureVideoThumbnail(item.storage_path);
      if (!capturedFile) {
        throw new Error('Unable to extract frame from video. You can upload an image manually instead.');
      }

      const formData = new FormData();
      formData.append('file', capturedFile);
      formData.append('isThumbnail', 'true');
      if (productId) {
        formData.append('productId', productId);
      }

      const res = await fetch('/api/admin/products/upload-media', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || 'Failed to upload generated thumbnail');
      }

      const json = await res.json();
      if (!json?.success || !json.data?.storagePath) {
        throw new Error(json?.error || 'Failed to save thumbnail');
      }

      const updated = [...media];
      updated[index] = {
        ...updated[index],
        thumbnail_path: json.data.storagePath,
      };
      onChange(updated);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error capturing frame from video');
    } finally {
      setIsCapturingFrame(false);
    }
  };

  // 3. Reordering via Drag & Drop
  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (targetIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...media];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Resequence sort_order
    const updated = reordered.map((item, idx) => ({
      ...item,
      sort_order: idx,
    }));

    onChange(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 4. Accessible Move Earlier / Later (Keyboard & Touch friendly)
  const handleMove = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= media.length) return;

    const reordered = [...media];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updated = reordered.map((item, idx) => ({
      ...item,
      sort_order: idx,
    }));

    onChange(updated);
  };

  // 5. Open Edit Metadata Modal (Alt text & thumbnail)
  const openEditModal = (index: number) => {
    setEditingItemIndex(index);
    setEditingAltText(media[index].alt_text || '');
  };

  const saveEditModal = () => {
    if (editingItemIndex === null) return;
    const updated = [...media];
    updated[editingItemIndex] = {
      ...updated[editingItemIndex],
      alt_text: editingAltText.trim() || null,
    };
    onChange(updated);
    setEditingItemIndex(null);
  };

  // 6. Delete Media
  const confirmDelete = (index: number) => {
    setDeletingIndex(index);
  };

  const executeDelete = async () => {
    if (deletingIndex === null) return;

    const targetItem = media[deletingIndex];
    setIsDeleting(true);

    try {
      // If persisted on server with an ID and product exists, call delete endpoint
      if (targetItem.id && productId) {
        const res = await fetch(`/api/admin/products/${productId}/media/${targetItem.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to delete media from database');
        }
      } else {
        // Unsaved item: clean up storage file
        const pathsToClean = [targetItem.storage_path, targetItem.thumbnail_path].filter(Boolean);
        if (pathsToClean.length > 0) {
          await fetch('/api/admin/products/upload-media', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storagePaths: pathsToClean }),
          });
        }
      }

      // Remove from media array and resequence
      const remaining = media
        .filter((_, idx) => idx !== deletingIndex)
        .map((item, idx) => ({ ...item, sort_order: idx }));

      onChange(remaining);
      setDeletingIndex(null);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to delete media item');
    } finally {
      setIsDeleting(false);
    }
  };

  const isUploading = uploadingType !== null;
  const editingItem = editingItemIndex !== null ? media[editingItemIndex] : null;
  const deletingItem = deletingIndex !== null ? media[deletingIndex] : null;

  return (
    <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-3">
        <div>
          <h3 className="font-heading font-bold text-base text-text-primary flex items-center gap-2">
            <span>Product Media</span>
            <span className="text-xs font-normal text-text-tertiary">
              ({media.length} {media.length === 1 ? 'item' : 'items'})
            </span>
          </h3>
          <p className="text-xs text-text-secondary">
            Manage product images and videos. Drag or use arrows to reorder. The first item serves as the main cover.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Upload Image Input (supports multi-file selection) */}
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            onChange={(e) => handleFileUpload(e, 'image')}
            disabled={disabled || isUploading}
            className="hidden"
            id="admin-upload-image-input"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            loading={uploadingType === 'image'}
            onClick={() => imageInputRef.current?.click()}
            aria-label="Upload product images"
          >
            + Add Images
          </Button>

          {/* Upload Video Input */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v,.ogv"
            onChange={(e) => handleFileUpload(e, 'video')}
            disabled={disabled || isUploading}
            className="hidden"
            id="admin-upload-video-input"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || isUploading}
            loading={uploadingType === 'video'}
            onClick={() => videoInputRef.current?.click()}
            aria-label="Upload product video"
          >
            + Add Video
          </Button>
        </div>
      </div>

      {/* Per-File Upload Progress & Retry Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2" data-testid="media-upload-queue">
          {uploadQueue.map((q) => (
            <div
              key={q.id}
              className={`p-3 rounded-2xl border text-xs flex flex-col gap-1.5 ${
                q.status === 'error'
                  ? 'bg-red-50/70 border-red-200 text-red-800'
                  : q.status === 'done'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold truncate">{q.file.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {q.status === 'compressing'
                      ? 'Optimizing...'
                      : q.status === 'uploading'
                      ? `${q.progress}%`
                      : q.status === 'done'
                      ? 'Uploaded'
                      : q.status === 'error'
                      ? 'Failed'
                      : 'Queued'}
                  </span>
                </div>
                {q.status === 'error' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRetryQueueItem(q)}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissQueueItem(q.id)}
                      className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                      aria-label={`Dismiss ${q.file.name}`}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              {q.status !== 'error' && (
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      q.status === 'done' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${q.progress}%` }}
                  />
                </div>
              )}
              {q.error && <p className="text-[11px] text-red-700">{q.error}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Upload Error Alert */}
      {uploadError && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-status-danger-bg text-status-danger-text border border-status-danger-accent/30 text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-status-danger-text hover:opacity-75 font-bold cursor-pointer"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Media Grid or Empty State */}
      {media.length === 0 ? (
        <div className="py-8 border-2 border-dashed border-border-default rounded-2xl">
          <EmptyState
            size="sm"
            title="No product media yet"
            description="Add images or a video to showcase this product in your catalog."
            primaryAction={{
              label: '+ Add First Image',
              onClick: () => imageInputRef.current?.click(),
              disabled: disabled || isUploading,
            }}
            secondaryAction={{
              label: '+ Add Video',
              onClick: () => videoInputRef.current?.click(),
              disabled: disabled || isUploading,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {media.map((item, index) => {
            const isCover = index === 0;
            const isVideo = item.type === 'video';
            const isBeingDragged = draggedIndex === index;
            const isDropTarget = dragOverIndex === index;

            return (
              <div
                key={item.id || `${item.storage_path}-${index}`}
                draggable={!disabled && !isUploading}
                onDragStart={(e) => handleDragStart(index, e)}
                onDragOver={(e) => handleDragOver(index, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(index, e)}
                className={`group relative rounded-2xl overflow-hidden border bg-bg-surface flex flex-col transition-all select-none ${
                  isBeingDragged
                    ? 'opacity-40 scale-95 border-dashed border-action-primary'
                    : isDropTarget
                    ? 'border-2 border-action-primary shadow-lg ring-2 ring-action-primary/30'
                    : 'border-border-default shadow-2xs hover:shadow-sm'
                }`}
              >
                {/* Media Container (1:1 aspect ratio) */}
                <div className="relative aspect-square w-full bg-slate-900/5 flex items-center justify-center overflow-hidden">
                  {isVideo ? (
                    item.thumbnail_path ? (
                      <img
                        src={item.thumbnail_path}
                        alt={item.alt_text || 'Video poster'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                        <video
                          src={item.storage_path}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover opacity-75"
                        />
                      </div>
                    )
                  ) : (
                    <img
                      src={item.storage_path}
                      alt={item.alt_text || productName}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Play icon overlay for videos */}
                  {isVideo && (
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer shadow-md"
                      title="Preview video"
                      aria-label="Preview video"
                    >
                      <svg
                        className="w-5 h-5 fill-current translate-x-0.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  )}

                  {/* Top-left Badges: Cover and Type */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    {isCover && (
                      <Badge variant="accent" size="sm">
                        Cover Media
                      </Badge>
                    )}
                    <Badge
                      variant={isVideo ? 'bundle' : 'tag'}
                      size="sm"
                    >
                      {isVideo ? '▶ Video' : '📷 Image'}
                    </Badge>
                  </div>

                  {/* Top-right Actions: Edit details & Delete */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                    <button
                      type="button"
                      onClick={() => openEditModal(index)}
                      className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-800 text-xs flex items-center justify-center shadow-xs cursor-pointer transition-all hover:scale-105"
                      title="Edit media details (alt text, thumbnail)"
                      aria-label="Edit media details"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(index)}
                      className="w-7 h-7 rounded-full bg-slate-900/80 hover:bg-status-danger-accent text-white text-xs flex items-center justify-center shadow-xs cursor-pointer transition-all hover:scale-105"
                      title="Delete media"
                      aria-label="Delete media"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Drag Grip Handle */}
                  <div
                    className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px] font-mono flex items-center gap-1 opacity-90 cursor-grab active:cursor-grabbing backdrop-blur-xs"
                    title="Drag to reorder"
                  >
                    <span>⋮⋮</span>
                    <span>#{index + 1}</span>
                  </div>
                </div>

                {/* Card Footer: Alt Text & Accessible Reorder Controls */}
                <div className="p-2.5 bg-bg-surface border-t border-border-default flex items-center justify-between gap-2 text-xs">
                  <div className="truncate flex-1" title={item.alt_text || 'No alt text'}>
                    <span className="text-[11px] text-text-tertiary block truncate">
                      {item.alt_text ? item.alt_text : <span className="italic text-text-tertiary">No description</span>}
                    </span>
                  </div>

                  {/* Accessible Move Left / Right Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={disabled || index === 0}
                      onClick={() => handleMove(index, 'left')}
                      className="w-6 h-6 rounded-md border border-border-default bg-bg-surface hover:bg-bg-subtle disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                      title="Move media earlier in order"
                      aria-label={`Move media item ${index + 1} earlier`}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index === media.length - 1}
                      onClick={() => handleMove(index, 'right')}
                      className="w-6 h-6 rounded-md border border-border-default bg-bg-surface hover:bg-bg-subtle disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                      title="Move media later in order"
                      aria-label={`Move media item ${index + 1} later`}
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden Thumbnail Input for Editing */}
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        onChange={handleThumbnailUpload}
        className="hidden"
        id="admin-upload-thumbnail-input"
      />

      {/* Video Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.alt_text || 'Video Preview'}
          description="In-admin video playback preview"
          size="lg"
          primaryAction={{
            label: 'Close Preview',
            onClick: () => setPreviewItem(null),
          }}
        >
          <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[480px]">
            <video
              src={previewItem.storage_path}
              poster={previewItem.thumbnail_path || undefined}
              muted
              playsInline
              controls
              autoPlay={false}
              className="max-h-[480px] w-full object-contain"
            />
          </div>
          {previewItem.thumbnail_path && (
            <p className="text-xs text-text-tertiary">
              Showing with custom poster: <span className="font-mono text-[10px]">{previewItem.thumbnail_path}</span>
            </p>
          )}
        </Modal>
      )}

      {/* Edit Media Metadata Modal */}
      {editingItem && editingItemIndex !== null && (
        <Modal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItemIndex(null)}
          title={`Edit ${editingItem.type === 'video' ? 'Video' : 'Image'} Details`}
          description={`Configure accessibility text${editingItem.type === 'video' ? ' and poster thumbnail' : ''} for item #${editingItemIndex + 1}.`}
          size="md"
          primaryAction={{
            label: 'Save Changes',
            onClick: saveEditModal,
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setEditingItemIndex(null),
          }}
        >
          <div className="space-y-4 text-xs">
            {/* Alt Text Input */}
            <div className="space-y-1.5">
              <label htmlFor="media-alt-input" className="font-semibold text-text-primary block">
                {editingItem.type === 'video' ? 'Accessible Video Description' : 'Image Alt Text'}
              </label>
              <TextInput
                id="media-alt-input"
                value={editingAltText}
                onChange={(e) => setEditingAltText(e.target.value)}
                placeholder={
                  editingItem.type === 'video'
                    ? 'Short description of video content for screen readers'
                    : 'Descriptive alt text for SEO and screen readers'
                }
              />
              <p className="text-[11px] text-text-tertiary">
                {editingItem.type === 'video'
                  ? 'Describes the video action or scene for visually impaired users.'
                  : 'Important for accessibility and Google image search ranking.'}
              </p>
            </div>

            {/* Video Thumbnail Management (Videos only) */}
            {editingItem.type === 'video' && (
              <div className="space-y-2 border-t border-border-default pt-3">
                <label className="font-semibold text-text-primary block">Video Poster Thumbnail</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-border-default overflow-hidden flex items-center justify-center shrink-0">
                    {editingItem.thumbnail_path ? (
                      <img
                        src={editingItem.thumbnail_path}
                        alt="Poster"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl text-slate-400">🖼️</span>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <p className="text-[11px] text-text-secondary">
                      {editingItem.thumbnail_path
                        ? 'Custom poster thumbnail is active.'
                        : 'No thumbnail set. The storefront falls back to video playback.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={isCapturingFrame}
                        disabled={isCapturingFrame || uploadingType === 'thumbnail'}
                        onClick={() => handleAutoCapturePoster(editingItemIndex)}
                        title="Auto-extract high quality poster frame from video"
                      >
                        ⚡ Capture Frame
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={uploadingType === 'thumbnail'}
                        disabled={isCapturingFrame || uploadingType === 'thumbnail'}
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        {editingItem.thumbnail_path ? 'Upload Custom' : '+ Upload Custom'}
                      </Button>
                      {editingItem.thumbnail_path && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isCapturingFrame || uploadingType === 'thumbnail'}
                          onClick={() => handleRemoveThumbnail(editingItemIndex)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && deletingIndex !== null && (
        <Modal
          isOpen={Boolean(deletingItem)}
          onClose={() => !isDeleting && setDeletingIndex(null)}
          title="Delete Media Item?"
          description={`Are you sure you want to remove this ${deletingItem.type}? This will delete the record and its storage files.`}
          size="sm"
          primaryAction={{
            label: isDeleting ? 'Deleting...' : 'Yes, Delete',
            onClick: executeDelete,
            loading: isDeleting,
            variant: 'primary',
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setDeletingIndex(null),
            disabled: isDeleting,
          }}
        >
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-bg-subtle border border-border-default">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0">
              {deletingItem.type === 'video' ? (
                deletingItem.thumbnail_path ? (
                  <img
                    src={deletingItem.thumbnail_path}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white text-xs">
                    ▶
                  </div>
                )
              ) : (
                <img
                  src={deletingItem.storage_path}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="truncate text-xs">
              <span className="font-bold text-text-primary block capitalize">
                {deletingItem.type} (#{deletingIndex + 1})
              </span>
              <span className="text-[11px] text-text-tertiary truncate block">
                {deletingItem.alt_text || deletingItem.storage_path}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
