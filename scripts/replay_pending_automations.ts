import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getServiceSupabaseClient } from '../src/lib/supabase/client';
import { processDueMarketingAutomations } from '../src/services/marketing-executor.service';

async function run() {
  const supabase = getServiceSupabaseClient();
  console.log('Resetting pending/stuck executions for replay...');

  // Reset any 'processing' executions for our test orders back to 'pending'
  await supabase
    .from('marketing_automation_executions')
    .update({ status: 'pending', error_message: null, skip_reason: null, executed_at: null, updated_at: new Date().toISOString() })
    .in('status', ['processing', 'pending']);

  console.log('Processing all due marketing automations with real ZeptoMail SMTP provider...');
  const results = await processDueMarketingAutomations(supabase, {
    staleSeconds: 30,
  });

  console.log('Processing results:', JSON.stringify(results, null, 2));

  console.log('\nChecking final status of marketing executions:');
  const { data: finalExecs } = await supabase
    .from('marketing_automation_executions')
    .select('id, customer_email, status, error_message, skip_reason, provider_message_id, executed_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(JSON.stringify(finalExecs, null, 2));
}

run().catch(console.error);
