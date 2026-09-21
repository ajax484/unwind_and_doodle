const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- RE-CHECKING EXECUTIONS FOR bilalyusufubangida@gmail.com ---');
  const { data: execs } = await supabase
    .from('marketing_automation_executions')
    .select('*')
    .eq('customer_email', 'bilalyusufubangida@gmail.com')
    .order('created_at', { ascending: false });

  console.log('Executions found:', execs?.map(e => ({ id: e.id, status: e.status, domain_event_id: e.domain_event_id })));
}

run().catch(console.error);
