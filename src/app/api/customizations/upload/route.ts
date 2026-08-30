import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file format: ${file.type}. Allowed formats: JPEG, PNG, WebP`,
        },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds 5MB limit. Uploaded size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const fileExt = file.name.split('.').pop() || 'png';
    const uniqueFileName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${fileExt}`;
    const storagePath = `uploads/${uniqueFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Attempt to upload to Supabase Storage 'customizations' bucket
    let assetUrl: string;
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('customizations')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      // Fallback: If bucket doesn't exist yet, construct data URL or local asset reference
      const base64 = buffer.toString('base64');
      assetUrl = `data:${file.type};base64,${base64}`;
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('customizations')
        .getPublicUrl(uploadData.path);
      assetUrl = publicUrlData.publicUrl;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          assetUrl,
          fileName: file.name,
          fileType: file.type,
          size: file.size,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error uploading customization image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
