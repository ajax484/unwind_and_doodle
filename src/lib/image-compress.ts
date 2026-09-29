/**
 * Checks whether an image URL points to Supabase Storage or an authorized image CDN.
 * Non-CDN hosts, test URLs, or local assets return false so Next.js sets unoptimized=true
 * without throwing hostname validation errors.
 */
export function isOptimizableImageUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith('data:') || url.startsWith('/') || url.startsWith('blob:')) {
    return false;
  }
  // During tests, keep unoptimized to avoid unconfigured host exceptions on mock URLs
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('supabase.co') || parsed.hostname === 'images.unsplash.com';
  } catch {
    return false;
  }
}

/**
 * Client-side image compression and downscaling utility.
 * Downscales large camera photos to a sensible max resolution (e.g. 1600px)
 * and compresses them before uploading, reducing 5-12MB phone photos to ~300-600KB.
 */
export async function compressImageBeforeUpload(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<File> {
  // Only compress raster image files (JPEG, PNG, WebP)
  if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    return file;
  }

  // If already under 400KB, no need to compress further
  if (file.size < 400 * 1024) {
    return file;
  }

  // Ensure browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      return resolve(file);
    }

    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;

        // If dimensions are within bounds and size is reasonable, keep original
        if (width <= maxDimension && height <= maxDimension && file.size < 1024 * 1024) {
          return resolve(file);
        }

        // Calculate proportional scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        // Use high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG format for optimal photo compression
        const outputMime = 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compression didn't produce a smaller result, keep original
              return resolve(file);
            }

            const newFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
            const compressedFile = new File([blob], newFileName, {
              type: outputMime,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
