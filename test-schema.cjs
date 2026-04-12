require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const run = async () => {
    let { data, error } = await supabase.from('production_orders').select('*').limit(1);
    console.log('Production Orders:', data?.[0] || error);
    
    let { data: items, error: itemError } = await supabase.from('production_order_items').select('*').limit(1);
    console.log('Production Order Items:', items?.[0] || itemError);
};
run();
