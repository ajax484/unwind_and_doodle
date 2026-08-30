import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import fs from 'fs';
import path from 'path';

// Load .env.local if present
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/(^["']|["']$)/g, '');
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {} as any;
}

const isLiveConfigured = Boolean(supabaseUrl && serviceRoleKey && !supabaseUrl.includes('placeholder'));

describe('Live Supabase Schema & RPC Verification', () => {
  it.runIf(isLiveConfigured)('connects and queries core tables successfully', async () => {
    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Verify products table
    const { data: products, error: prodErr } = await supabase.from('products').select('*').limit(1);
    expect(prodErr).toBeNull();
    console.log('LIVE PRODUCTS:', products?.[0]);

    const { data: pImages } = await supabase.from('product_images').select('*').limit(1);
    console.log('LIVE PRODUCT_IMAGES:', pImages?.[0] || 'empty');

    const { data: pAddons } = await supabase.from('product_addons').select('*').limit(1);
    console.log('LIVE PRODUCT_ADDONS:', pAddons?.[0] || 'empty');

    const { data: pCats } = await supabase.from('product_categories').select('*').limit(1);
    console.log('LIVE PRODUCT_CATEGORIES:', pCats?.[0] || 'empty');

    const { data: cats } = await supabase.from('categories').select('*').limit(1);
    console.log('LIVE CATEGORIES:', cats?.[0] || 'empty');

    const { data: locs } = await supabase.from('locations').select('*').limit(1);
    console.log('LIVE LOCATIONS:', locs?.[0] || 'empty');

    const { data: dRates } = await supabase.from('delivery_rates').select('*').limit(1);
    console.log('LIVE DELIVERY_RATES:', dRates?.[0] || 'empty');

    // 2. Verify warehouses table
    const { data: warehouses, error: whErr } = await supabase.from('warehouses').select('*').limit(5);
    expect(whErr).toBeNull();
    expect(Array.isArray(warehouses)).toBe(true);

    // 3. Verify locations table
    const { data: locations, error: locErr } = await supabase.from('locations').select('*').limit(5);
    expect(locErr).toBeNull();
    expect(Array.isArray(locations)).toBe(true);

    // 4. Verify warehouse_locations table
    const { data: whLocs, error: wlErr } = await supabase.from('warehouse_locations').select('*').limit(5);
    expect(wlErr).toBeNull();
    expect(Array.isArray(whLocs)).toBe(true);

    // 5. Verify inventory table
    const { data: inv, error: invErr } = await supabase.from('inventory').select('*').limit(5);
    expect(invErr).toBeNull();
    expect(Array.isArray(inv)).toBe(true);

    // 6. Verify delivery_rates table
    const { data: rates, error: rateErr } = await supabase.from('delivery_rates').select('*').limit(5);
    expect(rateErr).toBeNull();
    expect(Array.isArray(rates)).toBe(true);

    // 7. Verify orders table
    const { data: orders, error: ordErr } = await supabase.from('orders').select('*').limit(5);
    expect(ordErr).toBeNull();
    expect(Array.isArray(orders)).toBe(true);

    // 8. Verify payments table
    const { data: payments, error: payErr } = await supabase.from('payments').select('*').limit(5);
    expect(payErr).toBeNull();
    expect(Array.isArray(payments)).toBe(true);

    // 9. Verify domain_events table
    const { data: events, error: eventErr } = await supabase.from('domain_events').select('*').limit(5);
    expect(eventErr).toBeNull();
    expect(Array.isArray(events)).toBe(true);

    // 10. Verify inventory_reservations table
    const { data: reservations, error: resErr } = await supabase.from('inventory_reservations').select('*').limit(5);
    expect(resErr).toBeNull();
    expect(Array.isArray(reservations)).toBe(true);
  }, 20000);

  it.runIf(isLiveConfigured)('tests getPublishedCatalog and getCartDetails on live DB', async () => {
    const { getPublishedCatalog } = await import('@/services/catalog.service');
    const { getCartDetails } = await import('@/services/cart.service');
    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const catalog = await getPublishedCatalog(supabase);
    console.log('LIVE CATALOG COUNT:', catalog.length);
    expect(Array.isArray(catalog)).toBe(true);

    const cart = await getCartDetails(supabase, 'test-sess-live-01');
    console.log('LIVE CART ITEMS:', cart.items.length);
    expect(cart).toBeDefined();

    // Clean up test cart
    await supabase.from('carts').delete().eq('session_id', 'test-sess-live-01');
  }, 20000);

  it.runIf(isLiveConfigured)('verifies PostgreSQL RPC function existence (expire_inventory_reservations)', async () => {
    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // expire_inventory_reservations() takes 0 arguments and safely expires old reservations
    const { data, error } = await supabase.rpc('expire_inventory_reservations');
    expect(error).toBeNull();
    expect(typeof data === 'number' || data === null).toBe(true);
  }, 20000);
});
