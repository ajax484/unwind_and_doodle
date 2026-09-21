import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getServiceSupabaseClient } from '../src/lib/supabase/client';
import { executeSingleAutomation } from '../src/services/marketing-executor.service';

async function run() {
  const supabase = getServiceSupabaseClient();
  const executionId = '18b8ee76-7428-4b38-b431-cfb212a8608a';
  console.log(`Testing executeSingleAutomation on ${executionId}...`);

  // Reset status to pending so it can be claimed
  await supabase
    .from('marketing_automation_executions')
    .update({ status: 'pending', error_message: null, skip_reason: null, executed_at: null })
    .eq('id', executionId);

  const result = await executeSingleAutomation(supabase, executionId);
  console.log('Execution result:', result);

  const { data: updatedExec } = await supabase
    .from('marketing_automation_executions')
    .select('*')
    .eq('id', executionId)
    .single();

  console.log('Updated execution row:', updatedExec);
}

run().catch(console.error);
