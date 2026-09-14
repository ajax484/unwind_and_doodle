import crypto from 'crypto';

export const PRODUCT_STORAGE_BUCKET = 'products';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/m4v',
  'video/ogg',
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v', 'ogv'] as const;

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export type ProductMediaFolder = 'images' | 'videos' | 'thumbnails';

export function isAllowedImageMimeType(mimeType: string, filename?: string): boolean {
  if (mimeType && (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return true;
  }
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext as any) : false;
  }
  return false;
}

export function isAllowedVideoMimeType(mimeType: string, filename?: string): boolean {
  if (mimeType && (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return true;
  }
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext as any) : false;
  }
  return false;
}

export function getExtensionFromMime(mimeType: string, defaultExt = 'bin'): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
    'video/m4v': 'm4v',
    'video/ogg': 'ogv',
  };
  return map[mimeType] || defaultExt;
}

/**
 * Builds a standardized product media storage path adhering to:
 * products/{productId}/images/{timestamp}_{random}.{ext}
 * products/{productId}/videos/{timestamp}_{random}.{ext}
 * products/{productId}/thumbnails/{timestamp}_{random}.{ext}
 */
export function buildProductMediaPath(
  productId: string,
  folder: ProductMediaFolder,
  originalFilename?: string,
  mimeType?: string
): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  let ext = '';

  if (mimeType) {
    ext = getExtensionFromMime(mimeType);
  } else if (originalFilename && originalFilename.includes('.')) {
    ext = originalFilename.split('.').pop()?.toLowerCase() || 'bin';
  } else {
    ext = folder === 'videos' ? 'mp4' : 'png';
  }

  return `products/${productId}/${folder}/${timestamp}_${randomSuffix}.${ext}`;
}
