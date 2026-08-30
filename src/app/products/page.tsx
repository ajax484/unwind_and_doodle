'use client';

import React, { useEffect, useState, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { CatalogProductItem } from '@/services/catalog.service';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Read URL query params
  const initialCategory = searchParams.get('category') || '';
  const initialQuery = searchParams.get('q') || searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'featured';
  const initialInStock = searchParams.get('inStock') === 'true';
  const initialPage = Number(searchParams.get('page')) || 1;

  const [products, setProducts] = useState<CatalogProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([
    { id: 'all', name: 'All', slug: '' },
    { id: 'cb', name: 'Coloring Books', slug: 'coloring-books' },
    { id: 'jn', name: 'Journals', slug: 'journals' },
    { id: 'wr', name: 'Pencils & Pens', slug: 'writing' },
    { id: 'gf', name: 'Gift Sets', slug: 'gift-sets' },
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [selectedSort, setSelectedSort] = useState<string>(initialSort);
  const [inStockOnly, setInStockOnly] = useState<boolean>(initialInStock);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state when URL params change (e.g. browser back/forward)
  useEffect(() => {
    setSelectedCategory(searchParams.get('category') || '');
    setSearchQuery(searchParams.get('q') || searchParams.get('search') || '');
    setSelectedSort(searchParams.get('sort') || 'featured');
    setInStockOnly(searchParams.get('inStock') === 'true');
    setCurrentPage(Number(searchParams.get('page')) || 1);
  }, [searchParams]);

  // Fetch products from server
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (selectedCategory) params.append('category', selectedCategory);
        if (searchQuery.trim()) params.append('q', searchQuery.trim());
        if (selectedSort && selectedSort !== 'featured') params.append('sort', selectedSort);
        if (inStockOnly) params.append('inStock', 'true');
        if (currentPage > 1) params.append('page', currentPage.toString());
        params.append('limit', '24');

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load catalog products');
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
          setProducts(json.data);
          if (json.meta) {
            setTotalCount(json.meta.total || json.data.length);
            setTotalPages(json.meta.totalPages || 1);
            if (json.meta.categories && json.meta.categories.length > 0) {
              // Merge default 'All' with DB categories
              const merged = [
                { id: 'all', name: 'All', slug: '' },
                ...json.meta.categories.filter((c: CategoryItem) => c.slug),
              ];
              setCategories(merged);
            }
          } else {
            setTotalCount(json.data.length);
            setTotalPages(1);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading catalog');
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchProducts();
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, selectedSort, inStockOnly, currentPage]);

  // Update URL query parameters helper
  const updateUrlParams = (updates: {
    category?: string;
    q?: string;
    sort?: string;
    inStock?: boolean;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    const newCat = updates.category !== undefined ? updates.category : selectedCategory;
    const newQ = updates.q !== undefined ? updates.q : searchQuery;
    const newSort = updates.sort !== undefined ? updates.sort : selectedSort;
    const newStock = updates.inStock !== undefined ? updates.inStock : inStockOnly;
    const newPage = updates.page !== undefined ? updates.page : currentPage;

    if (newCat) params.append('category', newCat);
    if (newQ.trim()) params.append('q', newQ.trim());
    if (newSort && newSort !== 'featured') params.append('sort', newSort);
    if (newStock) params.append('inStock', 'true');
    if (newPage > 1) params.append('page', newPage.toString());

    startTransition(() => {
      router.push(`/products?${params.toString()}`, { scroll: false });
    });
  };

  const handleCategoryClick = (slug: string) => {
    setSelectedCategory(slug);
    setCurrentPage(1);
    updateUrlParams({ category: slug, page: 1 });
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    updateUrlParams({ q: val, page: 1 });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sortVal = e.target.value;
    setSelectedSort(sortVal);
    updateUrlParams({ sort: sortVal, page: 1 });
  };

  const handleInStockToggle = () => {
    const nextStock = !inStockOnly;
    setInStockOnly(nextStock);
    setCurrentPage(1);
    updateUrlParams({ inStock: nextStock, page: 1 });
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setSelectedSort('featured');
    setInStockOnly(false);
    setCurrentPage(1);
    startTransition(() => {
      router.push('/products', { scroll: false });
    });
  };

  const hasActiveFilters = Boolean(
    selectedCategory || searchQuery.trim() || selectedSort !== 'featured' || inStockOnly
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* 1. CATALOG HEADER */}
      <div className="space-y-3">
        <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block">
          Collection Catalog
        </span>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-[#243342]">
          Shop
        </h1>
        <p className="text-sm sm:text-base text-[#52657A] max-w-xl">
          Everything made for your creative moments.
        </p>
      </div>

      {/* 2. CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-heading font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#D99BA3] text-white shadow-xs'
                  : 'bg-[#F4F8FA] hover:bg-[#EBF3F8] text-[#52657A] border border-[#EDF3F7]'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* 3. TOOLBAR (Search, Availability Toggle, Sorting, Count) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-[#EDF3F7]">
        {/* Left: Search Input & In Stock Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Live Search */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="form-input text-xs sm:text-sm !py-2.5 !pl-9"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8295A8] text-xs">
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8295A8] hover:text-[#243342] text-xs font-bold"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* In Stock Toggle */}
          <button
            type="button"
            onClick={handleInStockToggle}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-heading font-semibold transition-colors flex items-center justify-center gap-2 ${
              inStockOnly
                ? 'border-[#D99BA3] bg-[#FBF0F2] text-[#D99BA3]'
                : 'border-[#EDF3F7] bg-white text-[#52657A] hover:bg-[#F4F8FA]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${inStockOnly ? 'bg-[#D99BA3]' : 'bg-[#DCE7EE]'}`}
            />
            <span>In stock only</span>
          </button>
        </div>

        {/* Right: Sort Dropdown & Product Count */}
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <span className="text-xs font-heading font-semibold text-[#8295A8] whitespace-nowrap">
            {loading ? 'Loading...' : `${totalCount} product${totalCount === 1 ? '' : 's'}`}
          </span>

          <div className="flex items-center gap-2">
            <label htmlFor="catalog-sort" className="text-xs font-heading font-semibold text-[#52657A] hidden sm:inline">
              Sort:
            </label>
            <select
              id="catalog-sort"
              value={selectedSort}
              onChange={handleSortChange}
              className="form-input text-xs font-heading font-semibold !py-2 !px-3 bg-white border border-[#EDF3F7] rounded-xl text-[#243342] cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-[#52657A]">
          <span className="font-heading font-semibold">Active filters:</span>
          {selectedCategory && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF3F8] text-[#4A7A99] font-heading font-semibold">
              Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
              <button
                type="button"
                onClick={() => handleCategoryClick('')}
                className="hover:text-[#243342]"
              >
                ✕
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF3F8] text-[#4A7A99] font-heading font-semibold">
              Search: "{searchQuery}"
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="hover:text-[#243342]"
              >
                ✕
              </button>
            </span>
          )}
          {inStockOnly && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF3F8] text-[#4A7A99] font-heading font-semibold">
              In Stock
              <button type="button" onClick={handleInStockToggle} className="hover:text-[#243342]">
                ✕
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-[#D99BA3] hover:text-[#C67D87] font-heading font-bold ml-2 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* 4. PRODUCT GRID */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="card-soft h-72 sm:h-84 animate-pulse bg-[#F4F8FA] rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-[#B33948] bg-[#FDF0F2] rounded-2xl max-w-md mx-auto">
          <p className="text-xs sm:text-sm font-medium">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-16 text-center bg-[#F4F8FA] rounded-3xl max-w-lg mx-auto space-y-4 border border-[#EDF3F7]">
          <div className="w-16 h-16 rounded-full bg-white text-[#D99BA3] flex items-center justify-center text-3xl mx-auto shadow-xs">
            🔍
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-xl text-[#243342]">No Products Found</h3>
            <p className="text-xs sm:text-sm text-[#52657A]">
              We couldn't find any products matching your search or filters.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="btn-rose text-xs !px-6"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
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
              productType={prod.productType}
              bundleComponentsCount={prod.bundleComponentsCount}
              categories={prod.categories}
            />
          ))}
        </div>
      )}

      {/* 5. PAGINATION (If multiple pages exist) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8 border-t border-[#EDF3F7]">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => {
              const prev = Math.max(1, currentPage - 1);
              setCurrentPage(prev);
              updateUrlParams({ page: prev });
            }}
            className="px-3.5 py-2 rounded-xl border border-[#EDF3F7] bg-white hover:bg-[#F4F8FA] text-xs font-heading font-semibold text-[#243342] disabled:opacity-40"
          >
            ← Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              type="button"
              onClick={() => {
                setCurrentPage(pg);
                updateUrlParams({ page: pg });
              }}
              className={`w-9 h-9 rounded-xl text-xs font-heading font-bold transition-colors ${
                currentPage === pg
                  ? 'bg-[#D99BA3] text-white'
                  : 'bg-white border border-[#EDF3F7] text-[#52657A] hover:bg-[#F4F8FA]'
              }`}
            >
              {pg}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => {
              const next = Math.min(totalPages, currentPage + 1);
              setCurrentPage(next);
              updateUrlParams({ page: next });
            }}
            className="px-3.5 py-2 rounded-xl border border-[#EDF3F7] bg-white hover:bg-[#F4F8FA] text-xs font-heading font-semibold text-[#243342] disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-12 text-center text-xs font-heading text-[#8295A8]">Loading catalog...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
