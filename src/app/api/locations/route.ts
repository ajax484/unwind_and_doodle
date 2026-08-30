import { NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = getServiceSupabaseClient();

    // Fetch delivery locations
    const { data: locations, error: locErr } = await supabase
      .from('locations')
      .select('id, name, state, lga')
      .order('state', { ascending: true });

    if (locErr) {
      throw new Error(`Failed to query locations: ${locErr.message}`);
    }

    // Fetch active delivery rates
    const { data: deliveryRates, error: ratesErr } = await supabase
      .from('delivery_rates')
      .select('warehouse_id, location_id, price, active')
      .eq('active', true);

    if (ratesErr) {
      throw new Error(`Failed to query delivery rates: ${ratesErr.message}`);
    }

    const ratesByLocation = new Map<string, { rate: number; estimatedDays: string | null }>();
    for (const r of deliveryRates || []) {
      if (!ratesByLocation.has(r.location_id) || r.price < ratesByLocation.get(r.location_id)!.rate) {
        ratesByLocation.set(r.location_id, {
          rate: r.price,
          estimatedDays: '2-4 business days',
        });
      }
    }

    const formattedLocations = (locations || []).map((loc) => {
      const rateInfo = ratesByLocation.get(loc.id);
      return {
        id: loc.id,
        name: loc.name,
        state: loc.state,
        lga: loc.lga,
        deliveryFee: rateInfo?.rate || 1500,
        estimatedDays: rateInfo?.estimatedDays || '2-4 business days',
      };
    });

    return NextResponse.json({ success: true, data: formattedLocations }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching delivery locations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
