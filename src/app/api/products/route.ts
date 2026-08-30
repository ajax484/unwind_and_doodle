import { NextRequest, NextResponse } from 'next/server';
import { getPublishedCatalog } from '@/services/catalog.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const url = new URL(req.url);

    const search = url.searchParams.get('q') || url.searchParams.get('search') || undefined;
    const category = url.searchParams.get('category') || undefined;
    const sort = url.searchParams.get('sort') || 'featured';
    const inStockOnly = url.searchParams.get('inStock') === 'true';
    const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined;
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined;

    // Fetch full matching set for count & categories
    const allMatching = await getPublishedCatalog(supabase, {
      search,
      categorySlug: category,
      sort,
      inStockOnly,
    });

    const total = allMatching.length;
    const itemsPerPage = limit && limit > 0 ? limit : 24;
    const currentPage = page && page > 0 ? page : 1;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

    // Slice for pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = allMatching.slice(startIndex, startIndex + itemsPerPage);

    // Fetch dynamic categories from DB
    const { data: dbCategories } = await supabase.from('categories').select('id, name, slug');

    return NextResponse.json(
      {
        success: true,
        data: paginatedProducts,
        meta: {
          total,
          page: currentPage,
          totalPages,
          limit: itemsPerPage,
          categories: dbCategories || [],
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching catalog';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
