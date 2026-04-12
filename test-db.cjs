require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const run = async () => {
    let { data, error } = await supabase.from('users').select('*').limit(1);
    console.log(error || data);
};
run();
