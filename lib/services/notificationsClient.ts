import { createClient } from "@supabase/supabase-js";

/**
 * Subscribe to new notifications using Supabase realtime.
 * Kept client-side to avoid serializing Supabase channel instances through RSC.
 */
export async function subscribeToNotifications(
  callback: (notification: any) => void
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
}
