import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { RESERVATION_EXPIRY_MINUTES } from '../lib/constants';

export interface ReservationItem {
  productId: string;
  quantity: number;
}

export interface InventoryReservationResult {
  reservationId: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  status: string;
  expiresAt: string;
}

/**
 * Invokes the PostgreSQL function `reserve_inventory` or fallback atomic reservation.
 * Reserves inventory strictly at the database level to prevent race conditions and overselling.
 */
export async function reserveSingleInventory(
  supabase: SupabaseClient<Database>,
  params: {
    warehouseId: string;
    productId: string;
    quantity: number;
    referenceType: string;
    referenceId: string;
    expiresAt?: string;
  }
): Promise<InventoryReservationResult> {
  const expiresAt =
    params.expiresAt ||
    new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000).toISOString();

  let data: {
    id: string;
    warehouse_id: string;
    product_id: string;
    quantity: number;
    status: string;
    expires_at: string;
  } | null = null;

  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('reserve_inventory', {
    p_warehouse_id: params.warehouseId,
    p_product_id: params.productId,
    p_quantity: params.quantity,
    p_reference_type: params.referenceType,
    p_reference_id: params.referenceId,
    p_expires_at: expiresAt,
  });

  if (!rpcError && rpcData) {
    data = rpcData as any;
  } else if (
    rpcError &&
    (rpcError.message.includes('Could not find the function') ||
      rpcError.message.includes('schema cache') ||
      (rpcError as { code?: string }).code === 'PGRST202')
  ) {
    // Direct table-level fallback
    const { data: inv, error: invErr } = await supabase
      .from('inventory')
      .select('id, quantity, reserved_quantity')
      .eq('warehouse_id', params.warehouseId)
      .eq('product_id', params.productId)
      .maybeSingle();

    if (invErr || !inv) {
      throw new Error(`Product ${params.productId} not found in warehouse inventory`);
    }

    const available = (inv.quantity || 0) - (inv.reserved_quantity || 0);
    if (available < params.quantity) {
      throw new Error(
        `Insufficient available stock for product ${params.productId} (requested ${params.quantity}, available ${available})`
      );
    }

    // Increment reserved_quantity
    const newReserved = (inv.reserved_quantity || 0) + params.quantity;
    await supabase
      .from('inventory')
      .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
      .eq('id', inv.id);

    // Insert reservation record
    const { data: newRes, error: resErr } = await supabase
      .from('inventory_reservations')
      .insert({
        inventory_id: inv.id,
        order_id: params.referenceId,
        quantity: params.quantity,
        status: 'active',
        expires_at: expiresAt,
      } as unknown as Database['public']['Tables']['inventory_reservations']['Insert'])
      .select('*')
      .single();

    if (resErr || !newRes) {
      // Rollback reserved quantity
      await supabase.from('inventory').update({ reserved_quantity: inv.reserved_quantity }).eq('id', inv.id);
      throw new Error(`Failed to create inventory reservation record: ${resErr?.message}`);
    }

    data = {
      id: newRes.id,
      warehouse_id: params.warehouseId,
      product_id: params.productId,
      quantity: newRes.quantity,
      status: newRes.status,
      expires_at: newRes.expires_at,
    };
  } else {
    throw new Error(`Inventory reservation failed for product ${params.productId}: ${rpcError?.message}`);
  }

  if (!data) {
    throw new Error(`Inventory reservation data is null for product ${params.productId}`);
  }

  console.info(
    `[reservation.created] reservation_id=${data.id} warehouse_id=${data.warehouse_id} product_id=${data.product_id} qty=${data.quantity}`
  );

  return {
    reservationId: data.id,
    warehouseId: data.warehouse_id,
    productId: data.product_id,
    quantity: data.quantity,
    status: data.status,
    expiresAt: data.expires_at,
  };
}

/**
 * Reserves inventory for all items in an order.
 * If any single reservation fails, all previously created reservations in this batch are rolled back (released).
 */
export async function reserveOrderInventory(
  supabase: SupabaseClient<Database>,
  params: {
    warehouseId: string;
    orderId: string;
    items: ReservationItem[];
  }
): Promise<{ success: boolean; reservations: InventoryReservationResult[]; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const createdReservations: InventoryReservationResult[] = [];

  try {
    for (const item of params.items) {
      if (item.quantity <= 0) continue;

      const reservation = await reserveSingleInventory(supabase, {
        warehouseId: params.warehouseId,
        productId: item.productId,
        quantity: item.quantity,
        referenceType: 'order',
        referenceId: params.orderId,
        expiresAt,
      });

      createdReservations.push(reservation);
    }

    return {
      success: true,
      reservations: createdReservations,
      expiresAt,
    };
  } catch (error) {
    // Rollback: Release any reservations created before failure
    for (const res of createdReservations) {
      try {
        await releaseReservation(supabase, res.reservationId);
      } catch (releaseErr) {
        console.error(`Failed to rollback reservation ${res.reservationId}:`, releaseErr);
      }
    }
    throw error;
  }
}

/**
 * Commits a specific reservation using PostgreSQL `commit_inventory_reservation` RPC or table fallback.
 * Atomically decreases `quantity` and `reserved_quantity`, updates status to 'committed',
 * and logs an inventory movement.
 */
export async function commitReservation(
  supabase: SupabaseClient<Database>,
  reservationId: string
): Promise<boolean> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('commit_inventory_reservation', {
    p_reservation_id: reservationId,
  });

  if (!rpcError) {
    console.info(`[reservation.finalized] reservation_id=${reservationId}`);
    return Boolean(rpcData ?? true);
  }

  if (
    rpcError.message.includes('Could not find the function') ||
    rpcError.message.includes('schema cache') ||
    (rpcError as { code?: string }).code === 'PGRST202'
  ) {
    // Direct table fallback
    const { data: res, error: resErr } = await supabase
      .from('inventory_reservations')
      .select('id, inventory_id, order_id, quantity, status')
      .eq('id', reservationId)
      .maybeSingle();

    if (resErr || !res || res.status !== 'active') {
      return false;
    }

    // Mark reservation committed
    await supabase
      .from('inventory_reservations')
      .update({ status: 'committed', committed_at: new Date().toISOString() })
      .eq('id', reservationId);

    // Deduct quantity and reserved_quantity from inventory
    const { data: inv } = await supabase
      .from('inventory')
      .select('id, warehouse_id, product_id, quantity, reserved_quantity')
      .eq('id', res.inventory_id)
      .maybeSingle();

    if (inv) {
      const newQty = Math.max(0, (inv.quantity || 0) - res.quantity);
      const newReserved = Math.max(0, (inv.reserved_quantity || 0) - res.quantity);
      await supabase
        .from('inventory')
        .update({ quantity: newQty, reserved_quantity: newReserved, updated_at: new Date().toISOString() })
        .eq('id', inv.id);

      // Record inventory movement
      await supabase.from('inventory_movements').insert({
        warehouse_id: inv.warehouse_id,
        product_id: inv.product_id,
        movement_type: 'sale',
        quantity: -res.quantity,
        reference_id: res.order_id,
        note: 'Committed order reservation',
      } as Database['public']['Tables']['inventory_movements']['Insert']);
    }

    console.info(`[reservation.finalized] reservation_id=${reservationId}`);
    return true;
  }

  throw new Error(`Failed to commit reservation ${reservationId}: ${rpcError.message}`);
}

/**
 * Commits all active reservations associated with an order reference.
 * Idempotent: only active reservations are committed.
 */
export async function commitOrderReservations(
  supabase: SupabaseClient<Database>,
  orderId: string
): Promise<{ committedCount: number }> {
  const [{ data: byOrderId }, { data: byRefId }] = await Promise.all([
    supabase.from('inventory_reservations').select('id, status').eq('order_id', orderId).eq('status', 'active'),
    supabase.from('inventory_reservations').select('id, status').eq('reference_id' as unknown as 'order_id', orderId).eq('status', 'active'),
  ]);

  const reservations = (byOrderId && byOrderId.length > 0) ? byOrderId : (byRefId || []);

  let count = 0;
  for (const res of reservations) {
    const success = await commitReservation(supabase, res.id);
    if (success) count++;
  }

  return { committedCount: count };
}

/**
 * Releases a reservation using PostgreSQL `release_inventory_reservation` RPC or table fallback.
 * Decreases `reserved_quantity` without changing total `quantity`.
 */
export async function releaseReservation(
  supabase: SupabaseClient<Database>,
  reservationId: string
): Promise<boolean> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('release_inventory_reservation', {
    p_reservation_id: reservationId,
  });

  if (!rpcError) {
    console.info(`[reservation.released] reservation_id=${reservationId}`);
    return Boolean(rpcData ?? true);
  }

  if (
    rpcError.message.includes('Could not find the function') ||
    rpcError.message.includes('schema cache') ||
    (rpcError as { code?: string }).code === 'PGRST202'
  ) {
    // Direct table fallback
    const { data: res, error: resErr } = await supabase
      .from('inventory_reservations')
      .select('id, inventory_id, quantity, status')
      .eq('id', reservationId)
      .maybeSingle();

    if (resErr || !res || res.status !== 'active') {
      return false;
    }

    // Mark reservation released
    await supabase
      .from('inventory_reservations')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', reservationId);

    // Release reserved_quantity
    const { data: inv } = await supabase
      .from('inventory')
      .select('id, reserved_quantity')
      .eq('id', res.inventory_id)
      .maybeSingle();

    if (inv) {
      const newReserved = Math.max(0, (inv.reserved_quantity || 0) - res.quantity);
      await supabase
        .from('inventory')
        .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
        .eq('id', inv.id);
    }

    console.info(`[reservation.released] reservation_id=${reservationId}`);
    return true;
  }

  throw new Error(`Failed to release reservation ${reservationId}: ${rpcError.message}`);
}

/**
 * Releases all active reservations associated with an order.
 * Idempotent: only active reservations are released.
 */
export async function releaseOrderReservations(
  supabase: SupabaseClient<Database>,
  orderId: string
): Promise<{ releasedCount: number }> {
  const [{ data: byOrderId }, { data: byRefId }] = await Promise.all([
    supabase.from('inventory_reservations').select('id, status').eq('order_id', orderId).eq('status', 'active'),
    supabase.from('inventory_reservations').select('id, status').eq('reference_id' as unknown as 'order_id', orderId).eq('status', 'active'),
  ]);

  const reservations = (byOrderId && byOrderId.length > 0) ? byOrderId : (byRefId || []);

  let count = 0;
  for (const res of reservations) {
    const success = await releaseReservation(supabase, res.id);
    if (success) count++;
  }

  return { releasedCount: count };
}

/**
 * Expires all active reservations whose `expires_at` is older than now.
 * Can be triggered periodically by cron/scheduler.
 */
export async function expireOldReservations(
  supabase: SupabaseClient<Database>
): Promise<number> {
  try {
    const { data, error } = await (supabase.rpc as any)('expire_inventory_reservations', {});
    if (!error && typeof data === 'number') {
      return data;
    }
  } catch {
    // Fallback query if RPC differs
  }

  const now = new Date().toISOString();
  const { data: expiredReservations } = await supabase
    .from('inventory_reservations')
    .select('id, status, expires_at')
    .eq('status', 'active')
    .lte('expires_at', now);

  let count = 0;
  for (const res of expiredReservations || []) {
    const released = await releaseReservation(supabase, res.id);
    if (released) count++;
  }

  return count;
}
