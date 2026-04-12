require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    let queryBase = supabase.from('stock_in').select('*', { count: 'exact', head: false }).eq('employee_id', '123');
    let res = await queryBase.clone();
    console.log('Error:', res.error);
}
run();
