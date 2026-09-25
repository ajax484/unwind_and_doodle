import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductImageGallery, {
  deriveGalleryMedia,
  GalleryItem,
} from '@/components/ProductImageGallery';
import { ProductMedia } from '@/types/product-media';

describe('ProductImageGallery: Video Promotion & Storefront Presentation', () => {
  const sampleMediaNoVideo: ProductMedia[] = [
    {
      id: 'm-img-1',
      productId: 'prod-mandala',
      type: 'image',
      storagePath: 'https://images.example.com/mandala-cover.jpg',
      thumbnailPath: null,
      altText: 'Mandala Cover',
      sortOrder: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'm-img-2',
      productId: 'prod-mandala',
      type: 'image',
      storagePath: 'https://images.example.com/mandala-spread.jpg',
      thumbnailPath: null,
      altText: 'Mandala Interior Spread',
      sortOrder: 1,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'm-img-3',
      productId: 'prod-mandala',
      type: 'image',
      storagePath: 'https://images.example.com/mandala-texture.jpg',
      thumbnailPath: null,
      altText: 'Mandala Paper Texture',
      sortOrder: 2,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
  ];

  const sampleMediaWithVideoAtPosition2: ProductMedia[] = [
    {
      id: 'm-img-1',
      productId: 'prod-mandala',
      type: 'image',
      storagePath: 'https://images.example.com/mandala-cover.jpg',
      thumbnailPath: null,
      altText: 'Mandala Cover',
      sortOrder: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'm-img-2',
      productId: 'prod-mandala',
      type: 'image',
      storagePath: 'https://images.example.com/mandala-spread.jpg',
      thumbnailPath: null,
      altText: 'Mandala Spread',
      sortOrder: 1,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'm-vid-1',
      productId: 'prod-mandala',
      type: 'video',
      storagePath: 'https://videos.example.com/mandala-flipthrough.mp4',
      thumbnailPath: 'https://images.example.com/mandala-video-poster.jpg',
      altText: 'Mandala Artist Flipthrough',
      sortOrder: 2,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'm-img-3',
      productId: 'prod-mandala',
      type: 'image',
      storagePath: 'https://images.example.com/mandala-detail.jpg',
      thumbnailPath: null,
      altText: 'Mandala Detail View',
      sortOrder: 3,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
  ];

  const sampleMediaMultipleVideos: ProductMedia[] = [
    {
      id: 'img-a',
      productId: 'prod-multi',
      type: 'image',
      storagePath: 'https://images.example.com/img-a.jpg',
      thumbnailPath: null,
      altText: 'Image A',
      sortOrder: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'vid-a',
      productId: 'prod-multi',
      type: 'video',
      storagePath: 'https://videos.example.com/vid-a.mp4',
      thumbnailPath: 'https://images.example.com/thumb-vid-a.jpg',
      altText: 'Video A',
      sortOrder: 1,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'img-b',
      productId: 'prod-multi',
      type: 'image',
      storagePath: 'https://images.example.com/img-b.jpg',
      thumbnailPath: null,
      altText: 'Image B',
      sortOrder: 2,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'vid-b',
      productId: 'prod-multi',
      type: 'video',
      storagePath: 'https://videos.example.com/vid-b.mp4',
      thumbnailPath: 'https://images.example.com/thumb-vid-b.jpg',
      altText: 'Video B',
      sortOrder: 3,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'img-c',
      productId: 'prod-multi',
      type: 'image',
      storagePath: 'https://images.example.com/img-c.jpg',
      thumbnailPath: null,
      altText: 'Image C',
      sortOrder: 4,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
  ];

  describe('1. deriveGalleryMedia Ordering Logic', () => {
    it('preserves exact order for products without video', () => {
      const items = deriveGalleryMedia(sampleMediaNoVideo, undefined, 'Mandala Book');
      expect(items.length).toBe(3);
      expect(items.map((i) => i.id)).toEqual(['m-img-1', 'm-img-2', 'm-img-3']);
      expect(items.every((i) => i.type === 'image')).toBe(true);
    });

    it('promotes the first video to index 0 when video is at index 2 in database sort_order', () => {
      const items = deriveGalleryMedia(
        sampleMediaWithVideoAtPosition2,
        undefined,
        'Mandala Book'
      );
      expect(items.length).toBe(4);
      // Video must be first
      expect(items[0].id).toBe('m-vid-1');
      expect(items[0].type).toBe('video');
      expect(items[0].url).toBe('https://videos.example.com/mandala-flipthrough.mp4');
      expect(items[0].posterUrl).toBe('https://images.example.com/mandala-video-poster.jpg');

      // Remaining items follow in relative order
      expect(items[1].id).toBe('m-img-1');
      expect(items[2].id).toBe('m-img-2');
      expect(items[3].id).toBe('m-img-3');
    });

    it('promotes ONLY the first video and preserves remaining items in order when multiple videos exist', () => {
      // Database: img-a (0), vid-a (1), img-b (2), vid-b (3), img-c (4)
      // Display:  vid-a, img-a, img-b, vid-b, img-c
      const items = deriveGalleryMedia(sampleMediaMultipleVideos, undefined, 'Multi Media');
      expect(items.length).toBe(5);
      expect(items.map((i) => i.id)).toEqual(['vid-a', 'img-a', 'img-b', 'vid-b', 'img-c']);
      expect(items[0].type).toBe('video');
      expect(items[1].type).toBe('image');
      expect(items[2].type).toBe('image');
      expect(items[3].type).toBe('video');
      expect(items[4].type).toBe('image');
    });

    it('leaves video at index 0 when video is already at index 0', () => {
      const videoAlreadyFirst: ProductMedia[] = [
        {
          id: 'vid-first',
          productId: 'prod-p',
          type: 'video',
          storagePath: 'https://videos.example.com/first.mp4',
          thumbnailPath: null,
          altText: 'First video',
          sortOrder: 0,
          createdAt: '2026-08-01T10:00:00Z',
          updatedAt: '2026-08-01T10:00:00Z',
        },
        {
          id: 'img-second',
          productId: 'prod-p',
          type: 'image',
          storagePath: 'https://images.example.com/second.jpg',
          thumbnailPath: null,
          altText: 'Second image',
          sortOrder: 1,
          createdAt: '2026-08-01T10:00:00Z',
          updatedAt: '2026-08-01T10:00:00Z',
        },
      ];

      const items = deriveGalleryMedia(videoAlreadyFirst, undefined, 'Test Product');
      expect(items.map((i) => i.id)).toEqual(['vid-first', 'img-second']);
    });

    it('falls back to legacy images array when media is undefined or empty', () => {
      const fallback = [
        'https://images.example.com/fallback-1.jpg',
        'https://images.example.com/fallback-2.jpg',
      ];
      const items = deriveGalleryMedia(undefined, fallback, 'Fallback Book');
      expect(items.length).toBe(2);
      expect(items[0].url).toBe('https://images.example.com/fallback-1.jpg');
      expect(items[0].type).toBe('image');
      expect(items[1].url).toBe('https://images.example.com/fallback-2.jpg');
    });

    it('returns empty array when neither media nor images are provided', () => {
      const items = deriveGalleryMedia(undefined, undefined, 'Empty');
      expect(items).toEqual([]);
    });
  });

  describe('2. Component Rendering & Video Viewer', () => {
    it('renders a native <video> element with muted, playsInline, controls, and poster for product with video', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductImageGallery, {
          media: sampleMediaWithVideoAtPosition2,
          productName: 'Mandala Book',
          selectedIndex: 0, // Video is at index 0
        })
      );

      // Verify video element in main viewport
      expect(html).toContain('<video');
      expect(html).toContain('data-testid="product-image-gallery-main-video"');
      expect(html).toContain('src="https://videos.example.com/mandala-flipthrough.mp4"');
      expect(html).toContain('poster="https://images.example.com/mandala-video-poster.jpg"');
      expect(html).toContain('muted=""');
      expect(html.toLowerCase()).toContain('playsinline');
      expect(html).toContain('controls=""');
      expect(html).toContain('preload="metadata"');
    });

    it('renders a standard <img> element without video for product without video', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductImageGallery, {
          media: sampleMediaNoVideo,
          productName: 'Mandala Book',
          selectedIndex: 0,
        })
      );

      expect(html).not.toContain('<video');
      expect(html).toContain('<img');
      expect(html).toContain('data-testid="product-image-gallery-main-image"');
      expect(html).toContain('src="https://images.example.com/mandala-cover.jpg"');
    });

    it('renders image in main viewport when navigating to an image slide in a video-enabled product', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductImageGallery, {
          media: sampleMediaWithVideoAtPosition2,
          productName: 'Mandala Book',
          selectedIndex: 1, // Second item is image m-img-1
        })
      );

      expect(html).not.toContain('<video');
      expect(html).toContain('<img');
      expect(html).toContain('src="https://images.example.com/mandala-cover.jpg"');
    });
  });

  describe('3. Thumbnail Strip & Play Indicator', () => {
    it('renders a play badge indicator on video thumbnail and not on image thumbnails', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductImageGallery, {
          media: sampleMediaWithVideoAtPosition2,
          productName: 'Mandala Book',
        })
      );

      // Video thumbnail is at index 0
      expect(html).toContain(
        'data-testid="product-image-gallery-thumb-video-indicator-0"'
      );
      // Image thumbnails (indices 1, 2, 3) must not have video indicator
      expect(html).not.toContain(
        'data-testid="product-image-gallery-thumb-video-indicator-1"'
      );
      expect(html).not.toContain(
        'data-testid="product-image-gallery-thumb-video-indicator-2"'
      );
      expect(html).not.toContain(
        'data-testid="product-image-gallery-thumb-video-indicator-3"'
      );
    });

    it('provides accessible aria-labels distinguishing video and image slides', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductImageGallery, {
          media: sampleMediaWithVideoAtPosition2,
          productName: 'Mandala Book',
        })
      );

      expect(html).toContain('aria-label="View product video (1 of 4)"');
      expect(html).toContain('aria-label="View image 2 of 4"');
      expect(html).toContain('aria-label="View image 3 of 4"');
      expect(html).toContain('aria-label="View image 4 of 4"');
    });

    it('uses thumbnailPath as thumbnail image src when available', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductImageGallery, {
          media: sampleMediaWithVideoAtPosition2,
          productName: 'Mandala Book',
        })
      );

      // Thumb 0 (video) should use poster/thumbnailPath
      expect(html).toContain('src="https://images.example.com/mandala-video-poster.jpg"');
    });

    it('renders a fallback <video src="...#t=0.001"> preview in thumbnail strip when video thumbnailPath is null', () => {
      const mediaWithNullPoster: ProductMedia[] = [
        {
          id: 'v1',
          productId: 'p1',
          type: 'video',
          storagePath: 'https://videos.example.com/demo.mp4',
          thumbnailPath: null,
          altText: 'Demo Video',
          sortOrder: 0,
          createdAt: '2026-08-01T10:00:00Z',
          updatedAt: '2026-08-01T10:00:00Z',
        },
        {
          id: 'i1',
          productId: 'p1',
          type: 'image',
          storagePath: 'https://images.example.com/demo.jpg',
          thumbnailPath: null,
          altText: 'Demo Image',
          sortOrder: 1,
          createdAt: '2026-08-01T10:00:00Z',
          updatedAt: '2026-08-01T10:00:00Z',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(ProductImageGallery, {
          media: mediaWithNullPoster,
          productName: 'Null Poster Product',
        })
      );

      // Should render video preview in thumbnail strip instead of broken <img src="...mp4">
      expect(html).toContain('src="https://videos.example.com/demo.mp4#t=0.001"');
      expect(html).not.toContain('<img src="https://videos.example.com/demo.mp4"');
    });
  });

  describe('4. Navigation Controls & Badge Slots', () => {
    it('renders arrow controls when gallery has multiple items', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProductImageGallery, {
          media: sampleMediaWithVideoAtPosition2,
          productName: 'Mandala Book',
        })
      );

      expect(html).toContain('data-testid="product-image-gallery-prev-btn"');
      expect(html).toContain('data-testid="product-image-gallery-next-btn"');
    });

    it('renders custom badge in top-left badge slot when provided', () => {
      const badgeNode = React.createElement(
        'span',
        { className: 'badge-custom' },
        '✨ Custom Photo Book'
      );
      const html = renderToStaticMarkup(
        React.createElement(ProductImageGallery, {
          media: sampleMediaWithVideoAtPosition2,
          productName: 'Mandala Book',
          badge: badgeNode,
        })
      );

      expect(html).toContain('data-testid="product-image-gallery-badge-slot"');
      expect(html).toContain('✨ Custom Photo Book');
    });
  });
});
