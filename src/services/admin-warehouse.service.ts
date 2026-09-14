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
  CreateDeliveryZoneInput,
  BulkDeliveryZonesInput,
  AdminDeliveryZoneItem,
  BulkDeliveryZoneResult,
  CreateDeliveryRateTemplateInput,
  UpdateDeliveryRateTemplateInput,
  AdminDeliveryRateTemplateItem,
  AdminEnrichedLocationItem,
  LocationConfigurationInfo,
  LocationConfigStatus,
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
      active: (r as { active?: boolean }).active ?? true,
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
 * Lists all delivery locations enriched with cross-warehouse configuration status,
 * current rate, serving warehouse names, and rate template metadata.
 * Uses a batch 2-query pattern without N+1 query overhead.
 */
export async function listEnrichedDeliveryLocations(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  currentWarehouseId?: string | null
): Promise<AdminEnrichedLocationItem[]> {
  // 1. Fetch all locations for the organization
  const { data: locations, error: locErr } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('state', { ascending: true })
    .order('name', { ascending: true });

  if (locErr) {
    throw new Error(`Failed to list locations: ${locErr.message}`);
  }

  if (!locations || locations.length === 0) {
    return [];
  }

  // 2. Fetch all warehouses for this organization
  const { data: warehouses, error: whErr } = await supabase
    .from('warehouses')
    .select('id, name')
    .eq('organization_id', organizationId);

  if (whErr) {
    throw new Error(`Failed to list warehouses for location enrichment: ${whErr.message}`);
  }

  const warehouseMap = new Map((warehouses || []).map((w) => [w.id, w.name]));
  const organizationWarehouseIds = Array.from(warehouseMap.keys());

  // 3. Concurrently fetch all delivery rates and active templates for the organization
  const configurationsByLocation = new Map<string, LocationConfigurationInfo[]>();

  if (organizationWarehouseIds.length > 0) {
    const [{ data: rates, error: rateErr }, { data: templates, error: tmplErr }] = await Promise.all([
      supabase
        .from('delivery_rates')
        .select('*')
        .in('warehouse_id', organizationWarehouseIds),
      supabase
        .from('delivery_rate_templates')
        .select('id, name')
        .eq('organization_id', organizationId),
    ]);

    if (rateErr) {
      throw new Error(`Failed to load delivery rates for location enrichment: ${rateErr.message}`);
    }
    if (tmplErr) {
      // Non-fatal if templates table has no rows or schema is being updated
      console.warn('Could not load delivery rate templates for location enrichment:', tmplErr.message);
    }

    const templateMap = new Map((templates || []).map((t) => [t.id, t.name]));

    for (const r of rates || []) {
      const warehouseName = warehouseMap.get(r.warehouse_id) || 'Unknown Warehouse';
      const templateName = r.template_id ? templateMap.get(r.template_id) || null : null;

      const configItem: LocationConfigurationInfo = {
        warehouseId: r.warehouse_id,
        warehouseName,
        price: Number(r.price),
        active: Boolean((r as { active?: boolean }).active ?? true),
        templateId: r.template_id || null,
        templateName,
      };

      const existingConfigs = configurationsByLocation.get(r.location_id) || [];
      existingConfigs.push(configItem);
      configurationsByLocation.set(r.location_id, existingConfigs);
    }
  }

  // 4. Map locations into AdminEnrichedLocationItem
  return locations.map((loc) => {
    const configs = configurationsByLocation.get(loc.id) || [];

    let statusForWarehouse: LocationConfigStatus = 'not_configured';
    let primaryConfig: LocationConfigurationInfo | null = null;

    if (configs.length === 0) {
      statusForWarehouse = 'not_configured';
    } else if (currentWarehouseId) {
      const matchCurrent = configs.find((c) => c.warehouseId === currentWarehouseId);
      const matchOthers = configs.some((c) => c.warehouseId !== currentWarehouseId);

      if (matchCurrent && matchOthers) {
        statusForWarehouse = 'configured_multiple';
        primaryConfig = matchCurrent;
      } else if (matchCurrent) {
        statusForWarehouse = 'configured_here';
        primaryConfig = matchCurrent;
      } else {
        statusForWarehouse = 'configured_other';
        primaryConfig = configs[0] || null;
      }
    } else {
      statusForWarehouse = configs.length > 1 ? 'configured_multiple' : 'configured_here';
      primaryConfig = configs[0] || null;
    }

    return {
      id: loc.id,
      name: loc.name,
      state: loc.state,
      lga: loc.lga,
      createdAt: loc.created_at,
      configurations: configs,
      statusForWarehouse,
      primaryConfig,
    };
  });
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
      active: (r as { active?: boolean }).active ?? true,
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
    active: existingRate?.active ?? true,
  };
}

/**
 * Lists all delivery zones configured for a specific warehouse,
 * plus unassigned locations available for assignment.
 */
export async function listWarehouseDeliveryZones(
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  organizationId: string
): Promise<{
  zones: AdminDeliveryZoneItem[];
  availableLocations: AdminLocationItem[];
}> {
  const { data: warehouse, error: whErr } = await supabase
    .from('warehouses')
    .select('id, name, organization_id')
    .eq('id', warehouseId)
    .single();

  if (whErr || !warehouse || warehouse.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse not found or belongs to another organization');
  }

  const { data: allLocations, error: locErr } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (locErr) {
    throw new Error(`Failed to load locations: ${locErr.message}`);
  }

  const { data: assignedLocs } = await supabase
    .from('warehouse_locations')
    .select('location_id')
    .eq('warehouse_id', warehouseId);

  const assignedLocationIdSet = new Set((assignedLocs || []).map((a) => a.location_id));

  const { data: rates } = await supabase
    .from('delivery_rates')
    .select('*')
    .eq('warehouse_id', warehouseId);

  const rateMap = new Map<string, { id: string; price: number; active: boolean; created_at: string }>();
  for (const r of rates || []) {
    rateMap.set(r.location_id, {
      id: r.id,
      price: Number(r.price),
      active: (r as { active?: boolean }).active ?? true,
      created_at: r.created_at,
    });
  }

  const locMap = new Map((allLocations || []).map((l) => [l.id, l]));

  const zones: AdminDeliveryZoneItem[] = [];
  for (const locId of assignedLocationIdSet) {
    const loc = locMap.get(locId);
    if (!loc) continue;
    const rateInfo = rateMap.get(locId);
    zones.push({
      id: rateInfo?.id || locId,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      locationId: loc.id,
      locationName: loc.name,
      locationState: loc.state,
      locationLga: loc.lga || null,
      price: rateInfo ? rateInfo.price : 0,
      active: rateInfo ? rateInfo.active : true,
      createdAt: rateInfo?.created_at || loc.created_at,
    });
  }

  zones.sort((a, b) => a.locationName.localeCompare(b.locationName));

  const availableLocations = (allLocations || [])
    .filter((l) => !assignedLocationIdSet.has(l.id))
    .map((l) => ({
      id: l.id,
      name: l.name,
      state: l.state,
      lga: l.lga,
      createdAt: l.created_at,
    }));

  return { zones, availableLocations };
}

/**
 * Atomically creates or connects a location to a warehouse and sets its delivery rate.
 */
export async function createDeliveryZoneAtomic(
  supabase: SupabaseClient<Database>,
  input: CreateDeliveryZoneInput,
  adminUserId: string,
  organizationId: string
): Promise<AdminDeliveryZoneItem> {
  const { warehouse_id, location_id, name, state, lga, price, active = true } = input;

  if (price < 0) {
    throw new Error('Delivery rate price cannot be negative');
  }

  const { data: warehouse, error: whErr } = await supabase
    .from('warehouses')
    .select('id, organization_id, name')
    .eq('id', warehouse_id)
    .single();

  if (whErr || !warehouse || warehouse.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse not found or belongs to another organization');
  }

  let resolvedLocationId: string;
  let resolvedLocationName: string;
  let resolvedLocationState: string;
  let resolvedLocationLga: string | null = null;
  let locationCreatedAt = new Date().toISOString();

  if (location_id) {
    const { data: existingLoc, error: locErr } = await supabase
      .from('locations')
      .select('*')
      .eq('id', location_id)
      .single();

    if (locErr || !existingLoc || existingLoc.organization_id !== organizationId) {
      throw new Error('Location not found or belongs to another organization');
    }

    resolvedLocationId = existingLoc.id;
    resolvedLocationName = existingLoc.name;
    resolvedLocationState = existingLoc.state;
    resolvedLocationLga = existingLoc.lga;
    locationCreatedAt = existingLoc.created_at;
  } else {
    if (!name?.trim() || !state?.trim()) {
      throw new Error('Location name and state are required when creating a new location');
    }

    const { data: existingLocs } = await supabase
      .from('locations')
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('name', name.trim())
      .ilike('state', state.trim());

    if (existingLocs && existingLocs.length > 0) {
      resolvedLocationId = existingLocs[0].id;
      resolvedLocationName = existingLocs[0].name;
      resolvedLocationState = existingLocs[0].state;
      resolvedLocationLga = existingLocs[0].lga;
      locationCreatedAt = existingLocs[0].created_at;
    } else {
      const { data: newLoc, error: insLocErr } = await supabase
        .from('locations')
        .insert({
          organization_id: organizationId,
          name: name.trim(),
          state: state.trim(),
          lga: lga?.trim() || null,
        } as unknown as Database['public']['Tables']['locations']['Insert'])
        .select()
        .single();

      if (insLocErr || !newLoc) {
        throw new Error(`Failed to create location: ${insLocErr?.message}`);
      }

      resolvedLocationId = newLoc.id;
      resolvedLocationName = newLoc.name;
      resolvedLocationState = newLoc.state;
      resolvedLocationLga = newLoc.lga;
      locationCreatedAt = newLoc.created_at;
    }
  }

  const { data: existingAssignment } = await supabase
    .from('warehouse_locations')
    .select('warehouse_id')
    .eq('warehouse_id', warehouse_id)
    .eq('location_id', resolvedLocationId)
    .maybeSingle();

  if (!existingAssignment) {
    const { error: insWlErr } = await supabase
      .from('warehouse_locations')
      .insert({
        warehouse_id,
        location_id: resolvedLocationId,
      } as unknown as Database['public']['Tables']['warehouse_locations']['Insert']);

    if (insWlErr) {
      throw new Error(`Failed to assign location to warehouse: ${insWlErr.message}`);
    }
  }

  const { data: existingRate } = await supabase
    .from('delivery_rates')
    .select('*')
    .eq('warehouse_id', warehouse_id)
    .eq('location_id', resolvedLocationId)
    .maybeSingle();

  let rateId: string;
  let createdAt = locationCreatedAt;

  if (existingRate) {
    rateId = existingRate.id;
    createdAt = existingRate.created_at;
    await supabase
      .from('delivery_rates')
      .update({
        price,
        active,
      } as unknown as Database['public']['Tables']['delivery_rates']['Update'])
      .eq('id', existingRate.id);
  } else {
    const { data: insertedRate, error: insRateErr } = await supabase
      .from('delivery_rates')
      .insert({
        warehouse_id,
        location_id: resolvedLocationId,
        price,
        active,
      } as unknown as Database['public']['Tables']['delivery_rates']['Insert'])
      .select()
      .single();

    if (insRateErr || !insertedRate) {
      throw new Error(`Failed to create delivery rate: ${insRateErr?.message}`);
    }
    rateId = insertedRate.id;
    createdAt = insertedRate.created_at;
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'delivery_zone.created',
    entity_type: 'delivery_zone',
    entity_id: `${warehouse_id}:${resolvedLocationId}`,
    before_data: null,
    after_data: {
      warehouse_id,
      location_id: resolvedLocationId,
      location_name: resolvedLocationName,
      price,
      active,
    } as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return {
    id: rateId,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    locationId: resolvedLocationId,
    locationName: resolvedLocationName,
    locationState: resolvedLocationState,
    locationLga: resolvedLocationLga,
    price,
    active,
    createdAt,
  };
}

/**
 * Bulk assigns or updates multiple locations for a warehouse.
 * Supports both uniform pricing and individual per-location rates.
 * Categorizes actions into created, updated, skipped, and failed.
 */
export async function bulkCreateDeliveryZones(
  supabase: SupabaseClient<Database>,
  input: BulkDeliveryZonesInput,
  adminUserId: string,
  organizationId: string
): Promise<BulkDeliveryZoneResult> {
  const {
    warehouse_id,
    template_id: rootTemplateId,
    items: explicitItems,
    location_ids,
    price: uniformPrice,
    include_existing = false,
    active = true,
  } = input;

  // 1. Pre-load any referenced templates from database
  const referencedTemplateIds = new Set<string>();
  if (rootTemplateId) referencedTemplateIds.add(rootTemplateId);
  if (explicitItems) {
    for (const item of explicitItems) {
      if (item.template_id) referencedTemplateIds.add(item.template_id);
    }
  }

  const templateMap = new Map<string, { id: string; name: string; amount: number; is_active: boolean }>();
  if (referencedTemplateIds.size > 0) {
    const { data: templates, error: tmplErr } = await supabase
      .from('delivery_rate_templates')
      .select('id, name, amount, is_active, organization_id')
      .in('id', Array.from(referencedTemplateIds));

    if (tmplErr) {
      throw new Error(`Failed to load rate templates: ${tmplErr.message}`);
    }

    for (const t of templates || []) {
      if (t.organization_id !== organizationId) {
        throw new Error('Forbidden: Template belongs to another organization');
      }
      templateMap.set(t.id, {
        id: t.id,
        name: t.name,
        amount: Number(t.amount),
        is_active: Boolean(t.is_active),
      });
    }
  }

  // 2. Normalize items with server-resolved pricing
  const normalizedItems: Array<{
    location_id: string;
    price: number;
    template_id: string | null;
    template_name: string | null;
    template_error?: string;
  }> = [];

  if (explicitItems && explicitItems.length > 0) {
    for (const item of explicitItems) {
      if (item.template_id) {
        const tmpl = templateMap.get(item.template_id);
        if (!tmpl) {
          normalizedItems.push({
            location_id: item.location_id,
            price: item.price ?? 0,
            template_id: item.template_id,
            template_name: null,
            template_error: 'Referenced rate template not found',
          });
        } else if (!tmpl.is_active) {
          normalizedItems.push({
            location_id: item.location_id,
            price: tmpl.amount,
            template_id: tmpl.id,
            template_name: tmpl.name,
            template_error: `Template "${tmpl.name}" is inactive`,
          });
        } else {
          normalizedItems.push({
            location_id: item.location_id,
            price: tmpl.amount,
            template_id: tmpl.id,
            template_name: tmpl.name,
          });
        }
      } else if (item.price !== undefined) {
        if (item.price < 0) throw new Error('Delivery rate price cannot be negative');
        normalizedItems.push({
          location_id: item.location_id,
          price: item.price,
          template_id: null,
          template_name: null,
        });
      }
    }
  } else if (location_ids && location_ids.length > 0) {
    let resolvedRate = uniformPrice;
    let rootTmplId: string | null = null;
    let rootTmplName: string | null = null;

    if (rootTemplateId) {
      const tmpl = templateMap.get(rootTemplateId);
      if (!tmpl) throw new Error('Rate template not found or belongs to another organization');
      if (!tmpl.is_active) throw new Error(`Rate template "${tmpl.name}" is inactive`);
      resolvedRate = tmpl.amount;
      rootTmplId = tmpl.id;
      rootTmplName = tmpl.name;
    }

    if (resolvedRate === undefined || resolvedRate < 0) {
      throw new Error('Delivery rate price must be 0 or greater');
    }

    for (const id of location_ids) {
      normalizedItems.push({
        location_id: id,
        price: resolvedRate,
        template_id: rootTmplId,
        template_name: rootTmplName,
      });
    }
  }

  const result: BulkDeliveryZoneResult = {
    warehouseId: warehouse_id,
    totalRequested: normalizedItems.length,
    created: [],
    updated: [],
    skipped: [],
    failed: [],
  };

  if (normalizedItems.length === 0) {
    return result;
  }

  const { data: warehouse, error: whErr } = await supabase
    .from('warehouses')
    .select('id, organization_id, name')
    .eq('id', warehouse_id)
    .single();

  if (whErr || !warehouse || warehouse.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse not found or belongs to another organization');
  }

  const targetLocationIds = normalizedItems.map((item) => item.location_id);
  const { data: locations, error: locErr } = await supabase
    .from('locations')
    .select('id, name, state, lga, organization_id')
    .in('id', targetLocationIds);

  if (locErr) {
    throw new Error(`Failed to load locations: ${locErr.message}`);
  }

  const locMap = new Map((locations || []).map((l) => [l.id, l]));

  const { data: existingAssignments } = await supabase
    .from('warehouse_locations')
    .select('location_id')
    .eq('warehouse_id', warehouse_id)
    .in('location_id', targetLocationIds);

  const assignedSet = new Set((existingAssignments || []).map((ea) => ea.location_id));

  const { data: existingRates } = await supabase
    .from('delivery_rates')
    .select('*')
    .eq('warehouse_id', warehouse_id)
    .in('location_id', targetLocationIds);

  const rateMap = new Map((existingRates || []).map((r) => [r.location_id, r]));

  for (const item of normalizedItems) {
    const loc = locMap.get(item.location_id);

    if (item.template_error) {
      result.failed.push({
        locationId: item.location_id,
        locationName: loc?.name || 'Unknown Location',
        price: item.price,
        templateId: item.template_id,
        templateName: item.template_name,
        action: 'failed',
        message: item.template_error,
        error: item.template_error,
      });
      continue;
    }

    if (!loc || loc.organization_id !== organizationId) {
      result.failed.push({
        locationId: item.location_id,
        locationName: loc?.name || 'Unknown Location',
        price: item.price,
        templateId: item.template_id,
        templateName: item.template_name,
        action: 'failed',
        message: 'Location not found or belongs to another organization',
        error: 'Location not found or belongs to another organization',
      });
      continue;
    }

    const isAssigned = assignedSet.has(item.location_id);
    const existingRate = rateMap.get(item.location_id);
    const isConfigured = isAssigned && existingRate !== undefined;

    try {
      if (isConfigured) {
        if (!include_existing) {
          result.skipped.push({
            locationId: loc.id,
            locationName: loc.name,
            price: Number(existingRate.price),
            templateId: item.template_id,
            templateName: item.template_name,
            action: 'skipped',
            reason: 'Already configured for this warehouse',
          });
        } else {
          const currentPrice = Number(existingRate.price);
          if (currentPrice === item.price && Boolean(existingRate.active) === active) {
            result.skipped.push({
              locationId: loc.id,
              locationName: loc.name,
              price: item.price,
              templateId: item.template_id,
              templateName: item.template_name,
              action: 'skipped',
              reason: 'Rate unchanged',
            });
          } else {
            await supabase
              .from('delivery_rates')
              .update({
                price: item.price,
                active,
                template_id: item.template_id,
              } as unknown as Database['public']['Tables']['delivery_rates']['Update'])
              .eq('id', existingRate.id);

            result.updated.push({
              locationId: loc.id,
              locationName: loc.name,
              oldPrice: currentPrice,
              price: item.price,
              templateId: item.template_id,
              templateName: item.template_name,
              action: 'updated',
            });
          }
        }
      } else {
        if (!isAssigned) {
          await supabase
            .from('warehouse_locations')
            .insert({
              warehouse_id,
              location_id: item.location_id,
            } as unknown as Database['public']['Tables']['warehouse_locations']['Insert']);
          assignedSet.add(item.location_id);
        }

        if (existingRate) {
          await supabase
            .from('delivery_rates')
            .update({
              price: item.price,
              active,
              template_id: item.template_id,
            } as unknown as Database['public']['Tables']['delivery_rates']['Update'])
            .eq('id', existingRate.id);
        } else {
          await supabase
            .from('delivery_rates')
            .insert({
              warehouse_id,
              location_id: item.location_id,
              price: item.price,
              active,
              template_id: item.template_id,
            } as unknown as Database['public']['Tables']['delivery_rates']['Insert']);
        }

        result.created.push({
          locationId: loc.id,
          locationName: loc.name,
          price: item.price,
          templateId: item.template_id,
          templateName: item.template_name,
          action: 'created',
        });
      }
    } catch (err: unknown) {
      result.failed.push({
        locationId: loc.id,
        locationName: loc.name,
        price: item.price,
        templateId: item.template_id,
        templateName: item.template_name,
        action: 'failed',
        message: err instanceof Error ? err.message : 'Database error configuring zone',
        error: err instanceof Error ? err.message : 'Database error configuring zone',
      });
    }
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'delivery_zone.bulk_setup',
    entity_type: 'delivery_zone',
    entity_id: warehouse_id,
    before_data: null,
    after_data: {
      warehouseId: warehouse_id,
      createdCount: result.created.length,
      updatedCount: result.updated.length,
      skippedCount: result.skipped.length,
      failedCount: result.failed.length,
    } as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return result;
}

/**
 * Safely removes a delivery zone for a warehouse (deleting delivery_rate and warehouse_locations link).
 * Does NOT delete the underlying location or warehouse.
 */
export async function deleteDeliveryZone(
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

  await supabase
    .from('delivery_rates')
    .delete()
    .eq('warehouse_id', warehouseId)
    .eq('location_id', locationId);

  await supabase
    .from('warehouse_locations')
    .delete()
    .eq('warehouse_id', warehouseId)
    .eq('location_id', locationId);

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'delivery_zone.deleted',
    entity_type: 'delivery_zone',
    entity_id: `${warehouseId}:${locationId}`,
    before_data: null,
    after_data: { warehouseId, locationId } as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return { success: true };
}

/**
 * Updates delivery rate price or active status for an existing warehouse-location delivery zone.
 */
export async function updateDeliveryZoneRate(
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  locationId: string,
  updates: { price?: number; active?: boolean },
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

  if (updates.price !== undefined && updates.price < 0) {
    throw new Error('Delivery rate price cannot be negative');
  }

  const { data: existingRate } = await supabase
    .from('delivery_rates')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('location_id', locationId)
    .maybeSingle();

  if (existingRate) {
    const updatePayload: Record<string, unknown> = {};
    if (updates.price !== undefined) updatePayload.price = updates.price;
    if (updates.active !== undefined) updatePayload.active = updates.active;

    await supabase
      .from('delivery_rates')
      .update(updatePayload as unknown as Database['public']['Tables']['delivery_rates']['Update'])
      .eq('id', existingRate.id);
  } else {
    await supabase
      .from('delivery_rates')
      .insert({
        warehouse_id: warehouseId,
        location_id: locationId,
        price: updates.price ?? 0,
        active: updates.active ?? true,
      } as unknown as Database['public']['Tables']['delivery_rates']['Insert']);
  }

  const { data: wlLink } = await supabase
    .from('warehouse_locations')
    .select('location_id')
    .eq('warehouse_id', warehouseId)
    .eq('location_id', locationId)
    .maybeSingle();

  if (!wlLink) {
    await supabase
      .from('warehouse_locations')
      .insert({
        warehouse_id: warehouseId,
        location_id: locationId,
      } as unknown as Database['public']['Tables']['warehouse_locations']['Insert']);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'delivery_zone.updated',
    entity_type: 'delivery_zone',
    entity_id: `${warehouseId}:${locationId}`,
    before_data: existingRate as unknown as Json,
    after_data: updates as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return { success: true };
}

/**
 * Lists all delivery rate templates for an organization.
 */
export async function listDeliveryRateTemplates(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  activeOnly: boolean = false
): Promise<AdminDeliveryRateTemplateItem[]> {
  let query = supabase
    .from('delivery_rate_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('amount', { ascending: true })
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list delivery rate templates: ${error.message}`);
  }

  return (data || []).map((t) => ({
    id: t.id,
    organizationId: t.organization_id,
    name: t.name,
    description: t.description,
    amount: Number(t.amount),
    currency: t.currency || 'NGN',
    isActive: t.is_active,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
}

/**
 * Creates a new delivery rate template.
 */
export async function createDeliveryRateTemplate(
  supabase: SupabaseClient<Database>,
  input: CreateDeliveryRateTemplateInput,
  adminUserId: string,
  organizationId: string
): Promise<AdminDeliveryRateTemplateItem> {
  if (input.amount < 0) {
    throw new Error('Template amount cannot be negative');
  }

  const { data: created, error } = await supabase
    .from('delivery_rate_templates')
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      description: input.description ? input.description.trim() : null,
      amount: input.amount,
      currency: input.currency || 'NGN',
      is_active: input.is_active ?? true,
    } as unknown as Database['public']['Tables']['delivery_rate_templates']['Insert'])
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to create delivery rate template: ${error?.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'delivery_rate_template.created',
    entity_type: 'delivery_rate_template',
    entity_id: created.id,
    before_data: null,
    after_data: created as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return {
    id: created.id,
    organizationId: created.organization_id,
    name: created.name,
    description: created.description,
    amount: Number(created.amount),
    currency: created.currency || 'NGN',
    isActive: created.is_active,
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  };
}

/**
 * Updates a delivery rate template.
 */
export async function updateDeliveryRateTemplate(
  supabase: SupabaseClient<Database>,
  templateId: string,
  input: UpdateDeliveryRateTemplateInput,
  adminUserId: string,
  organizationId: string
): Promise<AdminDeliveryRateTemplateItem> {
  const { data: existing, error: findErr } = await supabase
    .from('delivery_rate_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (findErr || !existing || existing.organization_id !== organizationId) {
    throw new Error('Forbidden: Template not found or belongs to another organization');
  }

  if (input.amount !== undefined && input.amount < 0) {
    throw new Error('Template amount cannot be negative');
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.description !== undefined) updatePayload.description = input.description ? input.description.trim() : null;
  if (input.amount !== undefined) updatePayload.amount = input.amount;
  if (input.currency !== undefined) updatePayload.currency = input.currency;
  if (input.is_active !== undefined) updatePayload.is_active = input.is_active;

  const { data: updated, error: updateErr } = await supabase
    .from('delivery_rate_templates')
    .update(updatePayload as unknown as Database['public']['Tables']['delivery_rate_templates']['Update'])
    .eq('id', templateId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to update delivery rate template: ${updateErr?.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'delivery_rate_template.updated',
    entity_type: 'delivery_rate_template',
    entity_id: templateId,
    before_data: existing as unknown as Json,
    after_data: updated as unknown as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return {
    id: updated.id,
    organizationId: updated.organization_id,
    name: updated.name,
    description: updated.description,
    amount: Number(updated.amount),
    currency: updated.currency || 'NGN',
    isActive: updated.is_active,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

/**
 * Safely removes a delivery rate template without deleting or breaking existing delivery rates.
 * Nullifies template_id on linked delivery_rates to preserve existing pricing.
 */
export async function deleteDeliveryRateTemplate(
  supabase: SupabaseClient<Database>,
  templateId: string,
  adminUserId: string,
  organizationId: string
): Promise<{ success: boolean }> {
  const { data: existing, error: findErr } = await supabase
    .from('delivery_rate_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (findErr || !existing || existing.organization_id !== organizationId) {
    throw new Error('Forbidden: Template not found or belongs to another organization');
  }

  // Nullify foreign key references so existing delivery rates remain intact
  await supabase
    .from('delivery_rates')
    .update({ template_id: null } as unknown as Database['public']['Tables']['delivery_rates']['Update'])
    .eq('template_id', templateId);

  const { error: delErr } = await supabase
    .from('delivery_rate_templates')
    .delete()
    .eq('id', templateId);

  if (delErr) {
    throw new Error(`Failed to delete delivery rate template: ${delErr.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'delivery_rate_template.deleted',
    entity_type: 'delivery_rate_template',
    entity_id: templateId,
    before_data: existing as unknown as Json,
    after_data: null,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return { success: true };
}
