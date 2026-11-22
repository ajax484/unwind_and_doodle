import React from 'react';
import Link from 'next/link';
import { StorefrontPageRecord, STOREFRONT_PAGE_META } from '@/types/storefront-pages';

interface StorefrontContentPageProps {
  page: StorefrontPageRecord;
}

export default function StorefrontContentPage({ page }: StorefrontContentPageProps) {
  const meta = STOREFRONT_PAGE_META[page.slug];
  const { sections = [], highlights = [], faqItems = [], contactInfo } = page.content;

  return (
    <main className="min-h-[70vh] bg-bg-default">
      {/* Hero Banner */}
      <section className="w-full bg-bg-subtle border-b border-border-default">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-heading font-semibold uppercase tracking-wider text-brand-blue">
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
          </span>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-text-primary tracking-tight leading-tight">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
              {page.subtitle}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        {/* Quick Highlights (e.g. Delivery timelines) */}
        {highlights.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                className="bg-white border border-border-default rounded-2xl p-5 shadow-xs space-y-1"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {item.label}
                </div>
                <div className="font-heading font-bold text-base sm:text-lg text-text-primary">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Channels Card */}
        {contactInfo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contactInfo.email && (
              <a
                href={`mailto:${contactInfo.email}`}
                className="bg-white border border-border-default hover:border-brand-blue rounded-2xl p-5 shadow-xs transition-colors space-y-1 block"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Email
                </div>
                <div className="font-heading font-bold text-base text-text-primary break-all">
                  {contactInfo.email}
                </div>
              </a>
            )}
            {contactInfo.whatsapp && (
              <div className="bg-white border border-border-default rounded-2xl p-5 shadow-xs space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  WhatsApp
                </div>
                <div className="font-heading font-bold text-base text-text-primary">
                  {contactInfo.whatsapp}
                </div>
              </div>
            )}
            {contactInfo.instagram && (
              <div className="bg-white border border-border-default rounded-2xl p-5 shadow-xs space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Instagram
                </div>
                <div className="font-heading font-bold text-base text-text-primary">
                  {contactInfo.instagram}
                </div>
              </div>
            )}
            {contactInfo.hours && (
              <div className="bg-white border border-border-default rounded-2xl p-5 shadow-xs space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Support Hours
                </div>
                <div className="font-heading font-bold text-base text-text-primary">
                  {contactInfo.hours}
                </div>
              </div>
            )}
            {contactInfo.location && (
              <div className="bg-white border border-border-default rounded-2xl p-5 shadow-xs space-y-1 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Location
                </div>
                <div className="font-heading font-bold text-base text-text-primary">
                  {contactInfo.location}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAQ Accordion Items */}
        {faqItems.length > 0 && (
          <div className="space-y-3">
            {faqItems.map((item, idx) => (
              <details
                key={`${item.question}-${idx}`}
                open={idx === 0}
                className="group bg-white border border-border-default rounded-2xl p-5 sm:p-6 shadow-xs"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-heading font-bold text-base text-text-primary">
                  <span>{item.question}</span>
                  <span className="text-text-tertiary transition-transform group-open:rotate-45 text-lg leading-none select-none">
                    +
                  </span>
                </summary>
                <div className="mt-3 pt-3 border-t border-border-default/60 text-sm text-text-secondary leading-relaxed space-y-2">
                  {item.answer
                    .split(/\n{2,}/)
                    .filter(Boolean)
                    .map((para, pIdx) => (
                      <p key={pIdx} className="whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                </div>
              </details>
            ))}
          </div>
        )}

        {/* Structured Content Sections */}
        {sections.length > 0 && (
          <div className="space-y-6">
            {sections.map((section, idx) => (
              <article
                key={`${section.heading}-${idx}`}
                className="bg-white border border-border-default rounded-3xl p-6 sm:p-8 shadow-xs space-y-3"
              >
                <h2 className="font-heading font-bold text-xl sm:text-2xl text-text-primary">
                  {section.heading}
                </h2>
                <div className="space-y-3 text-sm sm:text-base text-text-secondary leading-relaxed">
                  {section.body
                    .split(/\n{2,}/)
                    .filter(Boolean)
                    .map((para, pIdx) => (
                      <p key={pIdx} className="whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Helpful Cross-Links Footer Strip */}
        <div className="pt-6 border-t border-border-default flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <Link href="/products" className="btn-rose !py-2.5 !px-5 text-xs">
              Explore Shop
            </Link>
            {page.slug !== 'contact' && (
              <Link href="/contact" className="text-text-secondary hover:text-text-primary transition-colors px-2 py-2">
                Contact Support →
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
            <Link href="/about" className="hover:text-text-primary transition-colors">About</Link>
            <Link href="/delivery" className="hover:text-text-primary transition-colors">Delivery</Link>
            <Link href="/returns" className="hover:text-text-primary transition-colors">Returns</Link>
            <Link href="/faq" className="hover:text-text-primary transition-colors">FAQ</Link>
            <Link href="/contact" className="hover:text-text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
