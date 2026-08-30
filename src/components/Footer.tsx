'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  return (
    <footer className="bg-[#243342] text-[#EDF3F7] mt-auto pt-16 pb-12 border-t border-[#36495C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-[#36495C]">
          {/* Column 1: Brand & Logo (Spans 2 cols) */}
          <div className="md:col-span-2 space-y-4 pr-0 sm:pr-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white p-0.5 shadow-xs">
                <img
                  src="/logo.png"
                  alt="Unwind and Doodle Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-heading text-2xl font-bold tracking-tight text-white">
                <span className="text-[#A7C2D4]">unw</span>
                <span className="text-[#D99BA3]">i</span>
                <span className="text-[#A7C2D4]">nd</span>{' '}
                <span className="text-[#D99BA3] font-normal">&amp;</span>{' '}
                <span className="text-[#A7C2D4]">d</span>
                <span className="text-[#D99BA3]">oo</span>
                <span className="text-[#A7C2D4]">dle</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-[#A5B8C8] leading-relaxed max-w-sm">
              Mindful coloring books, guided journals, and bespoke photo-to-drawing keepsakes designed to create space for imagination and quiet moments.
            </p>
            <div className="pt-2 text-xs text-[#8295A8] flex items-center gap-2">
              <span className="text-[#D99BA3]">♡</span>
              <span>Handcrafted in Nigeria • Delivered Nationwide</span>
            </div>
          </div>

          {/* Column 2: Shop */}
          <div className="space-y-3">
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-[#A7C2D4]">
              Shop
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#A5B8C8]">
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products?category=coloring-books" className="hover:text-white transition-colors">
                  Coloring Books
                </Link>
              </li>
              <li>
                <Link href="/products?category=journals" className="hover:text-white transition-colors">
                  Journals &amp; Planners
                </Link>
              </li>
              <li>
                <Link href="/products?category=writing" className="hover:text-white transition-colors">
                  Pencils &amp; Tools
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Help & Support */}
          <div className="space-y-3">
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-[#D99BA3]">
              Help
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#A5B8C8]">
              <li>
                <Link href="/#contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:text-white transition-colors">
                  Delivery &amp; Shipping
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-white transition-colors">
                  Quality Guarantee
                </Link>
              </li>
              <li>
                <Link href="/order/callback" className="hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Connect & Contact */}
          <div className="space-y-3">
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-[#A7C2D4]">
              Connect
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#A5B8C8]">
              <li>
                <Link href="/#about" className="hover:text-white transition-colors">
                  About Our Brand
                </Link>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/2348162952599"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <span>WhatsApp Chat</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:unwindanddoodle@gmail.com"
                  className="hover:text-white transition-colors"
                >
                  unwindanddoodle@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8295A8]">
          <p>© {new Date().getFullYear()} Unwind and Doodle. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Mindful Living</span>
            <span>•</span>
            <span className="text-[#D99BA3]">Made with love</span>
            <span>•</span>
            <span>Secure Paystack Checkout</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
