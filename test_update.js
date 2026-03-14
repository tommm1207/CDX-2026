require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testUpdate() {
  // fetch one material to update
  const { data: mats, error: fetchErr } = await supabase.from('materials').select('*').limit(1);
  if (fetchErr) {
    console.error('Fetch err', fetchErr);
    return;
  }
  
  if (!mats || mats.length === 0) return;
  const mat = mats[0];
  console.log('Got material', mat);
  
  const { id, ...dbPayload } = {
    ...mat,
    status: mat.status || 'Đang sử dụng'
  };
  
  console.log('Sending payload to update', dbPayload);
  const { data, error } = await supabase.from('materials').update(dbPayload).eq('id', id);
  console.log('Update result', data, error);
}

testUpdate();
