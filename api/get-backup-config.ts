import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const { data, error } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', `backup_settings_${userId}`)
      .single();

    if (error || !data) {
      return res.status(200).json({});
    }

    return res.status(200).json(data.value);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
