import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  MARKETING_STORAGE_BUCKET,
  FALLBACK_STORAGE_BUCKET,
} from '@/lib/marketing-media-storage';
import { MediaAsset } from '@/types/marketing-builder';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);
    const organizationId = adminContext.organization.id;

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();

    const mediaList: MediaAsset[] = [];

    const searchFolders = [
      { bucket: MARKETING_STORAGE_BUCKET, path: `marketing/${organizationId}/images` },
      { bucket: FALLBACK_STORAGE_BUCKET, path: `marketing/${organizationId}/images` },
    ];

    for (const folder of searchFolders) {
      try {
        const { data: files, error } = await supabase.storage
          .from(folder.bucket)
          .list(folder.path, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (!error && Array.isArray(files)) {
          for (const f of files) {
            if (!f.name || f.name === '.emptyFolderPlaceholder') continue;

            const fullStoragePath = `${folder.path}/${f.name}`;
            const { data: urlData } = supabase.storage
              .from(folder.bucket)
              .getPublicUrl(fullStoragePath);

            const filename = f.name.replace(/^[\d_]+/, '');
            const altText = filename
              .replace(/\.[^/.]+$/, '')
              .replace(/[-_]+/g, ' ')
              .trim();

            if (
              !search ||
              filename.toLowerCase().includes(search) ||
              altText.toLowerCase().includes(search)
            ) {
              mediaList.push({
                id: `med_${f.id || f.name}`,
                url: urlData?.publicUrl || fullStoragePath,
                filename,
                altText,
                size: (f.metadata as any)?.size || undefined,
                mimeType: (f.metadata as any)?.mimetype || 'image/png',
                createdAt: f.created_at || new Date().toISOString(),
              });
            }
          }
        }
      } catch {
        // Ignore folder list errors and continue
      }
    }

    // Deduplicate by URL
    const unique = Array.from(new Map(mediaList.map((m) => [m.url, m])).values());

    return NextResponse.json({ success: true, data: unique }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching media assets';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);
    const organizationId = adminContext.organization.id;

    const body = await req.json();
    const urls: string[] = Array.isArray(body?.urls)
      ? body.urls
      : body?.url
      ? [body.url]
      : [];

    if (urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No media URLs provided to delete' },
        { status: 400 }
      );
    }

    const deletedPaths: string[] = [];

    for (const rawUrl of urls) {
      // Extract storage path
      let cleanPath = rawUrl;
      const marker1 = `/storage/v1/object/public/${MARKETING_STORAGE_BUCKET}/`;
      const marker2 = `/storage/v1/object/public/${FALLBACK_STORAGE_BUCKET}/`;

      let bucket = MARKETING_STORAGE_BUCKET;
      if (rawUrl.includes(marker1)) {
        cleanPath = rawUrl.substring(rawUrl.indexOf(marker1) + marker1.length);
        bucket = MARKETING_STORAGE_BUCKET;
      } else if (rawUrl.includes(marker2)) {
        cleanPath = rawUrl.substring(rawUrl.indexOf(marker2) + marker2.length);
        bucket = FALLBACK_STORAGE_BUCKET;
      }

      // Security check: ensure path belongs to organization
      if (cleanPath.includes(`marketing/${organizationId}/`)) {
        await supabase.storage.from(bucket).remove([cleanPath]);
        deletedPaths.push(cleanPath);
      }
    }

    return NextResponse.json({ success: true, deleted: deletedPaths }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting media';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
