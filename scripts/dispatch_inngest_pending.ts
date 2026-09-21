import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getServiceSupabaseClient } from '../src/lib/supabase/client';
import { inngest } from '../src/inngest/client';

async function run() {
  const supabase = getServiceSupabaseClient();
  console.log('Fetching pending inngest executions for bilalyusufubangida@gmail.com...');

  const { data: execs } = await supabase
    .from('marketing_automation_executions')
    .select('*')
    .eq('customer_email', 'bilalyusufubangida@gmail.com')
    .eq('status', 'pending');

  if (!execs || execs.length === 0) {
    console.log('No pending executions found.');
    return;
  }

  console.log(`Found ${execs.length} pending executions. Emitting marketing/automation.execute events to Inngest...`);
  const events = execs.map((item) => ({
    name: 'marketing/automation.execute' as const,
    data: {
      executionId: item.id,
      automationId: item.automation_id,
      organizationId: item.organization_id,
      domainEventId: item.domain_event_id,
      triggerType: 'post_purchase',
      customerId: item.customer_id,
      customerEmail: item.customer_email,
      cartId: null,
    },
  }));

  const res = await inngest.send(events);
  console.log('Inngest send result:', res);
}

run().catch(console.error);
