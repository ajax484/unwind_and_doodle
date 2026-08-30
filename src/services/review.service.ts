import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';

export interface SubmitReviewInput {
  orderId: string;
  productId: string;
  rating: number; // 1 - 5
  title?: string | null;
  body?: string | null;
  images?: {
    storagePath: string;
    fileSize?: number;
    mimeType?: string;
  }[];
}

export interface ReviewDetail {
  id: string;
  orderId: string;
  productId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: Database['public']['Enums']['review_status'];
  createdAt: string;
  customerName?: string;
  images: {
    id: string;
    storagePath: string;
  }[];
}

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_COUNT = 5;

/**
 * Validates review eligibility:
 * 1. Customer owns the order
 * 2. Order is in 'received' status
 * 3. Order contains the specified product
 * 4. Customer has not already reviewed this product for this order
 */
export async function checkReviewEligibility(
  supabase: SupabaseClient<Database>,
  customerId: string,
  orderId: string,
  productId: string
): Promise<{ eligible: boolean; reason?: string }> {
  // 1. Fetch order and customer ownership
  const { data: order, error: ordErr } = await supabase
    .from('orders')
    .select('id, customer_id, status')
    .eq('id', orderId)
    .maybeSingle();

  if (ordErr || !order) {
    return { eligible: false, reason: 'Order not found' };
  }

  if (order.customer_id !== customerId) {
    return { eligible: false, reason: 'Order does not belong to this customer' };
  }

  // 2. Check order lifecycle status
  if (order.status !== 'received') {
    return {
      eligible: false,
      reason: `Reviews can only be submitted for orders that have been received. Current order status is '${order.status}'.`,
    };
  }

  // 3. Verify product was in the order
  const { data: item } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('product_id', productId)
    .maybeSingle();

  if (!item) {
    return { eligible: false, reason: 'This product was not part of the specified order' };
  }

  // 4. Check for existing review
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .eq('product_id', productId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (existingReview) {
    return { eligible: false, reason: 'A review has already been submitted for this item' };
  }

  return { eligible: true };
}

/**
 * Submits a new product review for a verified and received order.
 */
export async function submitReview(
  supabase: SupabaseClient<Database>,
  customerId: string,
  input: SubmitReviewInput
): Promise<ReviewDetail> {
  // 1. Rating validation
  if (!input.rating || input.rating < 1 || input.rating > 5 || !Number.isInteger(input.rating)) {
    throw new Error('Rating must be an integer between 1 and 5');
  }

  // 2. Images validation
  const images = input.images || [];
  if (images.length > MAX_IMAGES_COUNT) {
    throw new Error(`Maximum of ${MAX_IMAGES_COUNT} images allowed per review`);
  }

  for (const img of images) {
    if (img.mimeType && !ALLOWED_IMAGE_MIMES.has(img.mimeType.toLowerCase())) {
      throw new Error(`Invalid image type: ${img.mimeType}. Only JPEG, PNG, and WebP are supported.`);
    }
    if (img.fileSize && img.fileSize > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`Image exceeds the maximum allowed size of 5MB`);
    }
  }

  // 3. Eligibility check
  const eligibility = await checkReviewEligibility(supabase, customerId, input.orderId, input.productId);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason || 'Not eligible to review this product');
  }

  // 4. Insert review in 'pending' moderation status
  const { data: review, error: revErr } = await supabase
    .from('reviews')
    .insert({
      customer_id: customerId,
      order_id: input.orderId,
      product_id: input.productId,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
      status: 'pending',
    } as Database['public']['Tables']['reviews']['Insert'])
    .select('*')
    .single();

  if (revErr || !review) {
    throw new Error(`Failed to submit review: ${revErr?.message}`);
  }

  // 5. Insert images
  const insertedImages: { id: string; storagePath: string }[] = [];
  for (const img of images) {
    const { data: imgRow } = await supabase
      .from('review_images')
      .insert({
        review_id: review.id,
        storage_path: img.storagePath,
      } as Database['public']['Tables']['review_images']['Insert'])
      .select('id, storage_path')
      .single();

    if (imgRow) {
      insertedImages.push({
        id: imgRow.id,
        storagePath: imgRow.storage_path,
      });
    }
  }

  return {
    id: review.id,
    orderId: review.order_id,
    productId: review.product_id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    createdAt: review.created_at,
    images: insertedImages,
  };
}

/**
 * Fetches approved/published reviews for a product to display publicly.
 */
export async function getProductReviews(
  supabase: SupabaseClient<Database>,
  productId: string
): Promise<ReviewDetail[]> {
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error || !reviews) return [];

  const reviewIds = reviews.map((r) => r.id);
  const customerIds = Array.from(new Set(reviews.map((r) => r.customer_id)));

  const [{ data: images }, { data: customers }] = await Promise.all([
    reviewIds.length > 0
      ? supabase.from('review_images').select('*').in('review_id', reviewIds)
      : Promise.resolve({ data: [] }),
    customerIds.length > 0
      ? supabase.from('customers').select('id, first_name').in('id', customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const imageMap = new Map<string, { id: string; storagePath: string }[]>();
  for (const img of images || []) {
    if (!imageMap.has(img.review_id)) {
      imageMap.set(img.review_id, []);
    }
    imageMap.get(img.review_id)!.push({ id: img.id, storagePath: img.storage_path });
  }

  const customerMap = new Map((customers || []).map((c) => [c.id, c.first_name]));

  return reviews.map((r) => ({
    id: r.id,
    orderId: r.order_id,
    productId: r.product_id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
    customerName: customerMap.get(r.customer_id) || 'Verified Purchaser',
    images: imageMap.get(r.id) || [],
  }));
}

/**
 * Fetches all reviews written by a specific customer.
 */
export async function getCustomerReviews(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<ReviewDetail[]> {
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error || !reviews) return [];

  const reviewIds = reviews.map((r) => r.id);
  const { data: images } =
    reviewIds.length > 0
      ? await supabase.from('review_images').select('*').in('review_id', reviewIds)
      : { data: [] };

  const imageMap = new Map<string, { id: string; storagePath: string }[]>();
  for (const img of images || []) {
    if (!imageMap.has(img.review_id)) {
      imageMap.set(img.review_id, []);
    }
    imageMap.get(img.review_id)!.push({ id: img.id, storagePath: img.storage_path });
  }

  return reviews.map((r) => ({
    id: r.id,
    orderId: r.order_id,
    productId: r.product_id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
    images: imageMap.get(r.id) || [],
  }));
}
