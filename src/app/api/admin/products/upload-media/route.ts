import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  PRODUCT_STORAGE_BUCKET,
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  isAllowedImageMimeType,
  isAllowedVideoMimeType,
  buildProductMediaPath,
  ProductMediaFolder,
} from '@/lib/product-media-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const productId = (formData.get('productId') as string | null) || undefined;
    const isThumbnail = formData.get('isThumbnail') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No media file provided' },
        { status: 400 }
      );
    }

    let mediaType: 'image' | 'video' = 'image';
    let folder: ProductMediaFolder = 'images';

    if (isThumbnail) {
      if (!isAllowedImageMimeType(file.type, file.name)) {
        return NextResponse.json(
          { success: false, error: 'Thumbnail must be an image (JPG, PNG, WEBP, GIF)' },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `Thumbnail size exceeds limit of ${MAX_IMAGE_FILE_SIZE / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }
      folder = 'thumbnails';
      mediaType = 'image';
    } else if (isAllowedImageMimeType(file.type, file.name)) {
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `Image size exceeds limit of ${MAX_IMAGE_FILE_SIZE / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }
      folder = 'images';
      mediaType = 'image';
    } else if (isAllowedVideoMimeType(file.type, file.name)) {
      if (file.size > MAX_VIDEO_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `Video size exceeds limit of ${MAX_VIDEO_FILE_SIZE / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }
      folder = 'videos';
      mediaType = 'video';
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unsupported file type. Allowed formats: Images (JPG, PNG, WEBP, GIF) up to 10MB; Videos (MP4, WEBM, QuickTime) up to 100MB.',
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = buildProductMediaPath(
      productId || adminContext.organization.id,
      folder,
      file.name,
      file.type
    );

    // Upload to Supabase Storage bucket
    let { error: uploadError } = await supabase.storage
      .from(PRODUCT_STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || (folder === 'videos' ? 'video/mp4' : 'image/jpeg'),
        upsert: true,
      });

    // Auto-create or update bucket if missing or size limit exceeded
    if (uploadError) {
      if (
        uploadError.message.includes('not found') ||
        uploadError.message.includes('Bucket')
      ) {
        try {
          await supabase.storage.createBucket(PRODUCT_STORAGE_BUCKET, {
            public: true,
            fileSizeLimit: 104857600, // 100MB
          });

          const retry = await supabase.storage
            .from(PRODUCT_STORAGE_BUCKET)
            .upload(storagePath, buffer, {
              contentType: file.type || (folder === 'videos' ? 'video/mp4' : 'image/jpeg'),
              upsert: true,
            });
          uploadError = retry.error;
        } catch {
          // Continue fallback
        }
      } else if (
        uploadError.message.includes('exceeded the maximum allowed size') ||
        uploadError.message.includes('size limit')
      ) {
        try {
          await supabase.storage.updateBucket(PRODUCT_STORAGE_BUCKET, {
            public: true,
            fileSizeLimit: 104857600, // 100MB
          });

          const retry = await supabase.storage
            .from(PRODUCT_STORAGE_BUCKET)
            .upload(storagePath, buffer, {
              contentType: file.type || (folder === 'videos' ? 'video/mp4' : 'image/jpeg'),
              upsert: true,
            });
          uploadError = retry.error;
        } catch {
          // Continue fallback
        }
      }
    }

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Resolve public URL
    let publicUrl = storagePath;
    try {
      const { data } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(storagePath);
      if (data?.publicUrl) {
        publicUrl = data.publicUrl;
      }
    } catch {
      // Fallback
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          storagePath: publicUrl,
          rawStoragePath: storagePath,
          type: mediaType,
          altText: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '),
          size: file.size,
          folder,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error uploading media';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    await getAuthenticatedAdmin(req);

    const body = await req.json();
    const storagePaths: string[] = Array.isArray(body?.storagePaths) ? body.storagePaths : [];

    if (storagePaths.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No storage paths provided to delete' },
        { status: 400 }
      );
    }

    // Sanitize paths in case full URLs were passed
    const extractPath = (urlOrPath: string) => {
      const marker = `/storage/v1/object/public/${PRODUCT_STORAGE_BUCKET}/`;
      if (urlOrPath.includes(marker)) {
        return urlOrPath.substring(urlOrPath.indexOf(marker) + marker.length);
      }
      return urlOrPath;
    };

    const sanitizedPaths = storagePaths.map(extractPath);
    const { error: deleteError } = await supabase.storage
      .from(PRODUCT_STORAGE_BUCKET)
      .remove(sanitizedPaths);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `Failed to remove storage objects: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: sanitizedPaths }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting media files';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
