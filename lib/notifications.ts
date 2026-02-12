import { createAdminClient } from "@/utils/supabase/server";

export type NotificationType = "info" | "warning" | "success";

export async function sendSystemNotification(
  title: string,
  message: string,
  type: NotificationType = "info",
  userId?: string, // Optional: If provided, only this user sees it
) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("global_notifications").insert({
    title,
    message,
    type,
    user_id: userId || null, // Handle specific user target
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to send system notification:", error);
  }
}
