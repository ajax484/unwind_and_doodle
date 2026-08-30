import React from 'react';
import Link from 'next/link';

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  primaryImage: string | null;
  isAvailable: boolean;
  requiresCustomization?: boolean;
  productType?: 'physical' | 'custom' | 'bundle';
  bundleComponentsCount?: number;
  categories?: { id: string; name: string }[];
}

export default function ProductCard({
  name,
  slug,
  price,
  primaryImage,
  isAvailable,
  requiresCustomization,
  productType,
  bundleComponentsCount,
  categories,
}: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price);

  const categoryName = categories && categories.length > 0 ? categories[0].name : null;

  return (
    <div className="card-soft overflow-hidden flex flex-col h-full bg-white group">
      {/* Product Image Container */}
      <Link
        href={`/products/${slug}`}
        className="relative aspect-square bg-[#F4F8FA] overflow-hidden block"
      >
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#EBF3F8] via-[#FFFFFF] to-[#FBF0F2] p-6 text-center">
            <span className="text-3xl mb-1.5">🎨</span>
            <span className="font-heading font-semibold text-xs text-[#52657A]">
              unwind <span className="text-[#D99BA3]">&amp;</span> doodle
            </span>
          </div>
        )}

        {/* Bundle Badge */}
        {productType === 'bundle' && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-purple-700 text-white text-[10px] font-heading font-bold tracking-wide uppercase px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
              <span>📦</span> {bundleComponentsCount ? `Bundle • ${bundleComponentsCount} Items` : 'Bundle'}
            </span>
          </div>
        )}

        {/* Customization Badge (If not bundle) */}
        {requiresCustomization && productType !== 'bundle' && (
          <div className="absolute top-3 left-3">
            <span className="bg-[#D99BA3] text-white text-[10px] font-heading font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full shadow-xs">
              ✨ Custom Photo
            </span>
          </div>
        )}

        {/* Out of Stock badge */}
        {!isAvailable && (
          <div className="absolute top-3 right-3">
            <span className="badge-stock badge-out-of-stock shadow-xs">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Product Info */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow justify-between space-y-3">
        <div className="space-y-1">
          {categoryName && (
            <span className="text-[11px] font-heading font-semibold tracking-wider uppercase text-[#A7C2D4] block">
              {categoryName}
            </span>
          )}
          <Link href={`/products/${slug}`} className="block group-hover:text-[#D99BA3] transition-colors">
            <h3 className="font-heading font-semibold text-base sm:text-lg text-[#243342] leading-snug line-clamp-2">
              {name}
            </h3>
          </Link>
        </div>

        <div className="pt-3 border-t border-[#EDF3F7] flex items-center justify-between">
          <span className="font-heading font-bold text-base sm:text-lg text-[#243342]">
            {formattedPrice}
          </span>
          <Link
            href={`/products/${slug}`}
            className="px-3 py-1.5 rounded-full bg-[#EBF3F8] hover:bg-[#D99BA3] text-[#4A7A99] hover:text-white font-heading font-semibold text-xs transition-colors flex items-center gap-1"
          >
            <span>{requiresCustomization ? 'Customize' : 'View'}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
