require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.from('users').delete().eq('id', '93d31b0c-f730-4ee6-8cc7-92249be13bb4').then(({ error }) => {
    console.log('Delete result error:', JSON.stringify(error, null, 2));
});
