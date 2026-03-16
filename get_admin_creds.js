import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAdmin() {
    try {
        const { data, error } = await supabase.from('users').select('code, app_pass').eq('role', 'Admin').limit(1);
        if (error) {
            console.error(error);
            return;
        }
        console.log("LOGIN_CODE:", data[0].code);
        console.log("LOGIN_PASS:", data[0].app_pass);
    } catch (e) {
        console.error(e);
    }
}

getAdmin();
