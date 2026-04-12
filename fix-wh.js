import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const run = async () => {
    const { data: cols } = await supabase.rpc('get_columns', { table_name: 'warehouses' }).catch(() => ({data: []}));
    console.log(cols);
    const { data, error } = await supabase.from('warehouses').select('*').limit(3);
    console.log(data ? Object.keys(data[0] || {}) : error);
    
    // Fix KH001 duplicates
    const { data: dupes } = await supabase.from('warehouses').select('id, code, created_at').order('created_at', { ascending: true });
    
    let counter = 1;
    for (const d of dupes) {
        if (!d.code || d.code.startsWith('KH')) {
            const nextCode = "KH" + String(counter).padStart(3, '0');
            console.log(Updating  from  to );
            await supabase.from('warehouses').update({ code: nextCode }).eq('id', d.id);
            counter++;
        }
    }
};
run();
