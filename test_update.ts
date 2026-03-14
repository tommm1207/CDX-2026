import { supabase } from './src/supabaseClient';

async function testUpdate() {
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
  console.log('Update error:', error);
  console.log('Update data:', data);
}

testUpdate();
