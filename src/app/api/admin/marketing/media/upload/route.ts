import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  MARKETING_STORAGE_BUCKET,
  FALLBACK_STORAGE_BUCKET,
  MAX_MARKETING_IMAGE_FILE_SIZE,
  isAllowedMarketingImage,
  buildMarketingMediaPath,
} from '@/lib/marketing-media-storage';
import { MediaAsset } from '@/types/marketing-builder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);
    const organizationId = adminContext.organization.id;

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;

    const fileList: File[] = [];
    if (singleFile) fileList.push(singleFile);
    if (files && files.length > 0) {
      for (const f of files) {
        if (!fileList.some((existing) => existing.name === f.name && existing.size === f.size)) {
          fileList.push(f);
        }
      }
    }

    if (fileList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No image file provided for upload.' },
        { status: 400 }
      );
    }

    const uploadedAssets: MediaAsset[] = [];
    const errors: string[] = [];

    // Ensure bucket exists
    let bucketToUse = MARKETING_STORAGE_BUCKET;
    try {
      const { error: bucketErr } = await supabase.storage.getBucket(MARKETING_STORAGE_BUCKET);
      if (bucketErr) {
        // Try creating marketing bucket
        const { error: createErr } = await supabase.storage.createBucket(MARKETING_STORAGE_BUCKET, {
          public: true,
          fileSizeLimit: 104857600,
        });
        if (createErr) {
          bucketToUse = FALLBACK_STORAGE_BUCKET;
        }
      }
    } catch {
      bucketToUse = FALLBACK_STORAGE_BUCKET;
    }

    for (const file of fileList) {
      // 1. Validation
      if (!isAllowedMarketingImage(file.type, file.name)) {
        errors.push(`${file.name}: Unsupported image format. Allowed: JPG, PNG, WEBP, GIF, SVG.`);
        continue;
      }

      if (file.size > MAX_MARKETING_IMAGE_FILE_SIZE) {
        errors.push(
          `${file.name}: File size exceeds ${MAX_MARKETING_IMAGE_FILE_SIZE / (1024 * 1024)}MB limit.`
        );
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const storagePath = buildMarketingMediaPath(organizationId, file.name, file.type);

      // 2. Upload to storage
      let { error: uploadError } = await supabase.storage
        .from(bucketToUse)
        .upload(storagePath, buffer, {
          contentType: file.type || 'image/png',
          cacheControl: '31536000, public, immutable',
          upsert: true,
        });

      if (uploadError && bucketToUse !== FALLBACK_STORAGE_BUCKET) {
        bucketToUse = FALLBACK_STORAGE_BUCKET;
        const retry = await supabase.storage
          .from(bucketToUse)
          .upload(storagePath, buffer, {
            contentType: file.type || 'image/png',
            cacheControl: '31536000, public, immutable',
            upsert: true,
          });
        uploadError = retry.error;
      }

      if (uploadError) {
        errors.push(`${file.name}: Upload failed (${uploadError.message}).`);
        continue;
      }

      // 3. Resolve public URL
      let publicUrl = storagePath;
      const { data } = supabase.storage.from(bucketToUse).getPublicUrl(storagePath);
      if (data?.publicUrl) {
        publicUrl = data.publicUrl;
      }

      const altText = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      const mediaAsset: MediaAsset = {
        id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        url: publicUrl,
        filename: file.name,
        altText,
        size: file.size,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      };

      uploadedAssets.push(mediaAsset);
    }

    if (uploadedAssets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors.join(' ') || 'Failed to upload images.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: uploadedAssets.length === 1 ? uploadedAssets[0] : uploadedAssets,
        assets: uploadedAssets,
        warnings: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error uploading marketing media';
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
