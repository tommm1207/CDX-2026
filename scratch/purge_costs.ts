import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function purgeCosts() {
  console.log('Purging test cost records...');
  // Delete all records in costs table
  const { data, error } = await supabase.from('costs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error('Error purging costs:', error);
  } else {
    console.log('Successfully purged all cost records.');
  }
}

purgeCosts();
