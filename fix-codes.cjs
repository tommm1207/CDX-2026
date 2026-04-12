require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    await supabase.from('warehouses').update({ code: 'KH001' }).eq('id', '7a79571e-83cc-41f8-9054-7ecad9cc2dd0');
    await supabase.from('warehouses').update({ code: 'KH002' }).eq('id', '593f0442-5f0b-4156-a6e0-9a139e6633a5');
    await supabase.from('warehouses').update({ code: 'KH003' }).eq('id', '5c5ae542-b9c7-41cb-8df4-e6d8bcdd2dac');
    await supabase.from('warehouses').update({ code: 'KH004' }).eq('id', 'b15e0b3a-d292-49b3-9279-cb67a11476d4');
    console.log('Fixed codes!');
}
run();
