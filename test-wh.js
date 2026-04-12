import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('warehouses').select('*');
  console.log(error ? 'Error: ' + JSON.stringify(error) : 'Warehouses: ' + JSON.stringify(data, null, 2));
}
run();
