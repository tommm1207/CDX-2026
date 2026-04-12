
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  // Query postgres directly to see tables
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // try informative query
    const { data: data2, error: error2 } = await supabase.from('costs').select('*').limit(1);
    console.log('Sample Cost Data:', data2);
    
    // Check if we can get schema info another way
    // often we can't via REST API without specific RPCs
    console.log('RPC failed:', error.message);
  } else {
    console.log('Tables:', data);
  }
}

listTables();
