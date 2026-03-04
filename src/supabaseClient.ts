import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fbhkdtjrbtgzhktkoobu.supabase.co';
const supabaseKey = 'sb_publishable_lHCm_7vWOzFdAiIsBINxlQ_HBSq-F4r';

export const supabase = createClient(supabaseUrl, supabaseKey);
