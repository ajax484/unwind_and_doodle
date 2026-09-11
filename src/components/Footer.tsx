'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const footerVariants = cva(
  'bg-neutral-charcoal text-neutral-cream mt-auto pt-16 pb-12 border-t border-border-inverse transition-colors w-full',
  {
    variants: {
      layout: {
        responsive: '',
        desktop: '',
        mobile: '',
      },
    },
    defaultVariants: {
      layout: 'responsive',
    },
  }
);

export interface FooterLinkItem {
  /** Display label for the navigation link */
  label: string;
  /** Destination route or external URL */
  href: string;
}

export interface FooterProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof footerVariants> {
  /** Optional testing identifier */
  'data-testid'?: string;

  /**
   * Layout presentation mode.
   * - 'responsive': Auto-wrapping multi-column layout on desktop, stacked on mobile (Default)
   * - 'desktop': Forced multi-column desktop presentation
   * - 'mobile': Forced stacked mobile presentation
   * @default 'responsive'
   */
  layout?: 'responsive' | 'desktop' | 'mobile';

  /**
   * Toggles visibility of the Delivery & Service pledge under the brand column.
   * Directly maps to canonical Figma property `Pledge=Visible|Hidden`.
   * @default true
   */
  showPledge?: boolean;

  /**
   * Toggles visibility of the Catalog (Shop) links column.
   * Directly maps to canonical Figma property `CatalogLinks=Visible|Hidden`.
   * @default true
   */
  showCatalogLinks?: boolean;

  /**
   * Toggles visibility of the Customer Support links column.
   * Directly maps to canonical Figma property `SupportLinks=Visible|Hidden`.
   * @default true
   */
  showSupportLinks?: boolean;

  /**
   * Toggles visibility of the Legal links in the bottom copyright bar.
   * Directly maps to canonical Figma property `Legal=Visible|Hidden`.
   * @default true
   */
  showLegal?: boolean;

  /**
   * Brand editorial story description copy.
   * @default 'Thoughtful products for quiet moments, creative rituals, and making something of your own.'
   */
  brandDescription?: string;

  /**
   * Text for the delivery/service pledge.
   * @default 'Made with care · Delivered with intention'
   */
  pledgeText?: string;

  /**
   * Heart symbol or emblem preceding pledge copy.
   * @default '♡'
   */
  pledgeHeart?: string;

  /**
   * Custom navigation items for the Catalog (Shop) column.
   */
  catalogLinks?: FooterLinkItem[];

  /**
   * Custom navigation items for the Customer Support column.
   */
  supportLinks?: FooterLinkItem[];

  /**
   * Custom navigation items for the About brand column.
   */
  aboutLinks?: FooterLinkItem[];

  /**
   * Custom navigation items for the Legal bottom bar.
   */
  legalLinks?: FooterLinkItem[];

  /**
   * Copyright year displayed in bottom bar. Defaults to current calendar year.
   */
  copyrightYear?: number;
}

export const CANONICAL_CATALOG_LINKS: FooterLinkItem[] = [
  { label: 'Coloring Books', href: '/products?category=coloring-books' },
  { label: 'Collections', href: '/products' },
  { label: 'Bundles', href: '/products?category=bundles' },
  { label: 'Gift Ideas', href: '/products?category=gifts' },
  { label: 'Journals & Planners', href: '/products?category=journals' },
];

export const CANONICAL_SUPPORT_LINKS: FooterLinkItem[] = [
  { label: 'Contact Us', href: '/#contact' },
  { label: 'Track Order', href: '/order/callback' },
  { label: 'FAQs', href: '/#faq' },
  { label: 'Shipping & Delivery', href: '/checkout' },
  { label: 'Quality Guarantee', href: '/#about' },
];

export const CANONICAL_ABOUT_LINKS: FooterLinkItem[] = [
  { label: 'Our Story', href: '/#about' },
  { label: 'Customization', href: '/#customization' },
  { label: 'Reviews', href: '/#reviews' },
  { label: 'Sustainability', href: '/#sustainability' },
  { label: 'Instagram', href: 'https://instagram.com' },
];

export const CANONICAL_LEGAL_LINKS: FooterLinkItem[] = [
  { label: 'Privacy', href: '/#privacy' },
  { label: 'Terms', href: '/#terms' },
  { label: 'Shipping Policy', href: '/#shipping' },
  { label: 'Secure Checkout', href: '/checkout' },
];

/**
 * Footer Organism
 * Canonical storefront footer conforming directly to Figma design system specifications
 * (Component Set `37:20278` and Documentation Board `37:20678` on the `Components` page).
 *
 * Implements canonical tokens (`bg-neutral-charcoal`, `border-border-inverse`),
 * WCAG 2.1 AA accessibility standards (`role="contentinfo"`, `<nav aria-labelledby="...">`,
 * visible focus indicators), and 100% backward compatibility for storefront layout contracts.
 */
export default function Footer({
  layout = 'responsive',
  showPledge = true,
  showCatalogLinks = true,
  showSupportLinks = true,
  showLegal = true,
  brandDescription = 'Thoughtful products for quiet moments, creative rituals, and making something of your own.',
  pledgeText = 'Made with care · Delivered with intention',
  pledgeHeart = '♡',
  catalogLinks = CANONICAL_CATALOG_LINKS,
  supportLinks = CANONICAL_SUPPORT_LINKS,
  aboutLinks = CANONICAL_ABOUT_LINKS,
  legalLinks = CANONICAL_LEGAL_LINKS,
  copyrightYear = new Date().getFullYear(),
  className,
  'data-testid': testId = 'footer',
  ...props
}: FooterProps) {
  const pathname = usePathname();

  // Suppress on admin dashboard surfaces
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const isForcedDesktop = layout === 'desktop';
  const isForcedMobile = layout === 'mobile';

  // Sizing and grid classes based on layout mode
  const gridClasses = isForcedDesktop
    ? 'grid grid-cols-5 gap-10 pb-12 border-b border-border-inverse'
    : isForcedMobile
    ? 'flex flex-col gap-10 pb-12 border-b border-border-inverse'
    : 'grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-border-inverse';

  const brandColClasses = isForcedDesktop
    ? 'col-span-2 space-y-4 pr-0 sm:pr-8'
    : isForcedMobile
    ? 'w-full space-y-4 pr-0'
    : 'md:col-span-2 space-y-4 pr-0 sm:pr-8';

  const bottomBarClasses = isForcedDesktop
    ? 'pt-8 flex flex-row items-center justify-between gap-4 text-xs text-text-tertiary'
    : isForcedMobile
    ? 'pt-8 flex flex-col items-start gap-4 text-xs text-text-tertiary'
    : 'pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-text-tertiary';

  return (
    <footer
      data-testid={testId}
      role="contentinfo"
      className={cn(footerVariants({ layout }), className)}
      {...props}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Multi-Column Grid */}
        <div className={gridClasses}>
          {/* Column 1: Brand & Logo (Spans 2 columns on desktop) */}
          <div className={brandColClasses}>
            <Link
              href="/"
              className="flex items-center gap-3 group select-none shrink-0 text-decoration-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-charcoal rounded-sm w-fit"
              aria-label="Unwind and Doodle Home"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden border border-border-inverse shadow-xs group-hover:scale-105 transition-transform bg-white flex items-center justify-center p-0.5 shrink-0">
                <img
                  src="/logo.png"
                  alt="Unwind and Doodle Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-text-inverse">
                <span className="text-brand-blue">unw</span>
                <span className="text-brand-rose">i</span>
                <span className="text-brand-blue">nd</span>{' '}
                <span className="text-brand-rose font-normal">&amp;</span>{' '}
                <span className="text-brand-blue">d</span>
                <span className="text-brand-rose">oo</span>
                <span className="text-brand-blue">dle</span>
              </span>
            </Link>

            <p className="font-body text-xs sm:text-sm text-text-tertiary leading-relaxed max-w-sm">
              {brandDescription}
            </p>

            {showPledge && (
              <div
                data-testid="footer-pledge"
                className="pt-1 text-xs text-text-tertiary flex items-center gap-2 font-body"
              >
                <span className="text-brand-rose font-bold select-none" aria-hidden="true">
                  {pledgeHeart}
                </span>
                <span>{pledgeText}</span>
              </div>
            )}
          </div>

          {/* Column 2: Catalog Links (Shop) */}
          {showCatalogLinks && (
            <nav
              data-testid="footer-catalog-nav"
              aria-labelledby="footer-catalog-heading"
              className="space-y-3"
            >
              <h4
                id="footer-catalog-heading"
                className="font-heading text-xs sm:text-sm font-semibold uppercase tracking-wider text-brand-blue"
              >
                Shop
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-text-tertiary font-body">
                {catalogLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-charcoal rounded-xs min-h-[44px] sm:min-h-0 flex sm:inline-flex items-center"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Column 3: Customer Support Links */}
          {showSupportLinks && (
            <nav
              data-testid="footer-support-nav"
              aria-labelledby="footer-support-heading"
              className="space-y-3"
            >
              <h4
                id="footer-support-heading"
                className="font-heading text-xs sm:text-sm font-semibold uppercase tracking-wider text-brand-rose"
              >
                Support
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-text-tertiary font-body">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-charcoal rounded-xs min-h-[44px] sm:min-h-0 flex sm:inline-flex items-center"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Column 4: About / Connect Links */}
          <nav
            data-testid="footer-about-nav"
            aria-labelledby="footer-about-heading"
            className="space-y-3"
          >
            <h4
              id="footer-about-heading"
              className="font-heading text-xs sm:text-sm font-semibold uppercase tracking-wider text-brand-blue"
            >
              About
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-text-tertiary font-body">
              {aboutLinks.map((link) => {
                const isExternal = link.href.startsWith('http');
                return (
                  <li key={link.label}>
                    {isExternal ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-charcoal rounded-xs min-h-[44px] sm:min-h-0 flex sm:inline-flex items-center"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-charcoal rounded-xs min-h-[44px] sm:min-h-0 flex sm:inline-flex items-center"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Bottom Bar: Copyright and Legal */}
        <div className={bottomBarClasses}>
          <p className="font-body text-xs text-text-tertiary">
            © {copyrightYear} Unwind &amp; Doodle. All rights reserved.
          </p>
          {showLegal && (
            <nav
              data-testid="footer-legal-nav"
              aria-label="Legal Information"
              className="flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-text-tertiary hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-charcoal rounded-xs text-xs font-body min-h-[36px] sm:min-h-0 flex items-center"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
