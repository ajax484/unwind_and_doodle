import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductCard, { resolveProductCardMedia } from '@/components/ProductCard';
import { ProductMedia } from '@/types/product-media';

describe('ProductCard Hover Video Playback & Media Selection', () => {
  const baseProps = {
    id: 'prod-flora',
    name: 'Flora & Fauna Coloring Book',
    slug: 'flora-fauna-coloring-book',
    price: 1500,
    primaryImage: 'https://images.example.com/flora-cover.jpg',
    isAvailable: true,
  };

  const sampleMixedMedia: ProductMedia[] = [
    {
      id: 'm-img-1',
      productId: 'prod-flora',
      type: 'image',
      storagePath: 'https://images.example.com/flora-cover.jpg',
      thumbnailPath: null,
      altText: 'Cover image',
      sortOrder: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'm-img-2',
      productId: 'prod-flora',
      type: 'image',
      storagePath: 'https://images.example.com/flora-page-1.jpg',
      thumbnailPath: null,
      altText: 'Page 1 illustration',
      sortOrder: 1,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'm-vid-1',
      productId: 'prod-flora',
      type: 'video',
      storagePath: 'https://videos.example.com/flora-preview.mp4',
      thumbnailPath: 'https://images.example.com/flora-thumb.jpg',
      altText: 'Flipthrough video preview',
      sortOrder: 2,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'm-img-3',
      productId: 'prod-flora',
      type: 'image',
      storagePath: 'https://images.example.com/flora-page-2.jpg',
      thumbnailPath: null,
      altText: 'Page 2 illustration',
      sortOrder: 3,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
  ];

  describe('1. Media Resolution Logic', () => {
    it('identifies the first video regardless of its sort_order or index in media list', () => {
      const result = resolveProductCardMedia(baseProps.primaryImage, sampleMixedMedia);
      expect(result.firstVideoMedia).toBeDefined();
      expect(result.firstVideoMedia?.type).toBe('video');
      expect(result.firstVideoMedia?.id).toBe('m-vid-1');
      expect(result.videoUrl).toBe('https://videos.example.com/flora-preview.mp4');
      expect(result.videoPoster).toBe('https://images.example.com/flora-thumb.jpg');
      expect(result.defaultImage).toBe('https://images.example.com/flora-cover.jpg');
    });

    it('returns null videoUrl when product has only images', () => {
      const onlyImages: ProductMedia[] = [
        {
          id: 'm-img-1',
          productId: 'prod-flora',
          type: 'image',
          storagePath: 'https://images.example.com/flora-cover.jpg',
          thumbnailPath: null,
          altText: 'Cover image',
          sortOrder: 0,
          createdAt: '2026-08-01T10:00:00Z',
          updatedAt: '2026-08-01T10:00:00Z',
        },
      ];

      const result = resolveProductCardMedia(baseProps.primaryImage, onlyImages);
      expect(result.firstVideoMedia).toBeUndefined();
      expect(result.videoUrl).toBeNull();
      expect(result.videoPoster).toBeNull();
      expect(result.defaultImage).toBe('https://images.example.com/flora-cover.jpg');
    });

    it('honors direct hoverVideoUrl override when provided', () => {
      const overrideUrl = 'https://videos.example.com/direct-override.mp4';
      const result = resolveProductCardMedia(
        baseProps.primaryImage,
        sampleMixedMedia,
        overrideUrl
      );
      expect(result.videoUrl).toBe(overrideUrl);
    });
  });

  describe('2. Rendering & Layering Structure', () => {
    it('renders image as base layer and does not render video when no video exists', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductCard, {
          ...baseProps,
          media: [
            {
              id: 'm-img-1',
              productId: 'prod-flora',
              type: 'image',
              storagePath: 'https://images.example.com/flora-cover.jpg',
              thumbnailPath: null,
              altText: 'Cover image',
              sortOrder: 0,
              createdAt: '2026-08-01T10:00:00Z',
              updatedAt: '2026-08-01T10:00:00Z',
            },
          ],
        })
      );

      expect(html).toContain('img src="https://images.example.com/flora-cover.jpg"');
      expect(html).not.toContain('<video');
    });

    it('renders product link with proper slug and accessibility attributes', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductCard, {
          ...baseProps,
          media: sampleMixedMedia,
        })
      );

      expect(html).toContain('href="/products/flora-fauna-coloring-book"');
      expect(html).toContain('Flora &amp; Fauna Coloring Book');
    });

    it('preserves Bundle variant badges and pricing with video present', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductCard, {
          ...baseProps,
          productType: 'bundle',
          bundleComponentsCount: 3,
          media: sampleMixedMedia,
        })
      );

      expect(html).toContain('Bundle • 3 Items');
      expect(html).toContain('View bundle');
    });

    it('preserves Customization variant badge with video present', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductCard, {
          ...baseProps,
          productType: 'custom',
          requiresCustomization: true,
          media: sampleMixedMedia,
        })
      );

      expect(html).toContain('Custom Photo');
      expect(html).toContain('Customize');
    });

    it('preserves Out of Stock badge and disabled action with video present', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductCard, {
          ...baseProps,
          isAvailable: false,
          media: sampleMixedMedia,
        })
      );

      expect(html).toContain('Out of Stock');
      expect(html).toContain('Out of stock');
    });
  });
});
