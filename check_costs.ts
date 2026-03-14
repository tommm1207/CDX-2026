
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  console.log('--- Checking Costs Columns ---');
  const { data, error } = await supabase.from('costs').select('*').limit(1);
  if (error) {
    console.error('Error querying costs table:', error);
  } else if (data && data.length > 0) {
    console.log('Costs columns:', Object.keys(data[0]));
  } else {
    // If table is empty, we can try to fetch a broad select to see if it even admits the column
    const { data: colCheck, error: colError } = await supabase.from('costs').select('transaction_type').limit(1);
    if (colError) {
      console.log('Column transaction_type NOT found:', colError.message);
    } else {
      console.log('Column transaction_type exists.');
    }
  }
}

check();
