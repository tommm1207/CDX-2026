import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[CDX] Thiếu biến môi trường VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Kiểm tra file .env');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');
