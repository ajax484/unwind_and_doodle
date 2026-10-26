import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import {
  AdminReviewFilterInput,
  AdminReviewListResponse,
  AdminReviewListItem,
  AdminReviewDetail,
  AdminReviewImageItem,
  CreateManualReviewInput,
} from '@/types/admin-review-customization';
import { publishDomainEvent } from './events.service';

/**
 * Lists organization reviews with search, filters, pagination, and rating KPIs.
 */
export async function listAdminReviews(
  supabase: SupabaseClient<Database>,
  filters: AdminReviewFilterInput & { organizationId: string }
): Promise<AdminReviewListResponse> {
  const { organizationId, search, status, rating, productId, page = 1, limit = 25 } = filters;

  // 1. Fetch organization products
  const { data: orgProducts } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('organization_id', organizationId);

  const orgProductMap = new Map((orgProducts || []).map((p) => [p.id, p]));
  const orgProductIds = Array.from(orgProductMap.keys());

  if (orgProductIds.length === 0) {
    return {
      reviews: [],
      summary: {
        totalReviews: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        averageRating: 5.0,
      },
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    };
  }

  // 2. Fetch all reviews for organization products
  const { data: rawReviews, error: revErr } = await supabase
    .from('reviews')
    .select('*')
    .in('product_id', orgProductIds);

  if (revErr) {
    throw new Error(`Failed to fetch reviews: ${revErr.message}`);
  }

  const allReviews = rawReviews || [];
  if (allReviews.length === 0) {
    return {
      reviews: [],
      summary: {
        totalReviews: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        averageRating: 5.0,
      },
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    };
  }

  // 3. Fetch related customers, orders, and images
  const customerIds = Array.from(new Set(allReviews.map((r) => r.customer_id).filter(Boolean))) as string[];
  const orderIds = Array.from(new Set(allReviews.map((r) => r.order_id).filter(Boolean))) as string[];
  const reviewIds = allReviews.map((r) => r.id);

  const [{ data: customers }, { data: orders }, { data: images }] = await Promise.all([
    customerIds.length > 0
      ? supabase.from('customers').select('id, first_name, last_name, email').in('id', customerIds)
      : Promise.resolve({ data: [] }),
    orderIds.length > 0
      ? supabase.from('orders').select('id, order_number').in('id', orderIds)
      : Promise.resolve({ data: [] }),
    reviewIds.length > 0
      ? supabase.from('review_images').select('id, review_id, storage_path').in('review_id', reviewIds)
      : Promise.resolve({ data: [] }),
  ]);

  const customerMap = new Map((customers || []).map((c) => [c.id, c]));
  const orderMap = new Map((orders || []).map((o) => [o.id, o]));

  const imageCountMap = new Map<string, number>();
  for (const img of images || []) {
    imageCountMap.set(img.review_id, (imageCountMap.get(img.review_id) || 0) + 1);
  }

  // 4. Map reviews
  const mappedList: AdminReviewListItem[] = allReviews.map((r) => {
    const prod = orgProductMap.get(r.product_id);
    const cust = r.customer_id ? customerMap.get(r.customer_id) : null;
    const ord = r.order_id ? orderMap.get(r.order_id) : null;

    const custName = r.reviewer_name || (cust
      ? `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || cust.email
      : 'Unknown Customer');

    return {
      id: r.id,
      customerId: r.customer_id,
      customerName: custName,
      customerEmail: cust?.email || 'N/A',
      productId: r.product_id,
      productName: prod?.name || 'Unknown Product',
      productSlug: prod?.slug || '',
      orderId: r.order_id,
      orderNumber: ord?.order_number || (r.order_id ? r.order_id.substring(0, 8).toUpperCase() : null),
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      imagesCount: imageCountMap.get(r.id) || 0,
      publishedAt: r.published_at,
      createdAt: r.created_at,
      isManual: r.is_manual ?? false,
      source: r.source ?? null,
    };
  });

  // 5. Calculate KPI summaries
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let totalRatingSum = 0;

  for (const r of mappedList) {
    if (r.status === 'pending') pendingCount++;
    else if (r.status === 'approved') approvedCount++;
    else if (r.status === 'rejected') rejectedCount++;

    totalRatingSum += r.rating;
  }

  const averageRating =
    mappedList.length > 0
      ? Math.round((totalRatingSum / mappedList.length) * 10) / 10
      : 5.0;

  // 6. Apply Search & Filters
  let filtered = mappedList;

  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q) ||
        r.customerEmail.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.body && r.body.toLowerCase().includes(q))
    );
  }

  if (status && status !== 'all') {
    filtered = filtered.filter((r) => r.status === status);
  }

  if (rating) {
    filtered = filtered.filter((r) => r.rating === rating);
  }

  if (productId) {
    filtered = filtered.filter((r) => r.productId === productId);
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 7. Paginate
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    reviews: paginated,
    summary: {
      totalReviews: mappedList.length,
      pendingCount,
      approvedCount,
      rejectedCount,
      averageRating,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves detailed review information with customer info, order details, and image URLs.
 */
export async function getAdminReviewDetail(
  supabase: SupabaseClient<Database>,
  reviewId: string,
  organizationId: string
): Promise<AdminReviewDetail> {
  // 1. Fetch review
  const { data: review, error: revErr } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (revErr || !review) {
    throw new Error(`Review not found: ${reviewId}`);
  }

  // 2. Fetch product and verify organization ownership
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, name, slug, organization_id')
    .eq('id', review.product_id)
    .single();

  if (prodErr || !product || product.organization_id !== organizationId) {
    throw new Error('Forbidden: Review belongs to another organization');
  }

  // 3. Fetch customer, order, and review images
  const [{ data: customer }, { data: order }, { data: images }] = await Promise.all([
    review.customer_id
      ? supabase
          .from('customers')
          .select('id, first_name, last_name, email')
          .eq('id', review.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    review.order_id
      ? supabase
          .from('orders')
          .select('id, order_number, status')
          .eq('id', review.order_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('review_images')
      .select('id, storage_path, created_at')
      .eq('review_id', review.id),
  ]);

  const customerName = review.reviewer_name || (customer
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email
    : 'Unknown Customer');

  const imageItems: AdminReviewImageItem[] = (images || []).map((img) => ({
    id: img.id,
    storagePath: img.storage_path,
    url: img.storage_path.startsWith('http')
      ? img.storage_path
      : `/api/admin/reviews/${review.id}/images/${img.id}/url`,
    createdAt: img.created_at,
  }));

  return {
    id: review.id,
    customerId: review.customer_id,
    customerName,
    customerEmail: customer?.email || 'N/A',
    productId: review.product_id,
    productName: product.name,
    productSlug: product.slug,
    orderId: review.order_id,
    orderNumber: order?.order_number || (review.order_id ? review.order_id.substring(0, 8).toUpperCase() : 'N/A'),
    orderStatus: order?.status || 'N/A',
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    publishedAt: review.published_at,
    createdAt: review.created_at,
    images: imageItems,
    isManual: review.is_manual ?? false,
    source: review.source ?? null,
  };
}

/**
 * Moderates a review by setting status to 'approved' (and setting published_at = now())
 * or 'rejected' (clearing published_at).
 */
export async function moderateReview(
  supabase: SupabaseClient<Database>,
  reviewId: string,
  action: 'approve' | 'reject',
  reason: string | undefined,
  adminUserId: string,
  organizationId: string
) {
  const detail = await getAdminReviewDetail(supabase, reviewId, organizationId);

  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  const publishedAt = action === 'approve' ? new Date().toISOString() : null;

  const { data: updated, error: updateErr } = await supabase
    .from('reviews')
    .update({
      status: nextStatus,
      published_at: publishedAt,
    } as Database['public']['Tables']['reviews']['Update'])
    .eq('id', reviewId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to moderate review: ${updateErr?.message}`);
  }

  // Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: action === 'approve' ? 'review.approved' : 'review.rejected',
    entity_type: 'review',
    entity_id: reviewId,
    before_data: { status: detail.status, published_at: detail.publishedAt },
    after_data: { status: nextStatus, published_at: publishedAt, reason: reason || null },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // Emit domain event
  await publishDomainEvent(supabase, {
    eventType: 'review.moderated',
    aggregateType: 'review',
    aggregateId: reviewId,
    payload: {
      reviewId,
      productId: detail.productId,
      customerId: detail.customerId,
      action,
      status: nextStatus,
      publishedAt,
      reason: reason || null,
      moderatedBy: adminUserId,
      organizationId,
    },
  });

  return updated;
}

/**
 * Deletes a review image from database and logs audit trail.
 */
export async function deleteReviewImage(
  supabase: SupabaseClient<Database>,
  reviewId: string,
  imageId: string,
  adminUserId: string,
  organizationId: string
) {
  await getAdminReviewDetail(supabase, reviewId, organizationId);

  const { error: delErr } = await supabase
    .from('review_images')
    .delete()
    .eq('id', imageId)
    .eq('review_id', reviewId);

  if (delErr) {
    throw new Error(`Failed to delete review image: ${delErr.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'review.image_deleted',
    entity_type: 'review_image',
    entity_id: imageId,
    before_data: null,
    after_data: { reviewId, imageId } as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return { success: true };
}

/**
 * Creates a manual review entered by an administrator.
 */
export async function createManualReview(
  supabase: SupabaseClient<Database>,
  input: CreateManualReviewInput,
  adminUserId: string,
  organizationId: string
): Promise<AdminReviewDetail> {
  // 1. Verify product belongs to this organization
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, name, slug, organization_id')
    .eq('id', input.productId)
    .single();

  if (prodErr || !product || product.organization_id !== organizationId) {
    throw new Error('Forbidden: Selected product does not belong to your organization');
  }

  // 2. If orderId is provided, verify order belongs to this organization
  let resolvedCustomerId = input.customerId || null;
  if (input.orderId) {
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('id, customer_id, organization_id')
      .eq('id', input.orderId)
      .maybeSingle();

    if (ordErr || !order || order.organization_id !== organizationId) {
      throw new Error('Invalid or unauthorized order ID');
    }
    if (!resolvedCustomerId && order.customer_id) {
      resolvedCustomerId = order.customer_id;
    }
  }

  // 3. Prepare status & publication timestamp
  const status = input.status || 'approved';
  const publishedAt = status === 'approved' ? new Date().toISOString() : null;
  const createdAt = input.createdAt ? new Date(input.createdAt).toISOString() : new Date().toISOString();

  // 4. Insert review
  const { data: inserted, error: insertErr } = await supabase
    .from('reviews')
    .insert({
      product_id: input.productId,
      customer_id: resolvedCustomerId,
      order_id: input.orderId || null,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      status,
      reviewer_name: input.reviewerName.trim(),
      is_manual: true,
      source: input.source?.trim() || null,
      created_at: createdAt,
      published_at: publishedAt,
    } as Database['public']['Tables']['reviews']['Insert'])
    .select()
    .single();

  if (insertErr || !inserted) {
    throw new Error(`Failed to create manual review: ${insertErr?.message}`);
  }

  // 5. Insert images if any
  const images = input.images || [];
  for (const img of images) {
    await supabase
      .from('review_images')
      .insert({
        review_id: inserted.id,
        storage_path: img.storagePath,
      } as Database['public']['Tables']['review_images']['Insert']);
  }

  // 6. Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'review.manual_created' as any,
    entity_type: 'review',
    entity_id: inserted.id,
    before_data: null,
    after_data: {
      reviewId: inserted.id,
      productId: inserted.product_id,
      rating: inserted.rating,
      status: inserted.status,
      reviewerName: input.reviewerName,
      isManual: true,
      source: input.source || null,
    } as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // 7. Emit domain event
  await publishDomainEvent(supabase, {
    eventType: status === 'approved' ? 'review.moderated' : 'review.created',
    aggregateType: 'review',
    aggregateId: inserted.id,
    organizationId,
    payload: {
      reviewId: inserted.id,
      productId: inserted.product_id,
      customerId: resolvedCustomerId,
      rating: inserted.rating,
      status: inserted.status,
      isManual: true,
      source: input.source || null,
      moderatedBy: adminUserId,
      organizationId,
    },
  });

  return getAdminReviewDetail(supabase, inserted.id, organizationId);
}
