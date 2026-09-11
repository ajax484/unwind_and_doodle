import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import Navbar from './Navbar';

const meta = {
  title: 'Design System/Organisms/Navbar',
  component: Navbar,
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
          'Canonical Navbar organism conforming directly to Figma design system specifications (`36:19249` and `36:19330`). Features translucent glassmorphic surface (`bg-white/95 backdrop-blur-md`), signature Fredoka brand wordmark & emblem, atomic `<Avatar size="sm" />` account indicator, shopping bag pill trigger with notification badge, and accessible mobile slide-down drawer with 44px min touch targets.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: 'radio',
      options: ['responsive', 'desktop', 'mobile'],
      description: 'Layout mode variant (responsive breakpoint vs forced desktop or mobile).',
    },
    isMobileMenuOpen: {
      control: 'boolean',
      description: 'Controlled visibility of the mobile slide-down drawer menu.',
    },
    showSearch: {
      control: 'boolean',
      description: 'Toggles visibility of the Search link.',
    },
    showAccount: {
      control: 'boolean',
      description: 'Toggles visibility of the Customer Account indicator.',
    },
    showCart: {
      control: 'boolean',
      description: 'Toggles visibility of the Shopping Cart trigger button.',
    },
    showCartCount: {
      control: 'boolean',
      description: 'Toggles visibility of the Cart notification count badge.',
    },
    cartCount: {
      control: 'number',
      description: 'Explicit number of items in cart.',
    },
    isAuthenticated: {
      control: 'boolean',
      description: 'Simulates customer authentication session status.',
    },
    customerName: {
      control: 'text',
      description: 'Customer first name rendered in authenticated greeting.',
    },
    onCartClick: { action: 'cartClicked' },
    onToggleMobileMenu: { action: 'mobileMenuToggled' },
  },
  args: {
    layout: 'desktop',
    showSearch: true,
    showAccount: true,
    showCart: true,
    showCartCount: true,
    cartCount: 2,
    isAuthenticated: false,
    customerName: 'Account',
    onCartClick: fn(),
    onToggleMobileMenu: fn(),
  },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Default Canonical Variant
 * Baseline desktop presentation adhering to Figma specifications (Layout=Desktop, MobileMenu=Closed).
 */
export const Default: Story = {
  args: {
    layout: 'desktop',
    cartCount: 2,
  },
};

/**
 * 02. Mobile Resting (Closed Drawer)
 * Mobile presentation adhering to Figma specification (Layout=Mobile, MobileMenu=Closed).
 */
export const MobileClosed: Story = {
  args: {
    layout: 'mobile',
    isMobileMenuOpen: false,
    cartCount: 3,
  },
};

/**
 * 03. Mobile Slide-Down Drawer (Open)
 * Mobile presentation with slide-down menu drawer expanded (Layout=Mobile, MobileMenu=Open).
 */
export const MobileOpen: Story = {
  args: {
    layout: 'mobile',
    isMobileMenuOpen: true,
    cartCount: 3,
  },
};

/**
 * 04. Without Search Action
 * Action bar with Show Search toggled off.
 */
export const WithoutSearch: Story = {
  args: {
    layout: 'desktop',
    showSearch: false,
    cartCount: 1,
  },
};

/**
 * 05. Without Account Indicator
 * Action bar with Show Account Link toggled off.
 */
export const WithoutAccount: Story = {
  args: {
    layout: 'desktop',
    showAccount: false,
    cartCount: 1,
  },
};

/**
 * 06. Empty Cart State
 * Cart with 0 items; count badge is hidden.
 */
export const EmptyCart: Story = {
  args: {
    layout: 'desktop',
    cartCount: 0,
  },
};

/**
 * 07. Authenticated Customer
 * Signed-in session state displaying atomic `<Avatar size="sm" />` and customer name greeting.
 */
export const AuthenticatedCustomer: Story = {
  args: {
    layout: 'desktop',
    isAuthenticated: true,
    customerName: 'Amara',
    cartCount: 4,
  },
};

/**
 * 08. Authentic Scenario
 * Responsive storefront scenario with custom mindful links and active customer session.
 */
export const AuthenticScenario: Story = {
  args: {
    layout: 'responsive',
    isAuthenticated: true,
    customerName: 'Maya',
    cartCount: 5,
    links: [
      { label: 'Shop', href: '/products' },
      { label: 'Collections', href: '/products?category=coloring-books' },
      { label: 'Bundles', href: '/products?category=bundles' },
      { label: 'About', href: '/#about' },
    ],
  },
};

/**
 * 09. Interactive Mobile Toggle
 * Automated verification of user clicking the hamburger toggle, checking drawer expansion, and closing.
 */
export const InteractiveMobileToggle: Story = {
  args: {
    layout: 'mobile',
    cartCount: 2,
    isMobileMenuOpen: undefined, // Let Navbar manage internal state
  },
  play: async ({ canvasElement }) => {
    // Settle autofocus / mount timers
    await new Promise((r) => setTimeout(r, 100));

    const canvas = within(canvasElement);

    // Verify toggle button exists and is collapsed
    const toggleBtn = canvas.getByTestId('navbar-mobile-toggle');
    await expect(toggleBtn).toBeInTheDocument();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Click hamburger button to open drawer
    await userEvent.click(toggleBtn);
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Verify mobile drawer and navigation links appear
    const mobileMenu = canvas.getByTestId('navbar-mobile-menu');
    await expect(mobileMenu).toBeInTheDocument();

    const shopLink = within(mobileMenu).getByRole('link', { name: 'Shop' });
    await expect(shopLink).toBeInTheDocument();

    // Click hamburger button again to close drawer
    await userEvent.click(toggleBtn);
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  },
};

/**
 * 10. Interactive Cart Click
 * Automated verification of clicking the Cart pill button and verifying callback invocation.
 */
export const InteractiveCartClick: Story = {
  args: {
    layout: 'desktop',
    cartCount: 4,
    onCartClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    (args.onCartClick as any)?.mockClear?.();
    await new Promise((r) => setTimeout(r, 100));

    const canvas = within(canvasElement);

    const cartBtn = canvas.getByTestId('navbar-cart-button');
    await expect(cartBtn).toBeInTheDocument();

    const countBadge = canvas.getByTestId('navbar-cart-count');
    await expect(countBadge).toHaveTextContent('4');

    await userEvent.click(cartBtn);
    await expect(args.onCartClick).toHaveBeenCalledTimes(1);
  },
};

/**
 * 11. CSS Token Verification
 * Asserts computed styles adhere strictly to canonical design tokens without arbitrary fallbacks.
 */
export const CssCheck: Story = {
  args: {
    layout: 'desktop',
    cartCount: 1,
    'data-testid': 'css-check-navbar',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const header = canvas.getByTestId('css-check-navbar');
    await expect(header).toBeInTheDocument();

    const computed = window.getComputedStyle(header);

    // Surface token: translucent white (#FFFFFF at 95% opacity)
    await expect(computed.backgroundColor).toMatch(
      /rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255|oklab/
    );

    // Border token: #EDF3F7 -> rgb(237, 243, 247)
    await expect(computed.borderBottomColor).toBe('rgb(237, 243, 247)');
  },
};
