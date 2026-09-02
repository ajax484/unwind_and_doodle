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
    <section className="bg-slate-50/50 py-16 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-pink-600">
              Featured Items
            </span>
            <h2 className="text-3xl font-bold font-heading text-slate-800 tracking-tight mt-1">
              Customer Favorites
            </h2>
          </div>
          <Link
            href="/products"
            className="mt-4 sm:mt-0 text-sm font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 group"
          >
            View All Products{' '}
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm animate-pulse space-y-4"
              >
                <div className="bg-slate-200 h-48 rounded-2xl w-full" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
            <p>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No featured products available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
