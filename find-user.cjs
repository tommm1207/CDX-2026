require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const run = async () => {
    let { data: user, error } = await supabase.from('users').select('id, full_name, code').eq('code', 'CDX005').single();
    if (error) {
        console.error('User not found:', error);
        return;
    }
    console.log('Target User:', user);
};
run();
