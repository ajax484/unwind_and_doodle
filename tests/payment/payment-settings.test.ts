import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  getPaymentMethods,
  getEnabledPaymentMethods,
  getPublicPaymentMethods,
  getBankTransferSettings,
  updatePaymentMethod,
} from '@/services/payment-settings.service';
import { GET as adminGetPaymentMethods, PUT as adminPutPaymentMethods } from '@/app/api/admin/settings/payment-methods/route';
import { GET as publicGetPaymentMethods } from '@/app/api/payment-methods/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/client', () => ({
  getServiceSupabaseClient: vi.fn(),
  getAnonSupabaseClient: vi.fn(),
}));

import { getServiceSupabaseClient } from '@/lib/supabase/client';

describe('Payment Settings and Multi-Provider Configuration (Step 2)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const orgId = 'org-settings-test-123';
  const otherOrgId = 'org-other-456';
  const adminUserId = 'user-admin-1';
  const staffUserId = 'user-staff-2';

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgId, name: 'Unwind and Doodle Test Store', slug: 'unwind-test' },
        { id: otherOrgId, name: 'Another Merchant Store', slug: 'other-store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgId, user_id: adminUserId, role: 'owner' },
        { id: 'mem-2', organization_id: orgId, user_id: staffUserId, role: 'staff' },
      ],
      organization_payment_methods: [],
      payments: [
        {
          id: 'pay-historical-1',
          order_id: 'ord-hist-1',
          provider: 'paystack',
          provider_payment_id: 'pstk_123456',
          status: 'success',
          amount: 25000,
          currency: 'NGN',
          created_at: '2026-09-01T10:00:00Z',
          updated_at: '2026-09-01T10:00:00Z',
        },
      ],
    });

    vi.mocked(getServiceSupabaseClient).mockImplementation(() => mockSupabase as any);
  });

  it('provides safe backwards-compatible defaults for a new organization (Paystack enabled, FLW & Manual disabled)', async () => {
    const methods = await getPaymentMethods(mockSupabase as any, orgId);

    expect(methods).toHaveLength(3);

    const paystack = methods.find((m) => m.provider === 'paystack');
    const flutterwave = methods.find((m) => m.provider === 'flutterwave');
    const manual = methods.find((m) => m.provider === 'manual');

    expect(paystack?.enabled).toBe(true);
    expect(flutterwave?.enabled).toBe(false);
    expect(manual?.enabled).toBe(false);

    const enabled = await getEnabledPaymentMethods(mockSupabase as any, orgId);
    expect(enabled).toEqual(['paystack']);
  });

  it('allows multiple payment methods to be enabled simultaneously', async () => {
    // Enable Flutterwave
    await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      {
        provider: 'flutterwave',
        enabled: true,
      },
      adminUserId
    );

    const enabled = await getEnabledPaymentMethods(mockSupabase as any, orgId);
    expect(enabled).toContain('paystack');
    expect(enabled).toContain('flutterwave');
    expect(enabled).toHaveLength(2);
  });

  it('prevents disabling all payment methods (at least one must stay enabled)', async () => {
    // Current state: only Paystack is enabled. Attempt to disable Paystack
    await expect(
      updatePaymentMethod(
        mockSupabase as any,
        orgId,
        {
          provider: 'paystack',
          enabled: false,
        },
        adminUserId
      )
    ).rejects.toThrow('You must keep at least one payment method enabled.');

    // Now enable Flutterwave first
    await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      {
        provider: 'flutterwave',
        enabled: true,
      },
      adminUserId
    );

    // Now disabling Paystack should succeed since Flutterwave is enabled
    const updatedPaystack = await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      {
        provider: 'paystack',
        enabled: false,
      },
      adminUserId
    );

    expect(updatedPaystack.enabled).toBe(false);

    const enabledAfter = await getEnabledPaymentMethods(mockSupabase as any, orgId);
    expect(enabledAfter).toEqual(['flutterwave']);
  });

  it('requires valid bank details before bank transfer can be enabled', async () => {
    // Attempt to enable manual bank transfer without bank details
    await expect(
      updatePaymentMethod(
        mockSupabase as any,
        orgId,
        {
          provider: 'manual',
          enabled: true,
          bankName: '',
          accountName: '',
          accountNumber: '',
        },
        adminUserId
      )
    ).rejects.toThrow('Bank name, account name, and account number are required to enable bank transfer.');

    // Enabling with complete bank details succeeds
    const updatedManual = await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      {
        provider: 'manual',
        enabled: true,
        bankName: 'Guaranty Trust Bank (GTB)',
        accountName: 'Unwind & Doodle Enterprise',
        accountNumber: '0123456789',
        instructions: 'Please include your Order ID in the transfer narration.',
      },
      adminUserId
    );

    expect(updatedManual.enabled).toBe(true);
    expect(updatedManual.bankName).toBe('Guaranty Trust Bank (GTB)');
    expect(updatedManual.accountName).toBe('Unwind & Doodle Enterprise');
    expect(updatedManual.accountNumber).toBe('0123456789');

    // Check bank transfer settings helper
    const bankSettings = await getBankTransferSettings(mockSupabase as any, orgId);
    expect(bankSettings).toEqual({
      bankName: 'Guaranty Trust Bank (GTB)',
      accountName: 'Unwind & Doodle Enterprise',
      accountNumber: '0123456789',
      instructions: 'Please include your Order ID in the transfer narration.',
    });

    // Check public payment methods helper (for checkout)
    const publicMethods = await getPublicPaymentMethods(mockSupabase as any, orgId);
    const manualPublic = publicMethods.find((p) => p.provider === 'manual');
    expect(manualPublic?.enabled).toBe(true);
    expect(manualPublic?.bankDetails).toEqual({
      bankName: 'Guaranty Trust Bank (GTB)',
      accountName: 'Unwind & Doodle Enterprise',
      accountNumber: '0123456789',
      instructions: 'Please include your Order ID in the transfer narration.',
    });
  });

  it('ensures changing merchant payment methods NEVER alters historical payment records', async () => {
    // Get historical payment before changes
    const { data: beforePayments } = await mockSupabase
      .from('payments')
      .select('*')
      .eq('id', 'pay-historical-1');
    expect(beforePayments?.[0].provider).toBe('paystack');

    // Change merchant configuration: Disable Paystack and enable Flutterwave & Manual
    await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      { provider: 'flutterwave', enabled: true },
      adminUserId
    );
    await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      {
        provider: 'manual',
        enabled: true,
        bankName: 'Zenith Bank',
        accountName: 'U&D Stores',
        accountNumber: '2001122334',
      },
      adminUserId
    );
    await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      { provider: 'paystack', enabled: false },
      adminUserId
    );

    // Verify historical payment record remains 100% immutable
    const { data: afterPayments } = await mockSupabase
      .from('payments')
      .select('*')
      .eq('id', 'pay-historical-1');
    expect(afterPayments?.[0].provider).toBe('paystack');
    expect(afterPayments?.[0].status).toBe('success');
    expect(afterPayments?.[0].amount).toBe(25000);
  });

  it('admin API route validates permissions and handles GET/PUT properly', async () => {
    // Staff user (non-admin/owner) cannot update payment methods
    const putStaffReq = new NextRequest('http://localhost:3000/api/admin/settings/payment-methods', {
      method: 'PUT',
      headers: {
        'x-admin-user-id': staffUserId,
        'x-organization-id': orgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'flutterwave',
        enabled: true,
      }),
    });

    const staffRes = await adminPutPaymentMethods(putStaffReq);
    expect(staffRes.status).toBe(403);

    // Admin user CAN update payment methods
    const putAdminReq = new NextRequest('http://localhost:3000/api/admin/settings/payment-methods', {
      method: 'PUT',
      headers: {
        'x-admin-user-id': adminUserId,
        'x-organization-id': orgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'flutterwave',
        enabled: true,
      }),
    });

    const adminRes = await adminPutPaymentMethods(putAdminReq);
    expect(adminRes.status).toBe(200);
    const adminJson = await adminRes.json();
    expect(adminJson.success).toBe(true);
    expect(adminJson.data.provider).toBe('flutterwave');
    expect(adminJson.data.enabled).toBe(true);

    // Public payment methods GET route returns enabled methods
    const publicReq = new NextRequest(`http://localhost:3000/api/payment-methods?organizationId=${orgId}`, {
      method: 'GET',
    });
    const publicRes = await publicGetPaymentMethods(publicReq);
    expect(publicRes.status).toBe(200);
    const publicJson = await publicRes.json();
    expect(publicJson.success).toBe(true);
    const publicProviders = publicJson.data.map((p: any) => p.provider);
    expect(publicProviders).toContain('paystack');
    expect(publicProviders).toContain('flutterwave');
  });
});
