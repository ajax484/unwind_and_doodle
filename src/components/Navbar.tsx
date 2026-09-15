'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { CartContext } from '@/context/CartContext';
import NotificationBell from '@/components/NotificationBell';
import { Avatar } from '@/components/Avatar';

export const navbarVariants = cva(
  'sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-default shadow-xs transition-all w-full',
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

export interface NavLinkItem {
  /** Display label for the navigation link */
  label: string;
  /** Destination route or URL */
  href: string;
}

export interface NavbarProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof navbarVariants> {
  /** Optional testing identifier */
  'data-testid'?: string;

  /**
   * Layout mode variant.
   * - 'responsive': Standard responsive behavior (desktop on md+, mobile on <md) (Default)
   * - 'desktop': Forced desktop presentation
   * - 'mobile': Forced mobile presentation
   * @default 'responsive'
   */
  layout?: 'responsive' | 'desktop' | 'mobile';

  /**
   * Controlled open state for the mobile slide-down drawer.
   * If omitted, Navbar manages open state internally.
   */
  isMobileMenuOpen?: boolean;

  /**
   * Callback fired when mobile menu toggle state changes.
   */
  onToggleMobileMenu?: (isOpen: boolean) => void;

  /**
   * Toggles visibility of the Search link/button.
   * @default true
   */
  showSearch?: boolean;

  /**
   * Toggles visibility of the Account indicator link/button.
   * @default true
   */
  showAccount?: boolean;

  /**
   * Toggles visibility of the Shopping Cart trigger button.
   * @default true
   */
  showCart?: boolean;

  /**
   * Toggles visibility of the Cart item count badge.
   * @default true
   */
  showCartCount?: boolean;

  /**
   * Explicit override for cart item count.
   * If omitted, safely reads from CartContext (or 0 if outside CartProvider).
   */
  cartCount?: number;

  /**
   * Optional custom click handler for the Cart button.
   * If omitted, opens the CartDrawer via CartContext.
   */
  onCartClick?: (e: React.MouseEvent) => void;

  /**
   * Explicit customer authentication state override.
   * If omitted, checks session automatically via `/api/auth/session`.
   */
  isAuthenticated?: boolean;

  /**
   * Explicit customer name override when authenticated.
   */
  customerName?: string;

  /**
   * Navigation links to render.
   * Defaults to Shop, Collections, Custom Coloring Books, and About.
   */
  links?: NavLinkItem[];

  /**
   * Active link path override (defaults to current Next.js pathname).
   */
  currentPath?: string;
}

const defaultNavLinks: NavLinkItem[] = [
  { label: 'Shop', href: '/products' },
  { label: 'Collections', href: '/products?category=coloring-books' },
  { label: 'Custom Coloring Books', href: '/products?category=coloring-books' },
  { label: 'About', href: '/#about' },
];

/**
 * Navbar Organism
 * Canonical storefront header conforming directly to Figma design system specifications (`36:19249` and `36:19330`).
 * Features translucent glassmorphic surface (`bg-white/95 backdrop-blur-md`), Fredoka brand emblem,
 * atomic `<Avatar size="sm" />` account indicator, shopping bag pill trigger with notification badge,
 * and accessible mobile slide-down drawer with 44px min touch targets.
 */
export function Navbar({
  layout = 'responsive',
  isMobileMenuOpen: controlledMenuOpen,
  onToggleMobileMenu,
  showSearch = true,
  showAccount = true,
  showCart = true,
  showCartCount = true,
  cartCount: cartCountProp,
  onCartClick,
  isAuthenticated: isAuthenticatedProp,
  customerName: customerNameProp,
  links = defaultNavLinks,
  currentPath,
  className,
  ...props
}: NavbarProps) {
  // Safe Next.js navigation hook
  let systemPathname = '';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hookPath = usePathname();
    systemPathname = hookPath || '';
  } catch {
    systemPathname = '';
  }
  const pathname = currentPath !== undefined ? currentPath : systemPathname;

  // Safe CartContext subscription (never crashes outside CartProvider)
  const cartCtx = useContext(CartContext);
  const resolvedCartCount =
    cartCountProp !== undefined ? cartCountProp : (cartCtx?.itemCount ?? 0);
  const openDrawer = cartCtx?.openDrawer ?? (() => {});

  // Internal vs controlled mobile menu state
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const isMenuOpen =
    controlledMenuOpen !== undefined ? controlledMenuOpen : internalMenuOpen;

  const handleToggleMenu = () => {
    const nextState = !isMenuOpen;
    if (controlledMenuOpen === undefined) {
      setInternalMenuOpen(nextState);
    }
    onToggleMobileMenu?.(nextState);
  };

  const handleCloseMenu = () => {
    if (controlledMenuOpen === undefined) {
      setInternalMenuOpen(false);
    }
    onToggleMobileMenu?.(false);
  };

  // Internal auth session state (when not overridden by props)
  const [internalAuth, setInternalAuth] = useState(false);
  const [internalCustomerName, setInternalCustomerName] = useState('');

  const resolvedIsAuthenticated =
    isAuthenticatedProp !== undefined ? isAuthenticatedProp : internalAuth;
  const resolvedCustomerName =
    customerNameProp !== undefined ? customerNameProp : internalCustomerName;

  useEffect(() => {
    if (isAuthenticatedProp !== undefined) return;
    if (pathname?.startsWith('/admin')) return;

    let isMounted = true;
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.authenticated && json.data?.customer) {
            setInternalAuth(true);
            setInternalCustomerName(json.data.customer.firstName || 'Account');
          } else {
            setInternalAuth(false);
          }
        }
      } catch {
        if (isMounted) setInternalAuth(false);
      }
    };

    fetchSession();

    const handleAuthUpdate = () => fetchSession();
    window.addEventListener('auth-updated', handleAuthUpdate);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat every 25 minutes to keep active session cookies fresh
    const heartbeatInterval = setInterval(fetchSession, 25 * 60 * 1000);

    return () => {
      isMounted = false;
      window.removeEventListener('auth-updated', handleAuthUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
    };
  }, [pathname, isAuthenticatedProp]);

  // Hide on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const handleCartClick = (e: React.MouseEvent) => {
    if (onCartClick) {
      onCartClick(e);
      return;
    }
    if (pathname !== '/cart' && pathname !== '/checkout') {
      e.preventDefault();
      openDrawer();
    }
  };

  // Determine layout display modes
  const isForcedDesktop = layout === 'desktop';
  const isForcedMobile = layout === 'mobile';
  const isResponsive = layout === 'responsive';

  const desktopNavClasses = isForcedDesktop
    ? 'flex items-center gap-8'
    : isForcedMobile
    ? 'hidden'
    : 'hidden md:flex items-center gap-8';

  const mobileActionsClasses = isForcedDesktop
    ? 'hidden'
    : isForcedMobile
    ? 'flex items-center gap-2'
    : 'md:hidden flex items-center gap-2';

  const desktopActionsClasses = isForcedDesktop
    ? 'flex items-center gap-4'
    : isForcedMobile
    ? 'hidden'
    : 'hidden md:flex items-center gap-3 sm:gap-4 lg:gap-5';

  return (
    <header
      data-testid="navbar"
      className={cn(navbarVariants({ layout }), className)}
      {...props}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        {/* Left: Brand Logo Emblem & Multi-Color Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-3 text-decoration-none group select-none shrink-0"
          aria-label="Unwind and Doodle Home"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden border border-border-default shadow-xs group-hover:scale-105 transition-transform bg-white flex items-center justify-center p-0.5">
            <img
              src="/logo.png"
              alt="Unwind and Doodle Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-xl sm:text-2xl font-bold tracking-tight leading-tight">
              <span className="text-brand-blue">unw</span>
              <span className="text-brand-rose">i</span>
              <span className="text-brand-blue">nd</span>{' '}
              <span className="text-brand-rose text-lg font-normal">&amp;</span>{' '}
              <span className="text-brand-blue">d</span>
              <span className="text-brand-rose">oo</span>
              <span className="text-brand-blue">dle</span>
            </span>
            <span className="text-[10px] tracking-wider uppercase text-text-tertiary font-semibold -mt-0.5">
              Mindful Art &amp; Stationery
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav
          aria-label="Main Navigation"
          className={desktopNavClasses}
        >
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-action-primary',
                  isActive
                    ? 'text-action-primary font-semibold'
                    : 'text-text-secondary'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Desktop Layout */}
        <div className={desktopActionsClasses}>
          {/* Search Trigger */}
          {showSearch && (
            <Link
              data-testid="navbar-search-link"
              href="/products"
              className="text-xs sm:text-sm font-medium text-text-secondary hover:text-text-primary flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-bg-subtle transition-colors"
              aria-label="Search Catalog"
            >
              <svg
                className="w-4 h-4 text-text-tertiary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="font-heading">Search</span>
            </Link>
          )}

          {/* Account Indicator */}
          {showAccount && (
            <Link
              data-testid="navbar-account-link"
              href={resolvedIsAuthenticated ? '/account' : '/auth'}
              className="flex items-center gap-2 text-xs sm:text-sm font-medium text-text-secondary hover:text-text-primary py-1 pl-2 pr-3.5 rounded-full bg-bg-subtle hover:bg-bg-accent/70 transition-colors shadow-2xs"
              aria-label="Customer Account"
            >
              {resolvedIsAuthenticated ? (
                <Avatar
                  size="sm"
                  name={resolvedCustomerName || 'Account'}
                  className="w-7 h-7 text-[10px]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center border border-border-default text-text-tertiary">
                  <svg
                    className="w-4 h-4 text-text-tertiary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
              <span className="font-heading font-medium text-text-primary text-sm">
                {resolvedIsAuthenticated
                  ? resolvedCustomerName || 'Account'
                  : 'Sign In'}
              </span>
            </Link>
          )}

          {/* Notifications Bell */}
          {resolvedIsAuthenticated && (
            <NotificationBell variant="customer" />
          )}

          {/* Shopping Cart Pill Button */}
          {showCart && (
            <Link
              data-testid="navbar-cart-button"
              href="/cart"
              onClick={handleCartClick}
              className="flex items-center gap-2 bg-action-secondary-bg hover:bg-brand-blue/20 text-text-primary px-3.5 py-2 rounded-full font-heading font-semibold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
              aria-label="Shopping Cart"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-action-secondary-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <span>Cart</span>
              {showCartCount && resolvedCartCount > 0 && (
                <span
                  data-testid="navbar-cart-count"
                  className="bg-action-primary text-text-inverse text-[11px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center -ml-0.5 shadow-xs"
                >
                  {resolvedCartCount}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* Right Actions: Mobile Layout Controls */}
        <div className={mobileActionsClasses}>
          {/* Mobile Search Icon */}
          {showSearch && (
            <Link
              href="/products"
              className="p-2 rounded-lg text-text-secondary hover:bg-bg-subtle transition-colors"
              aria-label="Search Catalog"
            >
              <svg
                className="w-5 h-5 text-text-tertiary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </Link>
          )}

          {/* Mobile Cart Button */}
          {showCart && (
            <Link
              data-testid="navbar-cart-button-mobile"
              href="/cart"
              onClick={handleCartClick}
              className="relative p-2 rounded-lg text-text-secondary hover:bg-bg-subtle transition-colors"
              aria-label="Shopping Cart"
            >
              <svg
                className="w-5 h-5 text-action-secondary-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {showCartCount && resolvedCartCount > 0 && (
                <span
                  data-testid="navbar-cart-count-mobile"
                  className="absolute -top-0.5 -right-0.5 bg-action-primary text-text-inverse text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs"
                >
                  {resolvedCartCount}
                </span>
              )}
            </Link>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            data-testid="navbar-mobile-toggle"
            type="button"
            onClick={handleToggleMenu}
            className="p-2 rounded-lg text-text-secondary hover:bg-bg-subtle transition-colors"
            aria-label="Toggle Navigation Menu"
            aria-expanded={isMenuOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Drawer Menu */}
      {isMenuOpen && (isForcedMobile || isResponsive) && (
        <div
          data-testid="navbar-mobile-menu"
          className={cn(
            'border-t border-border-default bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2',
            isResponsive && 'md:hidden'
          )}
        >
          {/* Mobile Navigation Links */}
          <nav aria-label="Mobile Navigation" className="space-y-1">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={handleCloseMenu}
                className="min-h-[44px] flex items-center px-3.5 py-2.5 rounded-xl text-sm font-heading font-medium text-text-primary hover:bg-bg-subtle hover:text-action-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Divider */}
          <div className="border-t border-border-default pt-3" />

          {/* Action Grid: Account & Cart Buttons */}
          <div className="grid grid-cols-2 gap-3 px-1">
            {showAccount && (
              <Link
                href={resolvedIsAuthenticated ? '/account' : '/auth'}
                onClick={handleCloseMenu}
                className="h-11 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-bg-subtle hover:bg-bg-accent/70 text-xs font-heading font-semibold text-text-primary transition-colors"
              >
                {resolvedIsAuthenticated ? (
                  <Avatar
                    size="sm"
                    name={resolvedCustomerName || 'Account'}
                    className="w-5 h-5 text-[9px]"
                  />
                ) : (
                  <span>👤</span>
                )}
                <span className="truncate">
                  {resolvedIsAuthenticated
                    ? resolvedCustomerName || 'Account'
                    : 'Sign In'}
                </span>
              </Link>
            )}

            {showCart && (
              <Link
                href="/cart"
                onClick={(e) => {
                  handleCloseMenu();
                  handleCartClick(e);
                }}
                className="h-11 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-action-secondary-bg hover:bg-brand-blue/20 text-xs font-heading font-semibold text-action-secondary-text transition-colors"
              >
                <span>🛍️ Cart</span>
                {showCartCount && resolvedCartCount > 0 && (
                  <span className="bg-action-primary text-text-inverse text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {resolvedCartCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;

