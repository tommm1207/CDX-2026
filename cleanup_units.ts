
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function cleanup() {
  console.log('--- Cleaning up units in costs table ---');
  
  // 1. Update 'cai' to 'Cái' in costs
  const { data: c1, error: e1 } = await supabase
    .from('costs')
    .update({ unit: 'Cái' })
    .eq('unit', 'cai');
  console.log('Updated "cai" to "Cái" in costs:', e1 ? e1.message : 'Success');

  // 2. Update '1' to empty in costs
  const { data: c2, error: e2 } = await supabase
    .from('costs')
    .update({ unit: '' })
    .eq('unit', '1');
  console.log('Cleared unit "1" in costs:', e2 ? e2.message : 'Success');

  console.log('--- Cleaning up units in materials table ---');

  // 3. Update 'cai' to 'Cái' in materials
  const { data: m1, error: em1 } = await supabase
    .from('materials')
    .update({ unit: 'Cái' })
    .eq('unit', 'cai');
  console.log('Updated "cai" to "Cái" in materials:', em1 ? em1.message : 'Success');

  // 4. Update '1' to empty in materials
  const { data: m2, error: em2 } = await supabase
    .from('materials')
    .update({ unit: '' })
    .eq('unit', '1');
  console.log('Cleared unit "1" in materials:', em2 ? em2.message : 'Success');

  console.log('--- Done ---');
}

cleanup();
