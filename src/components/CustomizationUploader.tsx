'use client';

import React, { useState, useRef, forwardRef, useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import Button from './Button';
import Spinner from './Spinner';

/**
 * Root container variants for CustomizationUploader conforming to Figma 43:29976.
 */
export const customizationUploaderVariants = cva(
  'bg-bg-surface border border-border-default rounded-[24px] transition-all duration-150 flex flex-col',
  {
    variants: {
      size: {
        sm: 'p-[18px] gap-3',
        md: 'p-6 gap-4',
        lg: 'p-7 gap-5',
      },
      disabled: {
        true: 'opacity-70',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      disabled: false,
    },
  }
);

/**
 * Upload dropzone target variants for CustomizationUploader.
 */
export const dropzoneVariants = cva(
  'border-2 border-dashed rounded-[20px] text-center transition-all duration-150 flex flex-col items-center justify-center select-none w-full',
  {
    variants: {
      size: {
        sm: 'p-[18px] gap-2',
        md: 'p-6 gap-3',
        lg: 'p-[30px] gap-3',
      },
      state: {
        empty: 'bg-bg-subtle border-border-input hover:border-border-brand cursor-pointer',
        ready: 'bg-bg-brand border-border-brand cursor-pointer ring-2 ring-brand-blue/30',
        uploading: 'bg-bg-subtle border-border-input cursor-wait',
        uploaded: 'bg-bg-subtle border-border-input hover:border-border-brand cursor-pointer',
        error: 'bg-status-danger-bg border-status-danger-accent cursor-pointer',
        disabled: 'bg-bg-subtle border-border-input opacity-60 cursor-not-allowed',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'empty',
    },
  }
);

export type CustomizationUploaderSize = NonNullable<
  VariantProps<typeof customizationUploaderVariants>['size']
>;

export type CustomizationUploaderVisualState =
  | 'empty'
  | 'ready'
  | 'uploading'
  | 'uploaded'
  | 'error'
  | 'disabled';

export interface CustomizationData {
  /** Array of uploaded image URLs. */
  assetUrls: string[];
  /** Customer personalization dedication or special instructions. */
  notes: string;
}

export interface CustomizationUploaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof customizationUploaderVariants> {
  /** Callback fired when uploaded image assets or notes are updated. */
  onCustomizationChange?: (data: CustomizationData) => void;
  /** Component size variant ('sm' = 380px compact, 'md' = 460px standard, 'lg' = 540px large). */
  size?: CustomizationUploaderSize;
  /** Whether multi-file uploads are permitted (maps to Figma 'Allow Multiple Files'). */
  multiple?: boolean;
  /** Whether the additional notes textarea is rendered (maps to Figma 'Show Notes Field'). */
  showNotes?: boolean;
  /** Maximum number of files permitted when multiple is enabled (default 5). */
  maxFiles?: number;
  /** Maximum allowable single file size in bytes (default 10MB = 10 * 1024 * 1024). */
  maxSizeBytes?: number;
  /** Accessible heading label override. */
  label?: string;
  /** Supporting instruction copy below the header. */
  description?: string;
  /** Notes field section title. */
  notesLabel?: string;
  /** Notes field placeholder copy. */
  notesPlaceholder?: string;
  /** Initial uploaded URLs for pre-populated or edit flows. */
  initialUrls?: string[];
  /** Initial dedication notes text. */
  initialNotes?: string;
  /** Explicit visual state override for design system showcase or testing. */
  stateOverride?: CustomizationUploaderVisualState;
  /** Explicit upload progress percentage (0 - 100) for testing or fine-grained progress feedback. */
  uploadProgress?: number | null;
  /** Simulated upload mode for offline storybook testing (does not trigger network fetch). */
  simulatedUpload?: boolean;
  /** Whether component is disabled. */
  disabled?: boolean;
  /** Test identifier attribute. */
  'data-testid'?: string;
}

/**
 * CustomizationUploader
 *
 * Design-system photo & dedication customization molecule reconciling Figma
 * master component set `43:29976` and documentation frame `43:30904`.
 * Supports drag-and-drop dropzones, canonical Button and Spinner atoms,
 * thumbnail preview grids with accessible removal, and dedication notes.
 */
export const CustomizationUploader = forwardRef<HTMLDivElement, CustomizationUploaderProps>(
  (
    {
      onCustomizationChange,
      size = 'md',
      multiple = true,
      showNotes = true,
      maxFiles = 5,
      maxSizeBytes = 10 * 1024 * 1024,
      label,
      description = "Add images you'd like us to use for your personalized product.",
      notesLabel = 'Additional notes',
      notesPlaceholder = "Tell us anything you'd like us to know about your images...",
      initialUrls = [],
      initialNotes = '',
      stateOverride,
      uploadProgress: controlledProgress,
      simulatedUpload = false,
      disabled = false,
      className,
      'data-testid': testId = 'customization-uploader',
      ...rest
    },
    ref
  ) => {
    const uniqueId = useId();
    const fileInputId = `file-upload-${uniqueId}`;
    const notesInputId = `notes-input-${uniqueId}`;

    const [uploadedUrls, setUploadedUrls] = useState<string[]>(initialUrls);
    const [notes, setNotes] = useState<string>(initialNotes);
    const [uploading, setUploading] = useState<boolean>(false);
    const [progressPercent, setProgressPercent] = useState<number>(60);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Compute effective visual state
    const effectiveState: CustomizationUploaderVisualState = stateOverride
      ? stateOverride
      : disabled
      ? 'disabled'
      : uploading || controlledProgress !== undefined && controlledProgress !== null
      ? 'uploading'
      : error
      ? 'error'
      : isDragging
      ? 'ready'
      : uploadedUrls.length > 0
      ? 'uploaded'
      : 'empty';

    // Active progress value
    const activeProgress =
      controlledProgress !== undefined && controlledProgress !== null
        ? controlledProgress
        : progressPercent;

    const defaultHeaderLabel = multiple ? 'Upload your images' : 'Upload an image';
    const headerTitle = label || defaultHeaderLabel;

    const processFiles = async (fileList: FileList | File[]) => {
      if (disabled) return;
      setError(null);

      const files = Array.from(fileList);
      if (files.length === 0) return;

      // Check max count limit
      const currentCount = uploadedUrls.length;
      if (!multiple && (currentCount >= 1 || files.length > 1)) {
        if (currentCount >= 1 && files.length === 1) {
          // In single mode, uploading a new file replaces the existing one
        } else if (files.length > 1) {
          setError('Only a single image is permitted for this item');
          return;
        }
      } else if (multiple && currentCount + files.length > maxFiles) {
        setError(`You can only upload up to ${maxFiles} images in total`);
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

      for (const file of files) {
        if (file.size > maxSizeBytes) {
          setError(`File "${file.name}" exceeds the maximum 10MB limit`);
          return;
        }
        if (!validTypes.includes(file.type.toLowerCase())) {
          setError('Please upload a PNG, JPG, or WEBP image');
          return;
        }
      }

      // If simulated upload (for Storybook or offline testing)
      if (simulatedUpload) {
        setUploading(true);
        setProgressPercent(30);
        await new Promise((r) => setTimeout(r, 200));
        setProgressPercent(60);
        await new Promise((r) => setTimeout(r, 200));
        setProgressPercent(100);

        const newUrls = files.map((file, idx) =>
          URL.createObjectURL(file) || `https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80&idx=${Date.now()}-${idx}`
        );

        const updated = multiple ? [...uploadedUrls, ...newUrls] : newUrls;
        setUploadedUrls(updated);
        setUploading(false);
        onCustomizationChange?.({ assetUrls: updated, notes });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      try {
        setUploading(true);
        const newlyUploaded: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const pct = Math.round(((i + 1) / files.length) * 100);
          setProgressPercent(pct);

          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/customizations/upload', {
            method: 'POST',
            body: formData,
          });

          let json: Record<string, unknown>;
          const responseText = await res.text();
          try {
            json = JSON.parse(responseText);
          } catch {
            // Server returned non-JSON (e.g. 413 "Request Entity Too Large", gateway error)
            const hint =
              res.status === 413
                ? 'File exceeds server upload limit (10MB)'
                : `Server error (${res.status} ${res.statusText || 'Unknown'})`;
            throw new Error(`Upload failed: ${hint}`);
          }
          if (!res.ok || !json.success) {
            throw new Error((json.error as string) || `Failed to upload "${file.name}"`);
          }
          newlyUploaded.push((json.data as { assetUrl: string }).assetUrl);
        }

        const updated = multiple ? [...uploadedUrls, ...newlyUploaded] : newlyUploaded;
        setUploadedUrls(updated);
        onCustomizationChange?.({ assetUrls: updated, notes });
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
      if (e.target.files) {
        processFiles(e.target.files);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && effectiveState !== 'uploading') {
        setIsDragging(true);
      }
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || effectiveState === 'uploading') return;
      if (e.dataTransfer.files) {
        processFiles(e.dataTransfer.files);
      }
    };

    const handleRemoveImage = (indexToRemove: number) => {
      if (disabled) return;
      const updated = uploadedUrls.filter((_, idx) => idx !== indexToRemove);
      setUploadedUrls(updated);
      onCustomizationChange?.({ assetUrls: updated, notes });
      if (updated.length === 0 && error) {
        setError(null);
      }
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newNotes = e.target.value;
      setNotes(newNotes);
      onCustomizationChange?.({ assetUrls: uploadedUrls, notes: newNotes });
    };

    const triggerFileInput = () => {
      if (disabled || effectiveState === 'uploading') return;
      fileInputRef.current?.click();
    };

    return (
      <div
        ref={ref}
        data-testid={testId}
        className={cn(customizationUploaderVariants({ size, disabled }), className)}
        {...rest}
      >
        {/* Header Block */}
        <div className="flex flex-col gap-1">
          <h3 className="font-heading font-semibold text-base text-text-primary leading-snug">
            {headerTitle}
          </h3>
          {description && (
            <p className="font-body font-normal text-sm text-text-secondary leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Upload Area Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={effectiveState === 'uploading' ? undefined : triggerFileInput}
          className={cn(dropzoneVariants({ size, state: effectiveState }))}
          role="button"
          tabIndex={disabled || effectiveState === 'uploading' ? -1 : 0}
          aria-disabled={disabled}
          aria-label={
            effectiveState === 'uploaded'
              ? multiple
                ? 'Drop more images or click to add'
                : 'Drop replacement image or click to change'
              : 'Drop images here or click to choose files'
          }
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && effectiveState !== 'uploading') {
              e.preventDefault();
              triggerFileInput();
            }
          }}
        >
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            multiple={multiple}
            onChange={handleFileSelect}
            className="sr-only"
            disabled={disabled || effectiveState === 'uploading'}
            tabIndex={-1}
          />

          {/* Dynamic Dropzone Content based on lifecycle state */}
          {effectiveState === 'uploading' ? (
            <div className="flex flex-col items-center justify-center gap-3 w-full max-w-[360px] py-1">
              <Spinner size="md" color="rose" label="Uploading images..." />
              <p className="font-body font-normal text-base text-text-primary">
                {multiple ? 'Uploading your images...' : 'Uploading your image...'}
              </p>

              {/* Progress Track */}
              <div
                className="w-full h-2 bg-neutral-border-soft rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={activeProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
              >
                <div
                  className="h-full bg-action-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, activeProgress))}%` }}
                />
              </div>

              <p className="font-body font-medium text-xs text-text-tertiary">
                {multiple
                  ? `${Math.max(1, Math.round((activeProgress / 100) * (uploadedUrls.length || 5)))} of ${
                      uploadedUrls.length || 5
                    } images uploaded (${activeProgress}%)`
                  : `Uploading (${activeProgress}%)`}
              </p>
            </div>
          ) : (
            <>
              {/* Upload Icon Container (36x36 Circle) */}
              <div className="w-9 h-9 rounded-full bg-action-secondary-bg text-action-secondary-text flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>

              {/* Text Instructions Block */}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={cn(
                    'font-body text-base',
                    effectiveState === 'error'
                      ? 'text-status-danger-text font-medium'
                      : 'text-text-primary font-normal'
                  )}
                >
                  {effectiveState === 'ready'
                    ? multiple
                      ? 'Release to upload images'
                      : 'Release to upload image'
                    : effectiveState === 'uploaded'
                    ? multiple
                      ? 'Drop more images here'
                      : 'Drop replacement image here'
                    : effectiveState === 'error'
                    ? 'Upload encountered an issue'
                    : effectiveState === 'disabled'
                    ? 'Uploads currently unavailable'
                    : multiple
                    ? 'Drop your images here'
                    : 'Drop your image here'}
                </span>
                <span
                  className={cn(
                    'font-body font-medium text-xs',
                    effectiveState === 'error'
                      ? 'text-status-danger-text'
                      : 'text-text-tertiary'
                  )}
                >
                  {effectiveState === 'ready'
                    ? 'Staged and ready for transfer'
                    : effectiveState === 'disabled'
                    ? 'Customization is disabled for this item'
                    : 'PNG, JPG, or WEBP · Max 10MB each'}
                </span>
              </div>

              {/* Action Button (Canonical Button Atom) */}
              <Button
                type="button"
                variant="secondary"
                size={size === 'lg' ? 'md' : 'sm'}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileInput();
                }}
                className="pointer-events-auto"
              >
                {effectiveState === 'uploaded'
                  ? multiple
                    ? 'Add more'
                    : 'Replace image'
                  : effectiveState === 'error'
                  ? 'Try again'
                  : multiple
                  ? 'Choose images'
                  : 'Choose image'}
              </Button>
            </>
          )}
        </div>

        {/* Validation Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 sm:p-3.5 bg-status-danger-bg text-status-danger-text rounded-xl border border-status-danger-accent/30"
          >
            <span className="text-base shrink-0 select-none" aria-hidden="true">
              ⚠️
            </span>
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="font-body font-semibold">
                Some images couldn&apos;t be uploaded.
              </span>
              <span className="font-body font-medium opacity-90">{error}</span>
            </div>
          </div>
        )}

        {/* Uploaded Thumbnail Previews */}
        {uploadedUrls.length > 0 && (
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-body font-semibold text-sm text-text-primary">
                Uploaded photos
              </span>
              <span className="font-body font-medium text-xs text-text-secondary">
                {uploadedUrls.length} {multiple ? `/ ${maxFiles}` : ''} {uploadedUrls.length === 1 ? 'image' : 'images'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {uploadedUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="relative group w-20 h-20 rounded-[14px] overflow-hidden border border-border-input bg-bg-subtle shadow-xs shrink-0"
                >
                  <img
                    src={url}
                    alt={`Custom upload ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-neutral-charcoal/80 hover:bg-neutral-charcoal text-neutral-white flex items-center justify-center text-xs font-bold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-brand-blue/50"
                      aria-label={`Remove image ${idx + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes / Special Instructions Section */}
        {showNotes && (
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-2">
              <label
                htmlFor={notesInputId}
                className="font-body font-semibold text-sm text-text-primary"
              >
                {notesLabel}
              </label>
              <span className="font-body font-medium text-xs text-text-tertiary">
                Optional
              </span>
            </div>
            <textarea
              id={notesInputId}
              rows={2}
              value={notes}
              disabled={disabled}
              onChange={handleNotesChange}
              placeholder={notesPlaceholder}
              className="form-input text-xs sm:text-sm resize-y"
            />
          </div>
        )}
      </div>
    );
  }
);

CustomizationUploader.displayName = 'CustomizationUploader';

export default CustomizationUploader;
