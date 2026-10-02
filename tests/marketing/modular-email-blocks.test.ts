import { describe, it, expect } from 'vitest';
import {
  compileCampaignBlocksToHtml,
  renderMarketingTemplate,
  toAbsoluteUrl,
} from '@/services/marketing-renderer.service';
import { V1_EMAIL_TEMPLATES } from '@/lib/marketing-templates';
import { V1CampaignBlock } from '@/types/marketing-builder';
import { MarketingContext } from '@/types/marketing-context';

describe('V1 Modular Campaign Email Blocks, Media & Renderer', () => {
  it('compiles an empty block list gracefully', () => {
    const html = compileCampaignBlocksToHtml([]);
    expect(html).toContain('No content written yet');
  });

  it('compiles all 7 V1 block types with centered brand logo at top', () => {
    const blocks: V1CampaignBlock[] = [
      {
        id: 'blk-text',
        type: 'text',
        data: {
          content: 'Hello {{first_name}}, welcome to our studio!',
          style: 'heading',
          align: 'center',
        },
      },
      {
        id: 'blk-image',
        type: 'image',
        data: {
          mediaId: 'med_banner_1',
          url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
          altText: 'Art Studio Banner',
          caption: 'Handcrafted in Abuja',
          linkUrl: 'https://unwindanddoodle.com',
          width: 'full',
          align: 'center',
        },
      },
      {
        id: 'blk-callout',
        type: 'callout',
        data: {
          title: 'Special Personalized Note ♡',
          message: "Your name goes on the cover: {{first_name}}'s Journal",
          variant: 'rose',
        },
      },
      {
        id: 'blk-product',
        type: 'product',
        data: {
          productId: 'prod-for-the-girls',
          title: 'For the Girls — A6 Custom Edition',
          price: 5500,
          badge: 'Limited Preorder',
          description: '30 aesthetic hand-drawn pages ready for your creative touch.',
          ctaText: 'Preorder for ₦5,500',
          ctaUrl: '/products/for-the-girls',
          showPrice: true,
          showDescription: true,
          showCta: true,
        },
      },
      {
        id: 'blk-grid',
        type: 'product_grid',
        data: {
          heading: 'Community Favorites',
          products: [
            {
              productId: 'prod-general',
              title: 'General Colouring Book',
              price: 6500,
              slug: 'general-colouring-book',
            },
            {
              productId: 'prod-vent',
              title: 'Vent to Me Journal',
              price: 8500,
              slug: 'vent-to-me',
            },
          ],
        },
      },
      {
        id: 'blk-divider',
        type: 'divider',
        data: { spacing: 'md' },
      },
      {
        id: 'blk-button',
        type: 'button',
        data: {
          text: 'Explore Catalog Now 🎀',
          url: 'https://unwindanddoodle.com/products',
          style: 'rose',
          align: 'center',
        },
      },
    ];

    const html = compileCampaignBlocksToHtml(blocks);

    // Verify Centered Logo at top with Supabase storage URL
    expect(html).toContain('https://xisoofbqjbkoucfwzacb.supabase.co/storage/v1/object/public/assets/logo.svg');
    expect(html).toContain('Unwind &amp; Doodle');

    // Verify Text block
    expect(html).toContain('Hello {{first_name}}, welcome to our studio!');
    expect(html).toContain('font-size: 22px'); // heading style
    expect(html).toContain('text-align: center');

    // Verify Image block
    expect(html).toContain('https://images.unsplash.com/photo-1513364776144-60967b0f800f');
    expect(html).toContain('Art Studio Banner');
    expect(html).toContain('Handcrafted in Abuja');
    expect(html).toContain('max-width: 560px');

    // Verify Callout block
    expect(html).toContain('Special Personalized Note ♡');
    expect(html).toContain('#FBF0F2'); // Rose background

    // Verify Product block with absolute CTA link
    expect(html).toContain('For the Girls — A6 Custom Edition');
    expect(html).toContain('₦5,500');
    expect(html).toContain('Limited Preorder');
    expect(html).toContain('Preorder for ₦5,500');
    expect(html).toContain(toAbsoluteUrl('/products/for-the-girls'));

    // Verify Product Grid block with absolute links
    expect(html).toContain('Community Favorites');
    expect(html).toContain('General Colouring Book');
    expect(html).toContain('Vent to Me Journal');
    expect(html).toContain(toAbsoluteUrl('/products/general-colouring-book'));
    expect(html).toContain(toAbsoluteUrl('/products/vent-to-me'));
    expect(html).toContain('₦6,500');
    expect(html).toContain('₦8,500');

    // Verify Divider block
    expect(html).toContain('<hr style="border: 0; border-top: 1px solid #EDF3F7; margin: 24px 0;"');

    // Verify Button block
    expect(html).toContain('Explore Catalog Now 🎀');
    expect(html).toContain('#D99BA3'); // Brand Rose button color
  }, 15000);

  it('compiles constrained width and aligned image blocks accurately', () => {
    const blocks: V1CampaignBlock[] = [
      {
        id: 'img-constrained',
        type: 'image',
        data: {
          url: 'https://unwindanddoodle.com/photos/illustration.png',
          altText: 'Cute Illustration',
          width: 'constrained',
          align: 'right',
        },
      },
    ];

    const html = compileCampaignBlocksToHtml(blocks);
    expect(html).toContain('max-width: 360px');
    expect(html).toContain('text-align: right');
    expect(html).toContain('margin: 0 0 0 auto');
  });

  it('correctly personalizes blocks through renderMarketingTemplate with context', () => {
    const blocks: V1CampaignBlock[] = [
      {
        id: '1',
        type: 'text',
        data: {
          content: 'Hi {{first_name}} {{last_name}}, your order {{order_number}} for {{product_name}} is ready.',
          style: 'body',
        },
      },
    ];

    const context: MarketingContext = {
      firstName: 'Aisha',
      lastName: 'Bello',
      orderNumber: 'ORD-5521',
      productName: 'For the Girls A6 Edition',
    };

    const rendered = renderMarketingTemplate({ blocks }, context);

    expect(rendered).toContain('Hi Aisha Bello, your order ORD-5521 for For the Girls A6 Edition is ready.');
    expect(rendered).toContain('https://xisoofbqjbkoucfwzacb.supabase.co/storage/v1/object/public/assets/logo.svg');
  });

  it('validates all V1 template presets (Product Launch, Editorial, Welcome, BlankCanvas)', () => {
    expect(V1_EMAIL_TEMPLATES.length).toBe(4);

    for (const preset of V1_EMAIL_TEMPLATES) {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.blocks.length).toBeGreaterThan(0);

      const html = compileCampaignBlocksToHtml(preset.blocks);
      expect(html.length).toBeGreaterThan(50);
      expect(html).toContain('https://xisoofbqjbkoucfwzacb.supabase.co/storage/v1/object/public/assets/logo.svg');
    }

    const launch = V1_EMAIL_TEMPLATES.find((p) => p.id === 'product_launch');
    expect(launch).toBeDefined();
    expect(launch?.defaultSubject).toBe('I made something for the girls 🎀');
    expect(launch?.blocks.some((b) => b.type === 'product')).toBe(true);

    const welcome = V1_EMAIL_TEMPLATES.find((p) => p.id === 'welcome_onboarding');
    expect(welcome).toBeDefined();
    expect(welcome?.blocks.some((b) => b.type === 'product_grid')).toBe(true);
  });

  it('supports fine-grained presentation overrides for single product block without catalog mutation', () => {
    const block: V1CampaignBlock = {
      id: 'blk-custom-product',
      type: 'product',
      data: {
        productId: 'prod-general-book',
        image: {
          imageId: 'img_secondary',
          url: 'https://unwindanddoodle.com/photos/alternate-angle.jpg',
        },
        badge: {
          visible: true,
          text: 'Campaign Exclusive 🎨',
        },
        title: {
          visible: true,
          text: 'Your next creative escape', // Campaign title override
        },
        description: {
          visible: true,
          text: 'A little space to slow down, breathe and create.', // Campaign desc override
        },
        price: {
          visible: true,
        },
        cta: {
          visible: true,
          text: 'Claim Your Copy',
          destination: {
            type: 'custom',
            url: 'https://unwindanddoodle.com/pages/special-bundle',
          },
        },
        _catalogSnapshot: {
          title: 'General Colouring Book',
          price: 6500,
          slug: 'general-colouring-book',
        },
      },
    };

    const html = compileCampaignBlocksToHtml([block]);

    // Presentation values rendered
    expect(html).toContain('Your next creative escape');
    expect(html).toContain('Campaign Exclusive 🎨');
    expect(html).toContain('A little space to slow down, breathe and create.');
    expect(html).toContain('Claim Your Copy');
    expect(html).toContain('https://unwindanddoodle.com/pages/special-bundle');
    expect(html).toContain('https://unwindanddoodle.com/photos/alternate-angle.jpg');
    // Authoritative catalog price rendered
    expect(html).toContain('₦6,500');
  });

  it('supports per-product presentation overrides and visibility toggles in product grid', () => {
    const gridBlock: V1CampaignBlock = {
      id: 'blk-custom-grid',
      type: 'product_grid',
      data: {
        heading: 'Handpicked for Aisha',
        products: [
          {
            productId: 'prod-1',
            image: {
              url: 'https://unwindanddoodle.com/img1.jpg',
            },
            badge: {
              visible: true,
              text: 'Bestseller',
            },
            title: {
              visible: true,
              text: 'Mindful Colouring',
            },
            description: {
              visible: true,
              text: 'Relax with 30 serene patterns.',
            },
            price: {
              visible: false, // Price hidden in presentation
            },
            cta: {
              visible: true,
              text: 'Preorder Now',
              destination: { type: 'product' },
            },
            _catalogSnapshot: {
              title: 'Catalog Product 1',
              price: 5000,
              slug: 'product-1',
            },
          },
          {
            productId: 'prod-2',
            image: {
              url: 'https://unwindanddoodle.com/img2.jpg',
            },
            badge: {
              visible: false,
            },
            title: {
              visible: true,
              text: 'Daily Reflection Journal',
            },
            description: {
              visible: false,
            },
            price: {
              visible: true,
            },
            cta: {
              visible: true,
              text: 'Explore Journal',
              destination: {
                type: 'custom',
                url: 'https://unwindanddoodle.com/journal-guide',
              },
            },
            _catalogSnapshot: {
              title: 'Catalog Product 2',
              price: 8500,
              slug: 'product-2',
            },
          },
        ],
      },
    };

    const html = compileCampaignBlocksToHtml([gridBlock]);

    expect(html).toContain('Handpicked for Aisha');
    // Item 1
    expect(html).toContain('Bestseller');
    expect(html).toContain('Mindful Colouring');
    expect(html).toContain('Relax with 30 serene patterns.');
    expect(html).toContain('Preorder Now');
    expect(html).toContain('/products/product-1');
    expect(html).not.toContain('₦5,000'); // Price hidden

    // Item 2
    expect(html).toContain('Daily Reflection Journal');
    expect(html).toContain('₦8,500'); // Price visible
    expect(html).toContain('Explore Journal');
    expect(html).toContain('https://unwindanddoodle.com/journal-guide');
  });

  it('strips HTML tags and entities from product descriptions and resolves absolute links', () => {
    const block: V1CampaignBlock = {
      id: 'blk-html-product',
      type: 'product',
      data: {
        productId: 'prod-rich-desc',
        title: 'Creative Art Therapy Kit',
        description: '<p>A <strong>soothing</strong> creative journal with <em>30 pages</em> &amp; premium pens.&nbsp;</p>',
        ctaText: 'Shop Now',
        ctaUrl: '/products/art-therapy-kit',
        price: 12000,
        showPrice: true,
        showDescription: true,
        showCta: true,
      },
    };

    const html = compileCampaignBlocksToHtml([block]);

    // HTML should be stripped to clean plain text
    expect(html).toContain('A soothing creative journal with 30 pages &amp; premium pens.');
    expect(html).not.toContain('<p>');
    expect(html).not.toContain('<strong>');
    expect(html).not.toContain('&nbsp;');

    // Relative product link should be converted to absolute
    expect(html).toContain(`href="${toAbsoluteUrl('/products/art-therapy-kit')}"`);
  });

  it('wraps compiled campaign blocks in a full-width outer container with a centered max-width 600px card', () => {
    const block: V1CampaignBlock = {
      id: 'blk-text-wrap',
      type: 'text',
      data: {
        content: 'Exclusive Community Update',
        style: 'heading',
        align: 'center',
      },
    };

    const html = compileCampaignBlocksToHtml([block]);

    // Full-width outer viewport table
    expect(html).toContain('width: 100% !important');
    expect(html).toContain('background-color: #F8F9FA');

    // Centered max-width 600px inner card
    expect(html).toContain('max-width: 600px');
    expect(html).toContain('background-color: #FFFFFF');
    expect(html).toContain('border-radius: 16px');
    expect(html).toContain('margin: 0 auto');
  });
});
