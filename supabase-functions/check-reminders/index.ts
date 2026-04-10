// Supabase Edge Function: check-reminders
// Chạy mỗi phút qua cron-job.org để gửi Push Notification khi đến giờ nhắc
// Deploy at: Supabase Dashboard → Edge Functions → New Function → name: check-reminders

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
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const now = new Date().toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find all pending reminders that are due now (within last 24 hours)
    const { data: reminders, error: remErr } = await supabase
      .from("reminders")
      .select("*, sender:users!created_by(full_name)")
      .eq("status", "pending")
      .eq("browser_notification", true)
      .lte("reminder_time", now)
      .gte("reminder_time", twentyFourHoursAgo);

    if (remErr) throw remErr;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ checked: 0, sent: 0 }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    let totalSent = 0;

    for (const rem of reminders) {
      // Parse assignees from serialized content field
      let assignees: string[] = [];
      try {
        if (rem.content) {
          const parsed = JSON.parse(rem.content);
          assignees = parsed.assignees || [];
        }
      } catch (e) {
        assignees = [];
      }

      const senderName = rem.sender?.full_name || "Hệ thống";

      // Get push subscriptions for target users
      let query = supabase.from("push_subscriptions").select("*");
      if (assignees.length > 0) {
        query = query.in("user_id", assignees);
      }
      const { data: subs } = await query;

      if (!subs || subs.length === 0) continue;

      const pushPayload = JSON.stringify({
        title: rem.title || "Nhắc nhở",
        body: `${rem.content ? JSON.parse(rem.content).text || "" : ""}\nThông báo từ ${senderName}`,
        tag: `reminder-${rem.id}`,
        reminderId: rem.id
      });

      const results = await Promise.allSettled(
        subs.map(async (sub) => {
          const pushSub = JSON.parse(sub.subscription_json);
          return webpush.sendNotification(pushSub, pushPayload);
        })
      );

      totalSent += results.filter(r => r.status === "fulfilled").length;

      // Mark reminder as reminded
      await supabase
        .from("reminders")
        .update({ status: "reminded" })
        .eq("id", rem.id);
    }

    return new Response(
      JSON.stringify({ checked: reminders.length, sent: totalSent }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
