import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Revalidates cached storefront catalog, homepage, and category views
 * after admin product, category, bundle, or merchandising changes.
 */
export function revalidateStorefrontCatalog(): void {
  try {
    revalidateTag('homepage-data');
    revalidateTag('catalog');
    revalidateTag('categories');
    revalidatePath('/');
    revalidatePath('/products');
  } catch {
    // Safe no-op outside Next.js request context (e.g., unit tests or scripts)
  }
}
