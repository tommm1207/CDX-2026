
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  console.log('--- Checking Inventory Table Existence ---');
  const { data, error } = await supabase.from('inventory').select('*').limit(1);
  if (error) {
    console.error('Error querying inventory table:', error);
  } else {
    console.log('Inventory table exists. Data:', data);
  }

  console.log('--- Checking All Tables ---');
  // There is no easy way to list tables in Supabase via JS client without RPC or direct postgres query
  // But we can try to select from information_schema if allowed (usually not)
}

check();
