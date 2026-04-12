require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.rpc("get_tables").then(({ data, error }) => {
  if (error) console.error(error);
  else console.log(data);
});
