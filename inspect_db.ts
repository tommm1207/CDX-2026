
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const result: any = {};
  
  const { data: materials } = await supabase.from('materials').select('id, name, code, status').limit(5);
  result.materials = materials;

  const { data: warehouses } = await supabase.from('warehouses').select('id, name, code, status').limit(5);
  result.warehouses = warehouses;

  const { data: inventory } = await supabase.from('inventory').select('*').limit(20);
  result.inventory = inventory;
  
  const { data: stockIn } = await supabase.from('stock_in').select('id, material_id, warehouse_id, quantity, status, date').eq('status', 'Đã duyệt').limit(10);
  result.stockIn = stockIn;

  console.log(JSON.stringify(result, null, 2));
}

check();
