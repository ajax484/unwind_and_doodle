import { describe, it, expect, vi } from 'vitest';
import { compressImageBeforeUpload } from '@/lib/image-compress';

describe('Client-Side Image Compression & Downscaling', () => {
  it('passes non-image files through unchanged', async () => {
    const textFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const result = await compressImageBeforeUpload(textFile);
    expect(result).toBe(textFile);
  });

  it('passes small files (<400KB) through unchanged without overhead', async () => {
    const smallFile = new File([new Uint8Array(100 * 1024)], 'small.jpg', { type: 'image/jpeg' });
    const result = await compressImageBeforeUpload(smallFile);
    expect(result).toBe(smallFile);
  });

  it('passes SVG or GIF images through unchanged to preserve vector/animation', async () => {
    const svgFile = new File([new Uint8Array(500 * 1024)], 'vector.svg', { type: 'image/svg+xml' });
    const resultSvg = await compressImageBeforeUpload(svgFile);
    expect(resultSvg).toBe(svgFile);

    const gifFile = new File([new Uint8Array(500 * 1024)], 'animation.gif', { type: 'image/gif' });
    const resultGif = await compressImageBeforeUpload(gifFile);
    expect(resultGif).toBe(gifFile);
  });
});
