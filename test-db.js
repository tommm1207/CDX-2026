require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.from('warehouses').select('code').like('code', 'KH%').order('code', { ascending: false }).limit(1).then(({ data, error }) => {
    console.log('Result:', data);
    console.log('Error:', error);
});
