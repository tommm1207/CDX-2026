// src/lib/webPush.ts
// Manages Service Worker registration and Push Subscription for CDX App

export const VAPID_PUBLIC_KEY = 'BDODhnt-D7_5KejhSIrsLL3EdIdaaFiHQSd6wWqeOJ3sm7roQNRYfP636_DU6R8ey0xO5TTQ6Y_IMZeLxRNasic';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[CDX Push] Service Worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[CDX Push] Service Worker registration failed:', err);
    return null;
  }
}

export async function subscribeToPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[CDX Push] Web Push not supported in this browser');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await reg.pushManager.getSubscription();
    
    if (!subscription) {
      // Request new subscription
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Save subscription to Supabase without relying on potentially conflicting unique constraints
    const { supabase } = await import('./supabase');
    const { data: existing, error: checkErr } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existing) {
      const { error: upErr } = await supabase.from('push_subscriptions').update({
        user_id: userId,
        subscription_json: JSON.stringify(subscription),
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
      
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await supabase.from('push_subscriptions').insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        subscription_json: JSON.stringify(subscription),
        updated_at: new Date().toISOString()
      });
      
      if (insErr) throw insErr;
    }

    console.log('[CDX Push] Push subscription saved successfully');
  } catch (err: any) {
    console.error('[CDX Push] Failed to subscribe to push:', err);
    throw err; // Propagate error so App.tsx can show a red toast
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      const { supabase } = await import('./supabase');
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    }
  } catch (err) {
    console.error('[CDX Push] Failed to unsubscribe:', err);
  }
}
