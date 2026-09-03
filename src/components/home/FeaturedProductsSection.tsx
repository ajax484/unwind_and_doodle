import React from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { CatalogProductItem } from '@/services/catalog.service';

interface FeaturedProductsSectionProps {
  products: CatalogProductItem[];
  loading: boolean;
  error: string | null;
}

export default function FeaturedProductsSection({
  products,
  loading,
  error,
}: FeaturedProductsSectionProps) {
  return (
    <section className="w-full bg-[#FAFDFE] py-16 sm:py-24 lg:py-28 border-b border-[#EDF3F7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-4 border-b border-[#EDF3F7]">
        <div>
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block mb-1">
            Curated Favorites
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#243342]">
            Favorites right now
          </h2>
        </div>
        <Link
          href="/products"
          className="text-xs sm:text-sm font-heading font-semibold text-[#D99BA3] hover:text-[#C67D87] transition-colors flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Shop all products</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-soft h-80 animate-pulse bg-[#F4F8FA]" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-[#B33948] bg-[#FDF0F2] rounded-2xl max-w-md mx-auto">
          <p className="text-xs sm:text-sm font-medium">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-[#F4F8FA] rounded-2xl max-w-md mx-auto space-y-3">
          <h3 className="font-heading font-bold text-lg text-[#243342]">
            New editions coming shortly
          </h3>
          <p className="text-xs text-[#52657A]">
            We are currently preparing our new restock. Explore all items in our catalog.
          </p>
          <Link href="/products" className="btn-blue text-xs inline-block">
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {products.map((prod) => (
            <ProductCard
              key={prod.id}
              id={prod.id}
              name={prod.name}
              slug={prod.slug}
              price={prod.price}
              primaryImage={prod.primaryImage}
              isAvailable={prod.isAvailable}
              requiresCustomization={prod.requiresCustomization}
              categories={prod.categories}
            />
          ))}
        </div>
      )}

      <div className="text-center mt-12 sm:hidden">
        <Link href="/products" className="btn-outline w-full text-xs">
          Shop all products →
        </Link>
      </div>
    </div>
  </section>
  );
}
