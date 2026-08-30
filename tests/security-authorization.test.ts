import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
} from '@/services/customer-account.service';
import { submitReview } from '@/services/review.service';
import { reorderPastOrder } from '@/services/reorder.service';
import { verifyOrderAccessToken } from '@/lib/order-token';

describe('Phase 5 Security & Authorization (IDOR Defense)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      customers: [
        {
          id: 'cust-alice',
          email: 'alice@example.com',
          user_id: 'auth-alice',
          first_name: 'Alice',
          last_name: 'Wonder',
        },
        {
          id: 'cust-bob',
          email: 'bob@example.com',
          user_id: 'auth-bob',
          first_name: 'Bob',
          last_name: 'Builder',
        },
      ],
      orders: [
        {
          id: 'ord-alice-101',
          order_number: 'CB-ALICE-101',
          customer_id: 'cust-alice',
          status: 'received',
          subtotal: 10000,
          total: 11500,
          email: 'alice@example.com',
        },
        {
          id: 'ord-bob-202',
          order_number: 'CB-BOB-202',
          customer_id: 'cust-bob',
          status: 'received',
          subtotal: 20000,
          total: 22000,
          email: 'bob@example.com',
        },
      ],
      order_items: [
        {
          id: 'item-bob-01',
          order_id: 'ord-bob-202',
          product_id: 'prod-secret-book',
          product_name: 'Secret Coloring Book',
          quantity: 1,
          unit_price: 20000,
          total: 20000,
        },
      ],
      customer_addresses: [
        {
          id: 'addr-bob-01',
          customer_id: 'cust-bob',
          recipient_name: 'Bob Secret Vault',
          phone: '08099990000',
          address_line_1: '100 Secret Road',
          state: 'Abuja',
          is_default: true,
        },
      ],
    });
  });

  describe('1. Address IDOR Security', () => {
    it('prevents Customer Alice from modifying Customer Bob address', async () => {
      await expect(
        updateCustomerAddress(mockSupabase as any, 'cust-alice', 'addr-bob-01', {
          recipientName: 'Hacked Recipient',
        })
      ).rejects.toThrow('Address not found or unauthorized');

      const bobAddr = mockSupabase._store.customer_addresses.find((a) => a.id === 'addr-bob-01');
      expect(bobAddr?.recipient_name).toBe('Bob Secret Vault');
    });

    it('prevents Customer Alice from deleting Customer Bob address', async () => {
      await deleteCustomerAddress(mockSupabase as any, 'cust-alice', 'addr-bob-01');

      // Bob's address should still exist
      const bobAddr = mockSupabase._store.customer_addresses.find((a) => a.id === 'addr-bob-01');
      expect(bobAddr).toBeDefined();
    });

    it('prevents Customer Alice from setting Customer Bob address as default', async () => {
      await expect(
        setDefaultCustomerAddress(mockSupabase as any, 'cust-alice', 'addr-bob-01')
      ).rejects.toThrow('Address not found or unauthorized');
    });
  });

  describe('2. Order & Reorder IDOR Security', () => {
    it('prevents Customer Alice from reordering Customer Bob past purchases', async () => {
      await expect(
        reorderPastOrder(mockSupabase as any, {
          customerId: 'cust-alice',
          orderIdentifier: 'CB-BOB-202',
          sessionId: 'sess-alice-attacker',
        })
      ).rejects.toThrow('Unauthorized: This order does not belong to your account');
    });
  });

  describe('3. Review Spoofing Security', () => {
    it('prevents Customer Alice from submitting a review on Customer Bob order', async () => {
      await expect(
        submitReview(mockSupabase as any, 'cust-alice', {
          orderId: 'ord-bob-202',
          productId: 'prod-secret-book',
          rating: 1,
          body: 'Fake malicious review',
        })
      ).rejects.toThrow('Order does not belong to this customer');
    });
  });

  describe('4. Secure Order Access Token Validation', () => {
    it('rejects access when token order number does not match requested order', () => {
      const token = verifyOrderAccessToken('invalid.token.payload', 'CB-BOB-202');
      expect(token.valid).toBe(false);
    });
  });
});
