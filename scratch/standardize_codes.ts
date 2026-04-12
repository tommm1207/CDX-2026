
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Scanning for Uppercase CDX Codes ---');
    const { data: users, error } = await supabase
        .from('users')
        .select('id, code')
        .like('code', 'CDX%');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${users?.length || 0} records with uppercase CDX.`);
    
    if (users && users.length > 0) {
        for (const user of users) {
          const newCode = user.code.toLowerCase();
          console.log(`Updating ${user.code} -> ${newCode}`);
          const { error: updateError } = await supabase
            .from('users')
            .update({ code: newCode })
            .eq('id', user.id);
          
          if (updateError) {
            console.error(`Failed to update ${user.id}:`, updateError);
          }
        }
    }
    console.log('--- Done ---');
}

main();
