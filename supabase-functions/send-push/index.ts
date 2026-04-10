// Supabase Edge Function: send-push
// Deploy this at: https://supabase.com/dashboard → Edge Functions → New Function → name: send-push
// Deno runtime, no npm install needed

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(
  "mailto:admin@conduxanh.vn",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  try {
    const body = await req.json();
    const { reminder_id, title, body: msgBody, sender_name, assignees } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get push subscriptions for the target users
    let query = supabase.from("push_subscriptions").select("*");
    if (assignees && assignees.length > 0) {
      query = query.in("user_id", assignees);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const payload = JSON.stringify({
      title: title,
      body: `${msgBody}\n\nThông báo từ ${sender_name}`,
      tag: `reminder-${reminder_id}`,
      reminderId: reminder_id
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSub = JSON.parse(sub.subscription_json);
        return webpush.sendNotification(pushSub, payload, {
          headers: { 'Urgency': 'high' }
        });
      })
    );

    const sent = results.filter(r => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
