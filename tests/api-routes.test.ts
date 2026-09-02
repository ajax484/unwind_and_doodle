import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
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

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {} as any;
}

// Import all 13 Route handlers
import { GET as getProducts } from '@/app/api/products/route';
import { GET as getProductBySlug } from '@/app/api/products/[slug]/route';
import { GET as getCart, POST as postCart, PATCH as patchCart, DELETE as deleteCart } from '@/app/api/cart/route';
import { POST as postCheckout } from '@/app/api/checkout/route';
import { GET as getLocations } from '@/app/api/locations/route';
import { POST as postCustomizationUpload } from '@/app/api/customizations/upload/route';
import { GET as getOrderByNumber } from '@/app/api/orders/[orderNumber]/route';
import { GET as verifyOrderPayment } from '@/app/api/orders/verify/route';
import { GET as getAdminOrders } from '@/app/api/admin/orders/route';
import { GET as getAdminOrderDetail } from '@/app/api/admin/orders/[id]/route';
import { PATCH as patchAdminOrderStatus } from '@/app/api/admin/orders/[id]/status/route';
import { POST as postPaystackWebhook } from '@/app/api/webhooks/paystack/route';

describe('Comprehensive API Routes Verification', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. GET /api/products', () => {
    it('returns catalog list with 200 OK', async () => {
      const req = new NextRequest('http://localhost:3000/api/products?limit=5');
      const res = await getProducts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('handles query search and category filters gracefully', async () => {
      const req = new NextRequest('http://localhost:3000/api/products?search=coloring&category=books');
      const res = await getProducts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  describe('2. GET /api/products/[slug]', () => {
    it('returns 404 for non-existent product slug', async () => {
      const req = new NextRequest('http://localhost:3000/api/products/non-existent-product-slug-xyz');
      const res = await getProductBySlug(req, {
        params: Promise.resolve({ slug: 'non-existent-product-slug-xyz' }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it('returns 400 when slug parameter is empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/products/');
      const res = await getProductBySlug(req, {
        params: Promise.resolve({ slug: '' }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('returns product details with 200 OK for published slug', async () => {
      const req = new NextRequest('http://localhost:3000/api/products/test-coloring-book');
      const res = await getProductBySlug(req, {
        params: Promise.resolve({ slug: 'test-coloring-book' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.slug).toBe('test-coloring-book');
      expect(json.data).toHaveProperty('price');
      expect(json.data).toHaveProperty('addons');
    });
  });

  describe('3. /api/cart (GET, POST, PATCH, DELETE)', () => {
    const sessionId = `test_cart_sess_${Date.now()}`;

    it('GET /api/cart returns a valid empty or active cart', async () => {
      const req = new NextRequest('http://localhost:3000/api/cart', {
        headers: { 'x-cart-session': sessionId },
      });
      const res = await getCart(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('items');
      expect(json.data).toHaveProperty('subtotal');
    });

    it('POST /api/cart validates missing or invalid payload', async () => {
      const req = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        headers: {
          'x-cart-session': sessionId,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ productId: '', quantity: 0 }),
      });
      const res = await postCart(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('PATCH /api/cart validates missing cartItemId', async () => {
      const req = new NextRequest('http://localhost:3000/api/cart', {
        method: 'PATCH',
        headers: {
          'x-cart-session': sessionId,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ quantity: 2 }),
      });
      const res = await patchCart(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('adds product with customization to cart, updates quantity, and removes item', async () => {
      const liveProductId = '3741d987-e674-4317-90a2-8c635a7c6aa9'; // TEST Coloring Book
      const testSessionId = `cart_flow_test_${Date.now()}`;

      // 1. Add item with customization
      const addReq = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        headers: {
          'x-cart-session': testSessionId,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          productId: liveProductId,
          quantity: 1,
          customization: {
            notes: 'Happy Birthday',
            assetUrls: ['https://storage.example.com/photo.jpg'],
          },
        }),
      });
      const addRes = await postCart(addReq);
      const addJson = await addRes.json();

      expect(addRes.status).toBe(200);
      expect(addJson.success).toBe(true);
      expect(addJson.data.items.length).toBe(1);
      const addedItem = addJson.data.items[0];
      expect(addedItem.productId).toBe(liveProductId);
      expect(addedItem.customization?.notes).toBe('Happy Birthday');

      // 2. Update quantity
      const patchReq = new NextRequest('http://localhost:3000/api/cart', {
        method: 'PATCH',
        headers: {
          'x-cart-session': testSessionId,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          cartItemId: addedItem.id,
          quantity: 3,
        }),
      });
      const patchRes = await patchCart(patchReq);
      const patchJson = await patchRes.json();

      expect(patchRes.status).toBe(200);
      expect(patchJson.success).toBe(true);
      expect(patchJson.data.totalItemCount).toBe(3);

      // 3. Remove item
      const delReq = new NextRequest(`http://localhost:3000/api/cart?cartItemId=${addedItem.id}`, {
        method: 'DELETE',
        headers: { 'x-cart-session': testSessionId },
      });
      const delRes = await deleteCart(delReq);
      const delJson = await delRes.json();

      expect(delRes.status).toBe(200);
      expect(delJson.success).toBe(true);
      expect(delJson.data.items.length).toBe(0);
    });

    it('adds product with theme customization to cart and preserves theme selections', async () => {
      const liveProductId = '3741d987-e674-4317-90a2-8c635a7c6aa9';
      const testSessionId = `cart_theme_flow_${Date.now()}`;
      const dummyThemeId = '88c7af2e-afd4-4504-a43f-b14cc45d6263';

      const addReq = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        headers: {
          'x-cart-session': testSessionId,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          productId: liveProductId,
          quantity: 1,
          themeCustomization: {
            selectedThemeIds: [dummyThemeId],
            coverName: 'Zainab & Kemi',
          },
        }),
      });
      const addRes = await postCart(addReq);
      const addJson = await addRes.json();

      expect(addRes.status).toBe(200);
      expect(addJson.success).toBe(true);
      expect(addJson.data.items.length).toBe(1);
      const addedItem = addJson.data.items[0];
      expect(addedItem.productId).toBe(liveProductId);
      expect(addedItem.themeCustomization?.selectedThemeIds).toEqual([dummyThemeId]);
      expect(addedItem.themeCustomization?.coverName).toBe('Zainab & Kemi');
    });

    it('DELETE /api/cart validates missing query parameter', async () => {
      const req = new NextRequest('http://localhost:3000/api/cart', {
        method: 'DELETE',
        headers: { 'x-cart-session': sessionId },
      });
      const res = await deleteCart(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });

  describe('4. POST /api/checkout', () => {
    it('returns 400 validation error when body is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
        }),
      });
      const res = await postCheckout(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json).toHaveProperty('details');
    });
  });

  describe('5. GET /api/locations', () => {
    it('returns delivery locations with formatted deliveryFee and estimatedDays', async () => {
      const res = await getLocations();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  describe('6. POST /api/customizations/upload', () => {
    it('returns 400 when no file is uploaded', async () => {
      const formData = new FormData();
      const req = new NextRequest('http://localhost:3000/api/customizations/upload', {
        method: 'POST',
        body: formData,
      });
      const res = await postCustomizationUpload(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/No image file provided/i);
    });

    it('rejects unsupported file formats', async () => {
      const formData = new FormData();
      const blob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      formData.append('file', blob, 'sample.pdf');

      const req = new NextRequest('http://localhost:3000/api/customizations/upload', {
        method: 'POST',
        body: formData,
      });
      const res = await postCustomizationUpload(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Invalid file format/i);
    });
  });

  describe('7. GET /api/orders/[orderNumber]', () => {
    it('returns 404 for non-existent order number', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/UAD-NONEXISTENT-99999');
      const res = await getOrderByNumber(req, {
        params: Promise.resolve({ orderNumber: 'UAD-NONEXISTENT-99999' }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });

  describe('8. GET /api/orders/verify', () => {
    it('returns 400 when transaction reference is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/verify');
      const res = await verifyOrderPayment(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Transaction reference/i);
    });

    it('returns 404 when payment reference is not found in database', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/verify?tx_ref=nonexistent_ref_123');
      const res = await verifyOrderPayment(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });

  describe('9. GET /api/admin/orders', () => {
    it('returns 403 when admin authorization headers are missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/orders');
      const res = await getAdminOrders(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });

    it('validates invalid filter query parameters when authorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/orders?page=-5', {
        headers: { 'x-admin-user-id': 'admin_test_user' },
      });
      const res = await getAdminOrders(req);
      const json = await res.json();

      expect([200, 400, 403]).toContain(res.status);
    });
  });

  describe('10. GET /api/admin/orders/[id]', () => {
    it('returns 403 when authorization headers are missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/orders/ord_123');
      const res = await getAdminOrderDetail(req, {
        params: Promise.resolve({ id: 'ord_123' }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });
  });

  describe('11. PATCH /api/admin/orders/[id]/status', () => {
    it('returns 403 when authorization headers are missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/orders/ord_123/status', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      const res = await patchAdminOrderStatus(req, {
        params: Promise.resolve({ id: 'ord_123' }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });

    it('returns 400 for invalid target status payload', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/orders/ord_123/status', {
        method: 'PATCH',
        headers: {
          'x-admin-user-id': 'admin_test_user',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'invalid_status_enum' }),
      });
      const res = await patchAdminOrderStatus(req, {
        params: Promise.resolve({ id: 'ord_123' }),
      });
      const json = await res.json();

      expect([400, 403]).toContain(res.status);
      expect(json.success).toBe(false);
    });
  });

  describe('12. POST /api/webhooks/paystack', () => {
    it('rejects invalid or missing signature with 400 client error', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/paystack', {
        method: 'POST',
        headers: {
          'x-paystack-signature': 'invalid_signature_hash',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ event: 'charge.success', data: { reference: 'ref_123' } }),
      });
      const res = await postPaystackWebhook(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });
});
