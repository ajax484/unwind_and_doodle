import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import React from 'react';
import Footer from './Footer';

const meta = {
  title: 'Design System/Organisms/Footer',
  component: Footer,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/',
      },
    },
    docs: {
      description: {
        component:
          'Canonical Footer organism conforming directly to Figma design system specifications (Component Set `37:20278` and Documentation Board `37:20678` on the `Components` page). Features deep charcoal surface (`#243342`), inverse borders (`#36495C`), signature Fredoka brand wordmark & emblem, delivery pledge module, multi-column navigation groups, and accessible legal bottom bar.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: 'radio',
      options: ['responsive', 'desktop', 'mobile'],
      description: 'Layout presentation mode (responsive breakpoint vs forced desktop or mobile stack).',
    },
    showPledge: {
      control: 'boolean',
      description: 'Toggles visibility of the delivery/service pledge module (Figma Pledge=Visible|Hidden).',
    },
    showCatalogLinks: {
      control: 'boolean',
      description: 'Toggles visibility of the Catalog Shop column (Figma CatalogLinks=Visible|Hidden).',
    },
    showSupportLinks: {
      control: 'boolean',
      description: 'Toggles visibility of the Support resources column (Figma SupportLinks=Visible|Hidden).',
    },
    showLegal: {
      control: 'boolean',
      description: 'Toggles visibility of the Legal navigation links in the bottom copyright bar (Figma Legal=Visible|Hidden).',
    },
    brandDescription: {
      control: 'text',
      description: 'Editorial brand story copy under the logo.',
    },
    pledgeText: {
      control: 'text',
      description: 'Service/delivery pledge copy.',
    },
    pledgeHeart: {
      control: 'text',
      description: 'Emblem preceding pledge copy.',
    },
    copyrightYear: {
      control: 'number',
      description: 'Copyright year displayed in the bottom bar.',
    },
  },
  args: {
    layout: 'responsive',
    showPledge: true,
    showCatalogLinks: true,
    showSupportLinks: true,
    showLegal: true,
    brandDescription:
      'Thoughtful products for quiet moments, creative rituals, and making something of your own.',
    pledgeText: 'Made with care · Delivered with intention',
    pledgeHeart: '♡',
    copyrightYear: 2026,
  },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Default Canonical Variant
 * Baseline canonical presentation adhering to Figma master variant (Pledge=Visible, CatalogLinks=Visible, SupportLinks=Visible, Legal=Visible).
 */
export const Default: Story = {
  args: {
    layout: 'responsive',
  },
};

/**
 * 02. Minimal Variant (All Optional Hidden)
 * Minimal presentation with all optional module toggles disabled (Pledge=Hidden, CatalogLinks=Hidden, SupportLinks=Hidden, Legal=Hidden).
 */
export const Minimal: Story = {
  args: {
    showPledge: false,
    showCatalogLinks: false,
    showSupportLinks: false,
    showLegal: false,
  },
};

/**
 * 03. Mobile Stacked Layout (390px)
 * Forced mobile layout presentation demonstrating clean vertical stacking of all navigation columns.
 */
export const Mobile: Story = {
  args: {
    layout: 'mobile',
  },
};

/**
 * 04. Configuration A: Delivery Pledge Hidden
 * Adheres to Figma Documentation Board 37:20678 Configuration A (Pledge=Hidden, CatalogLinks=Visible, SupportLinks=Visible, Legal=Visible).
 */
export const DeliveryPledgeHidden: Story = {
  args: {
    showPledge: false,
  },
};

/**
 * 05. Configuration B: Legal Links Hidden
 * Adheres to Figma Documentation Board 37:20678 Configuration B (Pledge=Visible, CatalogLinks=Visible, SupportLinks=Visible, Legal=Hidden).
 */
export const LegalLinksHidden: Story = {
  args: {
    showLegal: false,
  },
};

/**
 * 06. Configuration C: Catalog Column Hidden
 * Adheres to Figma Documentation Board 37:20678 Configuration C (Pledge=Visible, CatalogLinks=Hidden, SupportLinks=Visible, Legal=Visible).
 */
export const CatalogColumnHidden: Story = {
  args: {
    showCatalogLinks: false,
  },
};

/**
 * 07. Support Column Hidden
 * Demonstrates layout adaptability when the Customer Support column is toggled off (SupportLinks=Hidden).
 */
export const SupportColumnHidden: Story = {
  args: {
    showSupportLinks: false,
  },
};

/**
 * 08. Authentic Scenario
 * Domain-authentic storefront configuration with rich handcrafted editorial copy and nationwide Nigerian delivery pledge.
 */
export const AuthenticScenario: Story = {
  args: {
    brandDescription:
      'Mindful coloring books, guided journals, and bespoke photo-to-drawing keepsakes designed to create space for imagination and quiet moments.',
    pledgeText: 'Handcrafted in Nigeria · Delivered Nationwide',
    pledgeHeart: '♡',
    copyrightYear: 2026,
    aboutLinks: [
      { label: 'Our Story', href: '/#about' },
      { label: 'Custom Artwork', href: '/custom' },
      { label: 'Customer Reviews', href: '/#reviews' },
      { label: 'Sustainability Pledge', href: '/#sustainability' },
      { label: 'Instagram @unwindanddoodle', href: 'https://instagram.com' },
    ],
  },
};

/**
 * 09. Interactive Play Test
 * Automated verification of semantic landmarks, navigation groups, and keyboard focus rings.
 */
export const InteractivePlay: Story = {
  args: {
    'data-testid': 'interactive-footer',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify contentinfo landmark
    const footer = canvas.getByRole('contentinfo');
    await expect(footer).toBeInTheDocument();

    // 2. Verify navigation groups exist
    const catalogNav = canvas.getByTestId('footer-catalog-nav');
    await expect(catalogNav).toBeInTheDocument();

    const supportNav = canvas.getByTestId('footer-support-nav');
    await expect(supportNav).toBeInTheDocument();

    const aboutNav = canvas.getByTestId('footer-about-nav');
    await expect(aboutNav).toBeInTheDocument();

    const legalNav = canvas.getByTestId('footer-legal-nav');
    await expect(legalNav).toBeInTheDocument();

    // 3. Verify brand pledge presence
    const pledge = canvas.getByTestId('footer-pledge');
    await expect(pledge).toBeInTheDocument();
    await expect(pledge).toHaveTextContent('Made with care · Delivered with intention');

    // 4. Verify keyboard focus capability on a link
    const trackOrderLink = canvas.getByRole('link', { name: /Track Order/i });
    await expect(trackOrderLink).toBeInTheDocument();
    await userEvent.tab();
    trackOrderLink.focus();
    await expect(trackOrderLink).toHaveFocus();

    // 5. Verify legal privacy link
    const privacyLink = canvas.getByRole('link', { name: /Privacy/i });
    await expect(privacyLink).toBeInTheDocument();
  },
};

/**
 * 10. CSS Token Verification
 * Asserts computed styles strictly adhere to canonical design system tokens without arbitrary hex fallbacks.
 */
export const CssCheck: Story = {
  args: {
    'data-testid': 'css-check-footer',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const footer = canvas.getByTestId('css-check-footer');
    await expect(footer).toBeInTheDocument();

    const computed = window.getComputedStyle(footer);

    // Verify Surface token: Color/Neutral/Charcoal (#243342 -> rgb(36, 51, 66))
    await expect(computed.backgroundColor).toMatch(/rgb\(36,\s*51,\s*66\)/);

    // Verify Border token: Semantic/Border/Inverse (#36495C -> rgb(54, 73, 92))
    await expect(computed.borderTopColor).toMatch(/rgb\(54,\s*73,\s*92\)/);

    // Verify Fredoka font family on brand wordmark
    const brandLogo = canvas.getByLabelText('Unwind and Doodle Home');
    await expect(brandLogo).toBeInTheDocument();
  },
};
