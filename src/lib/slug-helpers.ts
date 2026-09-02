import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase/types';

/**
 * Utility to generate a URL-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

/**
 * Ensures slug is unique within an organization by checking existing products and appending numbers if needed.
 */
export async function generateUniqueSlug(
  supabase: SupabaseClient<Database>,
  name: string,
  organizationId: string,
  existingProductId?: string
): Promise<string> {
  const baseSlug = slugify(name) || 'product';
  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const { data: matched } = await supabase
      .from('products')
      .select('id, slug')
      .eq('organization_id', organizationId)
      .eq('slug', candidateSlug);

    const conflicting = (matched || []).filter((p) => !existingProductId || p.id !== existingProductId);
    if (conflicting.length === 0) {
      return candidateSlug;
    }
    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
  }
}
