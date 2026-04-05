export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    message: "Vercel API diagnostic is WORKING!",
    node: process.version,
    env_keys_present: {
      supabase_url: !!process.env.VITE_SUPABASE_URL,
      supabase_key: !!process.env.VITE_SUPABASE_ANON_KEY || !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      api_secret: !!process.env.API_SECRET_KEY
    },
    time: new Date().toISOString()
  });
}
