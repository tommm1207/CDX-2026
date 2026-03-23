
import { createClient } from '@supabase/supabase-client';

const supabaseUrl = 'https://whyulopkxtqlqrhbxdgt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeXVsb3BreHRxbHFyaGJ4ZGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzUzMDksImV4cCI6MjA4ODgxMTMwOX0.85xWQt2QRyQEYllaTMyredulV6aN9vtxzPj9oYwwacc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAdmin() {
  const { data, error } = await supabase.from('users').select('*').eq('code', 'admin');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Admin user:', JSON.stringify(data, null, 2));
  }
}

checkAdmin();
