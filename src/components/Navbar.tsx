'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
  const pathname = usePathname();
  const { itemCount: cartCount, openDrawer } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const json = await res.json();
        if (json.authenticated && json.data?.customer) {
          setIsAuthenticated(true);
          setCustomerName(json.data.customer.firstName || 'Account');
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;

    fetchSession();

    const handleAuthUpdate = () => fetchSession();
    window.addEventListener('auth-updated', handleAuthUpdate);

    return () => {
      window.removeEventListener('auth-updated', handleAuthUpdate);
    };
  }, [pathname]);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const handleCartClick = (e: React.MouseEvent) => {
    if (pathname !== '/cart' && pathname !== '/checkout') {
      e.preventDefault();
      openDrawer();
    }
  };

  const navLinks = [
    { label: 'Shop', href: '/products' },
    { label: 'Collections', href: '/products?category=coloring-books' },
    { label: 'Custom Coloring Books', href: '/products?category=coloring-books' },
    { label: 'About', href: '/#about' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EDF3F7] shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        {/* Left: Brand Logo Image + Text with Signature Brand Colors */}
        <Link href="/" className="flex items-center gap-3 text-decoration-none group">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border border-[#E2ECF2] shadow-xs group-hover:scale-105 transition-transform bg-white flex items-center justify-center p-0.5">
            <img
              src="/logo.png"
              alt="Unwind and Doodle Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-xl sm:text-2xl font-bold tracking-tight leading-tight">
              <span className="text-[#A7C2D4]">unw</span>
              <span className="text-[#D99BA3]">i</span>
              <span className="text-[#A7C2D4]">nd</span>{' '}
              <span className="text-[#D99BA3] text-lg font-normal">&amp;</span>{' '}
              <span className="text-[#A7C2D4]">d</span>
              <span className="text-[#D99BA3]">oo</span>
              <span className="text-[#A7C2D4]">dle</span>
            </span>
            <span className="text-[10px] tracking-wider uppercase text-[#8295A8] font-semibold -mt-0.5">
              Mindful Art &amp; Stationery
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-[#D99BA3] ${
                  isActive ? 'text-[#D99BA3] font-semibold' : 'text-[#52657A]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search, Account & Cart */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Search Link */}
          <Link
            href="/products"
            className="text-xs sm:text-sm font-medium text-[#52657A] hover:text-[#243342] flex items-center gap-1.5 transition-colors"
            aria-label="Search Catalog"
          >
            <svg
              className="w-4 h-4 text-[#8295A8]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="hidden lg:inline font-heading">Search</span>
          </Link>

          {/* Account / Sign In Link */}
          <Link
            href={isAuthenticated ? '/account' : '/auth'}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#52657A] hover:text-[#243342] px-2.5 py-1.5 rounded-xl hover:bg-[#F4F8FA] transition-colors"
            aria-label="Customer Account"
          >
            <svg
              className="w-4 h-4 text-[#8295A8]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="hidden sm:inline font-heading">
              {isAuthenticated ? (customerName || 'Account') : 'Sign In'}
            </span>
          </Link>

          {/* Notifications Bell */}
          {isAuthenticated && (
            <NotificationBell variant="customer" />
          )}

          {/* Cart Icon & Count */}
          <Link
            href="/cart"
            onClick={handleCartClick}
            className="flex items-center gap-2 bg-[#EBF3F8] hover:bg-[#D9E9F2] text-[#243342] px-3.5 py-2 rounded-full font-heading font-semibold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
            aria-label="Shopping Cart"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-[#4A7A99]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="bg-[#D99BA3] text-white text-[11px] font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center -ml-0.5 shadow-xs">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-[#52657A] hover:bg-[#F4F8FA] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#EDF3F7] bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-heading font-medium text-[#243342] hover:bg-[#FBF0F2] hover:text-[#D99BA3]"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[#EDF3F7] grid grid-cols-2 gap-3 px-1">
            <Link
              href={isAuthenticated ? '/account' : '/auth'}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#F4F8FA] text-xs font-heading font-semibold text-[#243342]"
            >
              👤 {isAuthenticated ? (customerName || 'Account') : 'Sign In'}
            </Link>
            <Link
              href="/cart"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleCartClick(e);
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#FBF0F2] text-xs font-heading font-semibold text-[#D99BA3]"
            >
              🛍️ Cart ({cartCount})
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
