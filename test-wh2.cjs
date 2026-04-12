require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.from('warehouses').select('id, code, name').like('code', 'KH%').then(({ data }) => console.log('All KH warehouses:', JSON.stringify(data, null, 2)));
