-- Migration: Add review_requested_at to orders table
-- Tracks when a review request email / notification was sent for an order

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_review_requested_at 
ON public.orders(review_requested_at);

COMMENT ON COLUMN public.orders.review_requested_at IS 'Timestamp when a review request was dispatched to the customer for this order.';
