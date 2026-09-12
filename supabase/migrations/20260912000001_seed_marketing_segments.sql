-- ============================================================================
-- Migration: Seed Standard Marketing Segments
-- Inserts 6 standard customer segments for all existing organizations idempotently.
-- ============================================================================

DO $$
DECLARE
  org RECORD;
  cutoff_date TEXT;
BEGIN
  -- Default cutoff for haven't purchased recently (90 days prior)
  cutoff_date := TO_CHAR(NOW() - INTERVAL '90 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  FOR org IN SELECT id FROM public.organizations LOOP
    -- 1. All Email Subscribers
    IF NOT EXISTS (
      SELECT 1 FROM public.marketing_segments 
      WHERE organization_id = org.id AND name = 'All Email Subscribers'
    ) THEN
      INSERT INTO public.marketing_segments (organization_id, name, description, rules, active)
      VALUES (
        org.id,
        'All Email Subscribers',
        'All customers who have opted in to email marketing communications.',
        '{"match": "all", "conditions": [{"field": "email_marketing_consent", "operator": "equals", "value": true}]}'::jsonb,
        TRUE
      );
    END IF;

    -- 2. New Customers
    IF NOT EXISTS (
      SELECT 1 FROM public.marketing_segments 
      WHERE organization_id = org.id AND name = 'New Customers'
    ) THEN
      INSERT INTO public.marketing_segments (organization_id, name, description, rules, active)
      VALUES (
        org.id,
        'New Customers',
        'First-time buyers who have placed exactly 1 order.',
        '{"match": "all", "conditions": [{"field": "order_count", "operator": "equals", "value": 1}]}'::jsonb,
        TRUE
      );
    END IF;

    -- 3. Never Purchased
    IF NOT EXISTS (
      SELECT 1 FROM public.marketing_segments 
      WHERE organization_id = org.id AND name = 'Never Purchased'
    ) THEN
      INSERT INTO public.marketing_segments (organization_id, name, description, rules, active)
      VALUES (
        org.id,
        'Never Purchased',
        'Opted-in subscribers who have not placed any orders yet.',
        '{"match": "all", "conditions": [{"field": "order_count", "operator": "equals", "value": 0}]}'::jsonb,
        TRUE
      );
    END IF;

    -- 4. Repeat Customers
    IF NOT EXISTS (
      SELECT 1 FROM public.marketing_segments 
      WHERE organization_id = org.id AND name = 'Repeat Customers'
    ) THEN
      INSERT INTO public.marketing_segments (organization_id, name, description, rules, active)
      VALUES (
        org.id,
        'Repeat Customers',
        'Loyal customers who have placed 2 or more orders.',
        '{"match": "all", "conditions": [{"field": "order_count", "operator": "greater_than_or_equal", "value": 2}]}'::jsonb,
        TRUE
      );
    END IF;

    -- 5. High-Value Customers
    IF NOT EXISTS (
      SELECT 1 FROM public.marketing_segments 
      WHERE organization_id = org.id AND name = 'High-Value Customers'
    ) THEN
      INSERT INTO public.marketing_segments (organization_id, name, description, rules, active)
      VALUES (
        org.id,
        'High-Value Customers',
        'Top spending customers with cumulative purchases of ₦50,000 or more.',
        '{"match": "all", "conditions": [{"field": "total_spent", "operator": "greater_than_or_equal", "value": 50000}]}'::jsonb,
        TRUE
      );
    END IF;

    -- 6. Customers Who Haven't Purchased Recently
    IF NOT EXISTS (
      SELECT 1 FROM public.marketing_segments 
      WHERE organization_id = org.id AND name = 'Customers Who Haven''t Purchased Recently'
    ) THEN
      INSERT INTO public.marketing_segments (organization_id, name, description, rules, active)
      VALUES (
        org.id,
        'Customers Who Haven''t Purchased Recently',
        'Lapsed customers with prior purchases whose last order was placed more than 90 days ago.',
        jsonb_build_object(
          'match', 'all',
          'conditions', jsonb_build_array(
            jsonb_build_object('field', 'order_count', 'operator', 'greater_than_or_equal', 'value', 1),
            jsonb_build_object('field', 'last_order_at', 'operator', 'before', 'value', cutoff_date)
          )
        ),
        TRUE
      );
    END IF;

  END LOOP;
END $$;
