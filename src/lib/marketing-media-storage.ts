import crypto from 'crypto';

export const MARKETING_STORAGE_BUCKET = 'marketing';
export const FALLBACK_STORAGE_BUCKET = 'products';

export const ALLOWED_MARKETING_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const;

export const ALLOWED_MARKETING_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'svg',
] as const;

export const MAX_MARKETING_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function isAllowedMarketingImage(mimeType: string, filename?: string): boolean {
  if (mimeType && (ALLOWED_MARKETING_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return true;
  }
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? (ALLOWED_MARKETING_IMAGE_EXTENSIONS as readonly string[]).includes(ext as any) : false;
  }
  return false;
}

export function buildMarketingMediaPath(
  organizationId: string,
  originalFilename?: string,
  mimeType?: string
): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  let ext = 'png';

  if (mimeType === 'image/svg+xml' || (originalFilename && originalFilename.endsWith('.svg'))) {
    ext = 'svg';
  } else if (mimeType === 'image/webp' || (originalFilename && originalFilename.endsWith('.webp'))) {
    ext = 'webp';
  } else if (mimeType === 'image/gif' || (originalFilename && originalFilename.endsWith('.gif'))) {
    ext = 'gif';
  } else if (mimeType === 'image/jpeg' || (originalFilename && (originalFilename.endsWith('.jpg') || originalFilename.endsWith('.jpeg')))) {
    ext = 'jpg';
  } else if (originalFilename && originalFilename.includes('.')) {
    ext = originalFilename.split('.').pop()?.toLowerCase() || 'png';
  }

  return `marketing/${organizationId}/images/${timestamp}_${randomSuffix}.${ext}`;
}
