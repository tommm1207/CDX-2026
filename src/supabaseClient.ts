import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whyulopkxtqlqrhbxdgt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeXVsb3BreHRxbHFyaGJ4ZGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzUzMDksImV4cCI6MjA4ODgxMTMwOX0.85xWQt2QRyQEYllaTMyredulV6aN9vtxzPj9oYwwacc';

export const supabase = createClient(supabaseUrl, supabaseKey);
