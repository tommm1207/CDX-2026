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
      // Parse content to get text and assignees
      let textContent = "";
      let assignees: string[] = [];
      
      try {
        if (rem.content) {
          if (rem.content.trim().startsWith('{"__v":1')) {
            const parsed = JSON.parse(rem.content);
            textContent = parsed.text || "";
            assignees = parsed.assignees || [];
          } else {
            // Fallback for raw text content
            textContent = rem.content;
            assignees = [];
          }
        }
      } catch (e) {
        console.error(`Error parsing content for reminder ${rem.id}:`, e);
        textContent = rem.content || "";
        assignees = [];
      }

      const senderName = rem.sender?.full_name || "Hệ thống";

      // Get push subscriptions for target users
      let query = supabase.from("push_subscriptions").select("*");
      if (assignees.length > 0) {
        query = query.in("user_id", assignees);
      }
      const { data: subs, error: subErr } = await query;
      
      if (subErr) {
        console.error("Error fetching push subscriptions:", subErr);
        continue;
      }

      if (!subs || subs.length === 0) continue;

      const pushPayload = JSON.stringify({
        title: rem.title || "Nhắc nhở",
        body: `${textContent}\n\nThông báo từ ${senderName}`,
        tag: `reminder-${rem.id}`,
        reminderId: rem.id
      });

      for (const sub of subs) {
        try {
          const pushSub = JSON.parse(sub.subscription_json);
          await webpush.sendNotification(pushSub, pushPayload, {
            headers: { 'Urgency': 'high' }
          });
          totalSent++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2s gap between devices
        } catch (e: any) {
          // NOT deleting on 410/404 - Apple beta iOS returns false 410s for valid subscriptions
          console.warn(`Push failed for sub ${sub.id}:`, e.message);
        }
      }

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

  } catch (err: any) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
