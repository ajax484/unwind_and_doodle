import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { PAYMENT_STATUS } from '@/lib/constants';

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS] | string;

export class InvalidPaymentTransitionError extends Error {
  public fromStatus: string;
  public toStatus: string;
  public paymentId: string;

  constructor(fromStatus: string, toStatus: string, paymentId: string, customMessage?: string) {
    const msg =
      customMessage ||
      `Invalid payment state transition from '${fromStatus}' to '${toStatus}' for payment ${paymentId}`;
    super(msg);
    this.name = 'InvalidPaymentTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.paymentId = paymentId;
  }
}

/**
 * Strict state transition matrix for payment entities.
 * Prevents accidental regressions or illegal mutations (e.g. successful -> failed, refunded -> successful).
 */
export const ALLOWED_PAYMENT_TRANSITIONS: Record<string, string[]> = {
  [PAYMENT_STATUS.PENDING]: [
    PAYMENT_STATUS.SUCCESSFUL,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.REFUNDED,
    'cancelled',
    'processing',
  ],
  processing: [
    PAYMENT_STATUS.SUCCESSFUL,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.PENDING,
    'cancelled',
  ],
  [PAYMENT_STATUS.SUCCESSFUL]: [
    PAYMENT_STATUS.REFUNDED,
  ],
  [PAYMENT_STATUS.FAILED]: [
    PAYMENT_STATUS.PENDING, // Customer checkout retry
  ],
  [PAYMENT_STATUS.REFUNDED]: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Validates whether a payment transition from currentStatus to targetStatus is legally permitted.
 */
export function validatePaymentTransition(
  fromStatus: string,
  toStatus: string,
  paymentId: string = 'unknown'
): boolean {
  if (fromStatus === toStatus) {
    return true; // Idempotent no-op
  }

  const allowed = ALLOWED_PAYMENT_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new InvalidPaymentTransitionError(fromStatus, toStatus, paymentId);
  }

  return true;
}

export interface TransitionPaymentParams {
  supabase: SupabaseClient<Database>;
  paymentId: string;
  toStatus: string;
  expectedCurrentStatus?: string | string[];
  metadataUpdates?: Record<string, unknown>;
  paidAt?: string | null;
  reason?: string;
  actorId?: string | null;
}

export interface TransitionPaymentResult {
  success: boolean;
  alreadyInTargetStatus: boolean;
  fromStatus: string;
  toStatus: string;
  payment: Database['public']['Tables']['payments']['Row'];
}

/**
 * Atomically transitions a payment's status using optimistic concurrency control (compare-and-swap).
 * Protects against race conditions between webhook handlers and return callback verifications.
 */
export async function transitionPaymentStatus(
  params: TransitionPaymentParams
): Promise<TransitionPaymentResult> {
  const {
    supabase,
    paymentId,
    toStatus,
    expectedCurrentStatus,
    metadataUpdates = {},
    paidAt,
  } = params;

  // 1. Fetch current payment record
  const { data: currentPayment, error: fetchErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (fetchErr || !currentPayment) {
    throw new Error(`Payment record not found: ${paymentId}`);
  }

  const fromStatus = currentPayment.status;

  // 2. Check if already in target state (idempotent success)
  if (fromStatus === toStatus) {
    return {
      success: true,
      alreadyInTargetStatus: true,
      fromStatus,
      toStatus,
      payment: currentPayment,
    };
  }

  // 3. Validate state transition rules
  validatePaymentTransition(fromStatus, toStatus, paymentId);

  // If specific expected current status was required, verify it
  if (expectedCurrentStatus) {
    const expectedList = Array.isArray(expectedCurrentStatus)
      ? expectedCurrentStatus
      : [expectedCurrentStatus];
    if (!expectedList.includes(fromStatus)) {
      throw new InvalidPaymentTransitionError(
        fromStatus,
        toStatus,
        paymentId,
        `Expected payment ${paymentId} to be in status [${expectedList.join(', ')}], but found '${fromStatus}'`
      );
    }
  }

  // 4. Merge metadata
  const existingMeta =
    currentPayment.metadata && typeof currentPayment.metadata === 'object' && !Array.isArray(currentPayment.metadata)
      ? (currentPayment.metadata as Record<string, unknown>)
      : {};

  const mergedMetadata: Record<string, unknown> = {
    ...existingMeta,
    ...metadataUpdates,
    last_status_transition: {
      from: fromStatus,
      to: toStatus,
      timestamp: new Date().toISOString(),
      reason: params.reason || null,
    },
  };

  const updatePayload: Record<string, unknown> = {
    status: toStatus,
    metadata: mergedMetadata,
  };

  if (paidAt !== undefined) {
    updatePayload.paid_at = paidAt;
  }

  // 5. Execute atomic conditional update (guarded by status === fromStatus)
  const { data: updatedPayment, error: updateErr } = await supabase
    .from('payments')
    .update(updatePayload as unknown as Database['public']['Tables']['payments']['Update'])
    .eq('id', paymentId)
    .eq('status', fromStatus) // Guard compare-and-swap
    .select()
    .maybeSingle();

  if (updateErr) {
    throw new Error(`Failed to update payment status: ${updateErr.message}`);
  }

  // If update returned null, a concurrent request won the race
  if (!updatedPayment) {
    // Re-fetch to check if the winning concurrent request set it to the target status
    const { data: reFetched } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (reFetched && reFetched.status === toStatus) {
      return {
        success: true,
        alreadyInTargetStatus: true,
        fromStatus,
        toStatus,
        payment: reFetched,
      };
    }

    throw new InvalidPaymentTransitionError(
      fromStatus,
      toStatus,
      paymentId,
      `Concurrent modification detected on payment ${paymentId}. Current status is '${reFetched?.status}'`
    );
  }

  return {
    success: true,
    alreadyInTargetStatus: false,
    fromStatus,
    toStatus,
    payment: updatedPayment,
  };
}
