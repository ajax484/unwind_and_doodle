import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import {
  WarehouseInput,
  UpdateWarehouseInput,
  LocationInput,
  UpdateLocationInput,
  DeliveryRateInput,
  AdminWarehouseListItem,
  AdminLocationItem,
  AdminDeliveryRateItem,
} from '@/types/admin-inventory';

/**
 * Lists all warehouses for an organization with the count of assigned locations.
 */
export async function listWarehouses(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<AdminWarehouseListItem[]> {
  const { data: warehouses, error: whErr } = await supabase
    .from('warehouses')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (whErr) {
    throw new Error(`Failed to list warehouses: ${whErr.message}`);
  }

  const { data: warehouseLocs } = await supabase
    .from('warehouse_locations')
    .select('warehouse_id, location_id');

  const locCountMap = new Map<string, number>();
  for (const wl of warehouseLocs || []) {
    locCountMap.set(wl.warehouse_id, (locCountMap.get(wl.warehouse_id) || 0) + 1);
  }

  return (warehouses || []).map((w) => ({
    id: w.id,
    name: w.name,
    addressLine1: w.address_line_1,
    addressLine2: w.address_line_2,
    state: w.state,
    lga: w.lga,
    active: w.active ?? true,
    assignedLocationsCount: locCountMap.get(w.id) || 0,
    createdAt: w.created_at,
  }));
}

/**
 * Retrieves full details for a single warehouse, including assigned locations and rates.
 */
export async function getWarehouseDetail(
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  organizationId: string
) {
  const { data: warehouse, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', warehouseId)
    .single();

  if (error || !warehouse) {
    throw new Error(`Warehouse not found: ${warehouseId}`);
  }

  if (warehouse.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse belongs to another organization');
  }

  // Fetch assigned location IDs
  const { data: assignedLocs } = await supabase
    .from('warehouse_locations')
    .select('location_id')
    .eq('warehouse_id', warehouseId);

  const assignedLocationIds = (assignedLocs || []).map((al) => al.location_id);

  // Fetch location details
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId);

  const assignedLocations = (locations || []).filter((l) => assignedLocationIds.includes(l.id));

  // Fetch delivery rates for this warehouse
  const { data: rates } = await supabase
    .from('delivery_rates')
    .select('*')
    .eq('warehouse_id', warehouseId);

  const locMap = new Map((locations || []).map((l) => [l.id, l]));

  const deliveryRates: AdminDeliveryRateItem[] = (rates || []).map((r) => {
    const loc = locMap.get(r.location_id);
    return {
      id: r.id,
      warehouseId: r.warehouse_id,
      warehouseName: warehouse.name,
      locationId: r.location_id,
      locationName: loc?.name || 'Location',
      locationState: loc?.state || '',
      price: r.price,
      active: true,
    };
  });

  return {
    warehouse: {
      id: warehouse.id,
      name: warehouse.name,
      addressLine1: warehouse.address_line_1,
      addressLine2: warehouse.address_line_2,
      state: warehouse.state,
      lga: warehouse.lga,
      active: warehouse.active ?? true,
      createdAt: warehouse.created_at,
    },
    assignedLocations: assignedLocations.map((l) => ({
      id: l.id,
      name: l.name,
      state: l.state,
      lga: l.lga,
      createdAt: l.created_at,
    })),
    deliveryRates,
  };
}

/**
 * Creates a new warehouse.
 */
export async function createWarehouse(
  supabase: SupabaseClient<Database>,
  input: WarehouseInput,
  adminUserId: string,
  organizationId: string
) {
  const { data: created, error } = await supabase
    .from('warehouses')
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      address_line_1: input.address_line_1 || null,
      address_line_2: input.address_line_2 || null,
      state: input.state || null,
      lga: input.lga || null,
      active: input.active ?? true,
    } as unknown as Database['public']['Tables']['warehouses']['Insert'])
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to create warehouse: ${error?.message}`);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'warehouse.created',
    entity_type: 'warehouse',
    entity_id: created.id,
    before_data: null,
    after_data: created as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return created;
}

/**
 * Updates warehouse details or deactivates.
 */
export async function updateWarehouse(
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  input: UpdateWarehouseInput,
  adminUserId: string,
  organizationId: string
) {
  const { data: existing, error: findErr } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', warehouseId)
    .single();

  if (findErr || !existing || existing.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse not found or belongs to another organization');
  }

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.address_line_1 !== undefined) updatePayload.address_line_1 = input.address_line_1;
  if (input.address_line_2 !== undefined) updatePayload.address_line_2 = input.address_line_2;
  if (input.state !== undefined) updatePayload.state = input.state;
  if (input.lga !== undefined) updatePayload.lga = input.lga;
  if (input.active !== undefined) updatePayload.active = input.active;

  const { data: updated, error: updateErr } = await supabase
    .from('warehouses')
    .update(updatePayload as unknown as Database['public']['Tables']['warehouses']['Update'])
    .eq('id', warehouseId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to update warehouse: ${updateErr?.message}`);
  }

  const action = input.active === false ? 'warehouse.deactivated' : 'warehouse.updated';

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action,
    entity_type: 'warehouse',
    entity_id: warehouseId,
    before_data: existing as unknown as Json,
    after_data: updated as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return updated;
}

/**
 * Assigns one or more delivery locations to a warehouse.
 */
export async function assignWarehouseLocations(
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  locationIds: string[],
  organizationId: string,
  adminUserId: string
) {
  const { data: warehouse, error: whErr } = await supabase
    .from('warehouses')
    .select('id, organization_id')
    .eq('id', warehouseId)
    .single();

  if (whErr || !warehouse || warehouse.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse not found or belongs to another organization');
  }

  const { data: existingAssignments } = await supabase
    .from('warehouse_locations')
    .select('location_id')
    .eq('warehouse_id', warehouseId);

  const existingSet = new Set((existingAssignments || []).map((ea) => ea.location_id));
  const newLocationIds = locationIds.filter((locId) => !existingSet.has(locId));

  if (newLocationIds.length === 0) {
    return { assignedCount: 0 };
  }

  const insertPayload = newLocationIds.map((location_id) => ({
    warehouse_id: warehouseId,
    location_id,
  }));

  const { error: insErr } = await supabase
    .from('warehouse_locations')
    .insert(insertPayload as unknown as Database['public']['Tables']['warehouse_locations']['Insert']);

  if (insErr) {
    throw new Error(`Failed to assign locations: ${insErr.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'warehouse.location_assigned',
    entity_type: 'warehouse_location',
    entity_id: warehouseId,
    before_data: null,
    after_data: { newLocationIds } as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return { assignedCount: newLocationIds.length };
}

/**
 * Removes a delivery location assignment from a warehouse.
 */
export async function unassignWarehouseLocation(
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  locationId: string,
  organizationId: string,
  adminUserId: string
) {
  const { data: warehouse, error: whErr } = await supabase
    .from('warehouses')
    .select('id, organization_id')
    .eq('id', warehouseId)
    .single();

  if (whErr || !warehouse || warehouse.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse not found or belongs to another organization');
  }

  const { error: delErr } = await supabase
    .from('warehouse_locations')
    .delete()
    .eq('warehouse_id', warehouseId)
    .eq('location_id', locationId);

  if (delErr) {
    throw new Error(`Failed to unassign location: ${delErr.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'warehouse.location_unassigned',
    entity_type: 'warehouse_location',
    entity_id: `${warehouseId}:${locationId}`,
    before_data: null,
    after_data: { warehouseId, locationId } as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return { success: true };
}

/**
 * Lists all delivery locations for an organization.
 */
export async function listLocations(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<AdminLocationItem[]> {
  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('state', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to list locations: ${error.message}`);
  }

  return (locations || []).map((l) => ({
    id: l.id,
    name: l.name,
    state: l.state,
    lga: l.lga,
    createdAt: l.created_at,
  }));
}

/**
 * Creates a new delivery location.
 */
export async function createLocation(
  supabase: SupabaseClient<Database>,
  input: LocationInput,
  adminUserId: string,
  organizationId: string
): Promise<AdminLocationItem> {
  const { data: created, error } = await supabase
    .from('locations')
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      state: input.state.trim(),
      lga: input.lga ? input.lga.trim() : null,
    } as unknown as Database['public']['Tables']['locations']['Insert'])
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to create location: ${error?.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'location.created',
    entity_type: 'location',
    entity_id: created.id,
    before_data: null,
    after_data: created as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return {
    id: created.id,
    name: created.name,
    state: created.state,
    lga: created.lga,
    createdAt: created.created_at,
  };
}

/**
 * Updates a delivery location.
 */
export async function updateLocation(
  supabase: SupabaseClient<Database>,
  locationId: string,
  input: UpdateLocationInput,
  adminUserId: string,
  organizationId: string
): Promise<AdminLocationItem> {
  const { data: existing, error: findErr } = await supabase
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .single();

  if (findErr || !existing || existing.organization_id !== organizationId) {
    throw new Error('Forbidden: Location not found or belongs to another organization');
  }

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.state !== undefined) updatePayload.state = input.state.trim();
  if (input.lga !== undefined) updatePayload.lga = input.lga ? input.lga.trim() : null;

  const { data: updated, error: updateErr } = await supabase
    .from('locations')
    .update(updatePayload as unknown as Database['public']['Tables']['locations']['Update'])
    .eq('id', locationId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to update location: ${updateErr?.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'location.updated',
    entity_type: 'location',
    entity_id: locationId,
    before_data: existing as unknown as Json,
    after_data: updated as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return {
    id: updated.id,
    name: updated.name,
    state: updated.state,
    lga: updated.lga,
    createdAt: updated.created_at,
  };
}

/**
 * Lists delivery rates for all warehouses in an organization.
 */
export async function listDeliveryRates(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<AdminDeliveryRateItem[]> {
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('id, name')
    .eq('organization_id', organizationId);

  const warehouseIds = (warehouses || []).map((w) => w.id);
  const whMap = new Map((warehouses || []).map((w) => [w.id, w.name]));

  if (warehouseIds.length === 0) return [];

  const { data: rates, error } = await supabase
    .from('delivery_rates')
    .select('*')
    .in('warehouse_id', warehouseIds);

  if (error) {
    throw new Error(`Failed to list delivery rates: ${error.message}`);
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, state')
    .eq('organization_id', organizationId);

  const locMap = new Map((locations || []).map((l) => [l.id, l]));

  return (rates || []).map((r) => {
    const loc = locMap.get(r.location_id);
    return {
      id: r.id,
      warehouseId: r.warehouse_id,
      warehouseName: whMap.get(r.warehouse_id) || 'Warehouse',
      locationId: r.location_id,
      locationName: loc?.name || 'Location',
      locationState: loc?.state || '',
      price: r.price,
      active: true,
    };
  });
}

/**
 * Upserts a delivery rate between a warehouse and a delivery location.
 */
export async function upsertDeliveryRate(
  supabase: SupabaseClient<Database>,
  input: DeliveryRateInput,
  adminUserId: string,
  organizationId: string
): Promise<AdminDeliveryRateItem> {
  const { warehouse_id, location_id, price } = input;

  if (price < 0) {
    throw new Error('Delivery rate price cannot be negative');
  }

  // Verify warehouse belongs to organization
  const { data: warehouse, error: whErr } = await supabase
    .from('warehouses')
    .select('id, organization_id, name')
    .eq('id', warehouse_id)
    .single();

  if (whErr || !warehouse || warehouse.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse not found or belongs to another organization');
  }

  // Verify location belongs to organization
  const { data: location, error: locErr } = await supabase
    .from('locations')
    .select('id, organization_id, name, state')
    .eq('id', location_id)
    .single();

  if (locErr || !location || location.organization_id !== organizationId) {
    throw new Error('Forbidden: Location not found or belongs to another organization');
  }

  // Check if rate already exists
  const { data: existingRate } = await supabase
    .from('delivery_rates')
    .select('*')
    .eq('warehouse_id', warehouse_id)
    .eq('location_id', location_id)
    .maybeSingle();

  let rateId: string;

  if (existingRate) {
    rateId = existingRate.id;
    await supabase
      .from('delivery_rates')
      .update({
        price,
      } as unknown as Database['public']['Tables']['delivery_rates']['Update'])
      .eq('id', existingRate.id);

    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      actor_id: adminUserId,
      user_id: adminUserId,
      action: 'delivery_rate.updated',
      entity_type: 'delivery_rate',
      entity_id: rateId,
      before_data: { price: existingRate.price },
      after_data: { price },
    } as unknown as Database['public']['Tables']['audit_logs']['Insert']);
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('delivery_rates')
      .insert({
        warehouse_id,
        location_id,
        price,
      } as unknown as Database['public']['Tables']['delivery_rates']['Insert'])
      .select()
      .single();

    if (insErr || !inserted) {
      throw new Error(`Failed to create delivery rate: ${insErr?.message}`);
    }

    rateId = inserted.id;

    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      actor_id: adminUserId,
      user_id: adminUserId,
      action: 'delivery_rate.created',
      entity_type: 'delivery_rate',
      entity_id: rateId,
      before_data: null,
      after_data: { warehouse_id, location_id, price },
    } as unknown as Database['public']['Tables']['audit_logs']['Insert']);
  }

  return {
    id: rateId,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    locationId: location.id,
    locationName: location.name,
    locationState: location.state,
    price,
    active: true,
  };
}
