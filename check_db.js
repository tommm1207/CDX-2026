import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCostsStatus() {
  const { data, error } = await supabase.from('costs').select('status').limit(1);
  if (error) {
    if (error.message.includes('column "status" does not exist')) {
      console.log('status column missing');
      // Unfortunately we can't alter table via REST API usually, unless we have service role key or use SQL function.
      // Wait, is there a way to see if there is a status column? Yes, the error tells us.
    } else {
      console.log('Other error:', error.message);
    }
  } else {
    console.log('status column exists');
  }
}

checkCostsStatus();
