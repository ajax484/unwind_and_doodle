import { describe, it, expect } from 'vitest';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  isAllowedVideoMimeType,
  isAllowedImageMimeType,
  MAX_VIDEO_FILE_SIZE,
  MAX_IMAGE_FILE_SIZE,
} from '@/lib/product-media-storage';

describe('Admin Product Media Upload & Storage Verification', () => {
  describe('1. File Type and Extension Validations', () => {
    it('accepts standard video MIME types', () => {
      expect(isAllowedVideoMimeType('video/mp4')).toBe(true);
      expect(isAllowedVideoMimeType('video/webm')).toBe(true);
      expect(isAllowedVideoMimeType('video/quicktime')).toBe(true);
      expect(isAllowedVideoMimeType('video/x-m4v')).toBe(true);
    });

    it('accepts video files by filename extension when MIME type is missing or generic', () => {
      expect(isAllowedVideoMimeType('', 'promo-video.mp4')).toBe(true);
      expect(isAllowedVideoMimeType('application/octet-stream', 'demo.webm')).toBe(true);
      expect(isAllowedVideoMimeType('', 'clip.mov')).toBe(true);
      expect(isAllowedVideoMimeType('', 'flipthrough.m4v')).toBe(true);
    });

    it('rejects unsupported video types and extensions', () => {
      expect(isAllowedVideoMimeType('video/x-flv', 'clip.flv')).toBe(false);
      expect(isAllowedVideoMimeType('text/plain', 'notes.txt')).toBe(false);
    });

    it('accepts standard image MIME types and filename extensions', () => {
      expect(isAllowedImageMimeType('image/jpeg')).toBe(true);
      expect(isAllowedImageMimeType('image/png')).toBe(true);
      expect(isAllowedImageMimeType('', 'cover.jpg')).toBe(true);
      expect(isAllowedImageMimeType('', 'photo.webp')).toBe(true);
    });
  });

  describe('2. Supabase Storage Bucket Limits', () => {
    it('verifies products bucket supports up to 100MB video uploads', async () => {
      const supabase = getServiceSupabaseClient();

      const { data: bucket, error } = await supabase.storage.getBucket('products');
      expect(error).toBeNull();
      expect(bucket).toBeDefined();
      expect(bucket?.file_size_limit).toBeGreaterThanOrEqual(104857600); // 100MB
    });

    it('successfully uploads and cleans up a test video file in products bucket', async () => {
      const supabase = getServiceSupabaseClient();
      const testKey = `test/verify-video-${Date.now()}.mp4`;
      const testBuffer = Buffer.from('test video content binary');

      const uploadRes = await supabase.storage.from('products').upload(testKey, testBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

      expect(uploadRes.error).toBeNull();
      expect(uploadRes.data?.path).toBe(testKey);

      // Clean up
      const removeRes = await supabase.storage.from('products').remove([testKey]);
      expect(removeRes.error).toBeNull();
    });
  });
});
