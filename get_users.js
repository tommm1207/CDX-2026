import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function getUsers() {
    try {
        const { data, error } = await supabase.from('users').select('id, code, full_name, role, app_pass').limit(5);
        if (error) {
            console.error(error);
            return;
        }
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

getUsers();
