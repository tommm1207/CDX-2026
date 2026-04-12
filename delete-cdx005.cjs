require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const run = async () => {
    const id = '93d31b0c-f730-4ee6-8cc7-92249be13bb4';
    
    console.log('Purging dependencies for CDX005...');
    const { error: sError } = await supabase.from('salary_settings').delete().eq('employee_id', id);
    if (sError) console.error('Error purging salary_settings:', sError);
    else console.log('Successfully purged salary_settings.');

    console.log('Deleting user CDX005...');
    const { error: uError } = await supabase.from('users').delete().eq('id', id);
    if (uError) console.error('Error deleting user:', uError);
    else console.log('Successfully deleted CDX005 permanently.');
};
run();
