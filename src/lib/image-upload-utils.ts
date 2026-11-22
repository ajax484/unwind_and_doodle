export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
  skipBelowBytes?: number;
}

export interface CompressImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

/**
 * Resizes and compresses large raster images (JPEG/PNG/WEBP) client-side before upload
 * to prevent serverless HTTP 413 payload errors and improve upload reliability.
 * GIFs and already-small images are passed through untouched.
 */
export async function compressImageForUpload(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressImageResult> {
  const {
    maxDimension = 1800,
    quality = 0.85,
    skipBelowBytes = 350 * 1024,
  } = options;

  const originalSize = file.size;

  if (
    typeof window === 'undefined' ||
    file.type === 'image/gif' ||
    file.name.toLowerCase().endsWith('.gif') ||
    file.size <= skipBelowBytes
  ) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      try {
        let targetW = img.naturalWidth || img.width;
        let targetH = img.naturalHeight || img.height;

        if (targetW > maxDimension || targetH > maxDimension) {
          if (targetW >= targetH) {
            targetH = Math.round((targetH * maxDimension) / targetW);
            targetW = maxDimension;
          } else {
            targetW = Math.round((targetW * maxDimension) / targetH);
            targetH = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve({ file, originalSize, compressedSize: originalSize, wasCompressed: false });
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Prefer WebP for best compression; fallback to JPEG
        const tryEncode = (mimeType: string, ext: string, onFail?: () => void) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                if (onFail) {
                  onFail();
                } else {
                  cleanup();
                  resolve({ file, originalSize, compressedSize: originalSize, wasCompressed: false });
                }
                return;
              }
              cleanup();
              if (blob.size >= originalSize) {
                resolve({ file, originalSize, compressedSize: originalSize, wasCompressed: false });
                return;
              }
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              const optimizedFile = new File([blob], `${baseName}.${ext}`, { type: mimeType });
              resolve({
                file: optimizedFile,
                originalSize,
                compressedSize: optimizedFile.size,
                wasCompressed: true,
              });
            },
            mimeType,
            quality
          );
        };

        tryEncode('image/webp', 'webp', () => tryEncode('image/jpeg', 'jpg'));
      } catch {
        cleanup();
        resolve({ file, originalSize, compressedSize: originalSize, wasCompressed: false });
      }
    };

    img.onerror = () => {
      cleanup();
      resolve({ file, originalSize, compressedSize: originalSize, wasCompressed: false });
    };

    img.src = objectUrl;
  });
}

export interface UploadWithRetryOptions {
  onProgress?: (percent: number) => void;
  maxRetries?: number;
  timeoutMs?: number;
}

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export function isRetryableUploadStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status);
}

/**
 * Uploads FormData via XHR to expose real upload progress events, with automatic
 * exponential-backoff retries on transient network or 5xx errors.
 */
export async function uploadFormDataWithRetry<T = unknown>(
  url: string,
  buildFormData: () => FormData,
  options: UploadWithRetryOptions = {}
): Promise<T> {
  const { onProgress, maxRetries = 2, timeoutMs = 45000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.timeout = timeoutMs;

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable && onProgress) {
            const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
            onProgress(pct);
          }
        };

        xhr.onload = () => {
          const text = xhr.responseText || '';
          let json: { success?: boolean; error?: string; data?: T } | null = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            const err = new Error(
              xhr.status === 413
                ? 'File is too large for the server (HTTP 413). Try a smaller image.'
                : `Unexpected server response (HTTP ${xhr.status})`
            ) as Error & { status?: number };
            err.status = xhr.status;
            reject(err);
            return;
          }

          if (xhr.status >= 200 && xhr.status < 300 && json?.success && json.data !== undefined) {
            onProgress?.(100);
            resolve(json.data);
          } else {
            const err = new Error(json?.error || `Upload failed (HTTP ${xhr.status})`) as Error & {
              status?: number;
            };
            err.status = xhr.status;
            reject(err);
          }
        };

        xhr.onerror = () => {
          const err = new Error('Network error during upload') as Error & { retryable?: boolean };
          err.retryable = true;
          reject(err);
        };

        xhr.ontimeout = () => {
          const err = new Error('Upload timed out') as Error & { retryable?: boolean };
          err.retryable = true;
          reject(err);
        };

        xhr.send(buildFormData());
      });

      return result;
    } catch (err: unknown) {
      const typedErr = err as Error & { status?: number; retryable?: boolean };
      lastError = typedErr instanceof Error ? typedErr : new Error('Upload failed');
      const shouldRetry =
        attempt < maxRetries &&
        (typedErr.retryable || (typeof typedErr.status === 'number' && isRetryableUploadStatus(typedErr.status)));

      if (!shouldRetry) {
        throw lastError;
      }

      const backoffMs = 600 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError || new Error('Upload failed');
}
