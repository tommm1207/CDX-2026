require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const run = async () => {
    const id = '93d31b0c-f730-4ee6-8cc7-92249be13bb4';
    const tables = ['salary_settings', 'attendance', 'advances', 'costs', 'stock_in', 'stock_out', 'production_orders', 'warehouses'];
    for (const table of tables) {
        let field = 'employee_id';
        if (table === 'production_orders' || table === 'stock_in' || table === 'stock_out') field = 'created_by';
        if (table === 'warehouses') field = 'manager_id';
        
        let { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(field, id);
        if (count > 0) console.log(table + ': ' + count + ' records found');
    }
};
run();
