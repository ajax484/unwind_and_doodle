const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- MARKETING AUTOMATIONS ---');
  const { data: automations } = await supabase.from('marketing_automations').select('*');
  console.log(JSON.stringify(automations, null, 2));

  console.log('\n--- CUSTOMER DETAILS ---');
  const { data: customer } = await supabase.from('customers').select('*').eq('id', '85099a90-ba2b-4b4f-b3e7-1a341fe72666').maybeSingle();
  console.log(JSON.stringify(customer, null, 2));

  console.log('\n--- ALL RECENT MARKETING EXECUTIONS ---');
  const { data: execs } = await supabase.from('marketing_automation_executions').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(JSON.stringify(execs, null, 2));
}

run().catch(console.error);
