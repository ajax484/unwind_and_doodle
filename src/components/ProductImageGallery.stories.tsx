import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import ProductImageGallery, { GalleryImage } from './ProductImageGallery';

const sampleImages: GalleryImage[] = [
  {
    id: 'cover-1',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800',
    alt: 'Mindful Coloring Rituals Vol. 1 — Book Cover View',
  },
  {
    id: 'spread-2',
    url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800',
    alt: 'Botanical Intricate Mandala — Interior Spread View',
  },
  {
    id: 'paper-3',
    url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800',
    alt: '180 GSM Archival Bleed-Resistant Paper — Texture Detail',
  },
  {
    id: 'packaging-4',
    url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800',
    alt: 'Ritual Artisan Gift Box — Packaging & Ribbon Detail',
  },
];

const meta = {
  title: 'Design System/Organisms/ProductImageGallery',
  component: ProductImageGallery,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical storefront product image gallery organism adhering directly to Figma Component Set `40:24601` (32 variants) and Documentation Board `41:24602` ("Product Image Galleries" on `Components` page). Features 1:1 dominant image viewport (`Radius/LG` 20px), square thumbnail navigation strip (`64×64px` desktop / `56×56px` mobile, `Radius/MD` 14px) with Rose active border token (`#D99BA3`), optional translucent charcoal image counter badge (`"1 / 4"`), previous/next arrow controls, and full keyboard accessibility.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: 'radio',
      options: ['auto', 'desktop', 'mobile'],
      description: 'Sizing scale layout (Desktop 480px, Mobile 340px, or Auto responsive).',
    },
    thumbnails: {
      control: 'boolean',
      description: 'Whether thumbnail navigation strip is visible below the main image.',
    },
    showImageCount: {
      control: 'boolean',
      description: 'Displays the bottom-right image count badge overlay.',
    },
    imageCountText: {
      control: 'text',
      description: 'Custom textual override for the image count badge (e.g. "1 / 5").',
    },
    showArrows: {
      control: 'boolean',
      description: 'Whether to show previous/next navigation arrow buttons on hover.',
    },
    productName: {
      control: 'text',
      description: 'Product name for accessible image alt text.',
    },
  },
  args: {
    images: sampleImages,
    productName: 'Mindful Coloring Rituals Vol. 1',
    layout: 'desktop',
    thumbnails: true,
    showImageCount: false,
    showArrows: true,
    onSelectImage: fn(),
  },
  decorators: [
    (Story) => (
      <div className="p-4 flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductImageGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 1. Default Desktop Gallery (First Selected — Cover View)
 */
export const Default: Story = {
  args: {
    layout: 'desktop',
    defaultIndex: 0,
  },
};

/**
 * 2. Second Selected (Interior Spread View)
 */
export const SecondSelected: Story = {
  args: {
    layout: 'desktop',
    defaultIndex: 1,
  },
};

/**
 * 3. Third Selected (Archival Paper Texture Detail)
 */
export const ThirdSelected: Story = {
  args: {
    layout: 'desktop',
    defaultIndex: 2,
  },
};

/**
 * 4. Image Count Badge Visible (Bottom-Right "1 / 4" Pill)
 */
export const ImageCountVisible: Story = {
  args: {
    layout: 'desktop',
    showImageCount: true,
    defaultIndex: 0,
  },
};

/**
 * 5. Custom Count Text (e.g. "1 / 5" for Expanded Multi-View Catalogs)
 */
export const CustomCountText: Story = {
  args: {
    layout: 'desktop',
    showImageCount: true,
    imageCountText: '1 / 5',
  },
};

/**
 * 6. Mobile Presentation (340px Viewport with 56px Thumbnails)
 */
export const MobileLayout: Story = {
  args: {
    layout: 'mobile',
    showImageCount: true,
  },
};

/**
 * 7. Thumbnails Hidden (Hero / Single Image Mode with Counter)
 */
export const ThumbnailsHidden: Story = {
  args: {
    layout: 'desktop',
    thumbnails: false,
    showImageCount: true,
  },
};

/**
 * 8. With Customization Badge (Top-Left Badge Overlay)
 */
export const WithCustomizationBadge: Story = {
  args: {
    layout: 'desktop',
    badge: (
      <span className="bg-action-primary text-text-inverse text-xs font-heading font-bold px-3 py-1.5 rounded-full shadow-sm">
        ✨ Custom Photo Book
      </span>
    ),
  },
};

/**
 * 9. Empty Placeholder State (Artistic Fallback)
 */
export const EmptyPlaceholder: Story = {
  args: {
    images: [],
    productName: 'Mindful Collection',
  },
};

/**
 * 10. Interactive Play Test (Thumbnails, Arrows, and Keyboard Navigation)
 */
export const InteractivePlay: Story = {
  args: {
    images: sampleImages,
    productName: 'Interactive Coloring Book',
    'data-testid': 'interactive-gallery',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const gallery = canvas.getByTestId('interactive-gallery');
    await expect(gallery).toBeInTheDocument();

    // Verify main image rendered with initial cover
    const mainImg = canvas.getByTestId('interactive-gallery-main-image');
    await expect(mainImg).toBeInTheDocument();
    await expect(mainImg).toHaveAttribute('src', sampleImages[0].url);

    // Verify thumbnail 1 is selected
    const thumb0 = canvas.getByTestId('interactive-gallery-thumb-0');
    await expect(thumb0).toHaveAttribute('aria-selected', 'true');

    // Click thumbnail 1 (second image)
    const thumb1 = canvas.getByTestId('interactive-gallery-thumb-1');
    await userEvent.click(thumb1);
    await expect(args.onSelectImage).toHaveBeenCalledWith(1);
    await expect(mainImg).toHaveAttribute('src', sampleImages[1].url);
    await expect(thumb1).toHaveAttribute('aria-selected', 'true');

    // Click next arrow button
    const nextBtn = canvas.getByTestId('interactive-gallery-next-btn');
    await userEvent.click(nextBtn);
    await expect(args.onSelectImage).toHaveBeenCalledWith(2);
    await expect(mainImg).toHaveAttribute('src', sampleImages[2].url);

    // Click previous arrow button
    const prevBtn = canvas.getByTestId('interactive-gallery-prev-btn');
    await userEvent.click(prevBtn);
    await expect(args.onSelectImage).toHaveBeenCalledWith(1);
    await expect(mainImg).toHaveAttribute('src', sampleImages[1].url);

    // Test keyboard ArrowRight navigation
    await gallery.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onSelectImage).toHaveBeenCalledWith(2);
  },
};

/**
 * 11. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    images: sampleImages,
    'data-testid': 'css-check-gallery',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify Main Image Viewport has Radius/LG (16px-24px / rounded-2xl)
    const viewport = canvas.getByTestId('css-check-gallery-main-viewport');
    await expect(viewport).toBeInTheDocument();
    const viewportStyle = window.getComputedStyle(viewport);
    await expect(viewportStyle.borderRadius).toMatch(/16px|20px|24px/);

    // 2. Verify Active Thumbnail has 2px Rose border (#D99BA3 -> rgb(217, 155, 163))
    const activeThumb = canvas.getByTestId('css-check-gallery-thumb-0');
    await expect(activeThumb).toBeInTheDocument();
    const thumbStyle = window.getComputedStyle(activeThumb);
    await expect(thumbStyle.borderColor).toMatch(/rgb\(217,\s*155,\s*163\)/);
    // Radius/MD 12px-14px (rounded-xl)
    await expect(thumbStyle.borderRadius).toMatch(/12px|14px/);
  },
};
