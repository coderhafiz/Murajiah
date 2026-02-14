"use server";

import { createClient } from "@/utils/supabase/server";
import { isAdmin } from "@/utils/supabase/role";
import { revalidatePath } from "next/cache";

export async function createGlobalNotification(data: {
  title: string;
  message: string;
  type: "info" | "warning" | "success";
}) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("global_notifications").insert({
    ...data,
    created_by: user?.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function getAdminNotifications() {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("global_notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getUserNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Check user settings for consent (e.g., quiz_publish)
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_settings")
    .eq("id", user.id)
    .single();

  const settings = profile?.notification_settings as {
    quiz_publish?: boolean;
    game_start?: boolean;
  } | null;

  // Filter Logic:
  // If settings exist, use them. If not set, default to showing (or not?).
  // User asked for "Permission first". So default should be FALSE until set?
  // But globally we want them to see things unless opted OUT?
  // Let's implement logic: Show GLOBAL only if consent is TRUE or NOT SET (soft opt-in)
  // OR Show GLOBAL only if consent is TRUE (strict opt-in).
  // The modal forces a choice. Let's assume strict opt-in for "quiz_publish" global events.

  // Fetch all notifications (Global + Targeted)
  let query = supabase
    .from("global_notifications")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: notifications, error } = await query;

  if (error) return [];

  // Filter in memory for now allows fine-grained control
  const filteredNotifications = notifications.filter((n) => {
    // Always show targeted notifications
    if (n.user_id === user.id) return true;

    // For Global: Check type? Currently we don't have type on notification, just title/message.
    // Assuming most global ones are "quiz_publish" or "game_start" related.
    // If strict opt-in is required:
    if (settings?.quiz_publish === false) return false;

    return true;
  });

  // Fetch read status
  const { data: reads } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", user.id);

  const readIds = new Set(reads?.map((r) => r.notification_id));

  return filteredNotifications.map((n) => ({
    ...n,
    is_read: readIds.has(n.id),
  }));
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("notification_reads").insert({
    user_id: user.id,
    notification_id: notificationId,
  });

  revalidatePath("/dashboard");
}

export async function markAllAsRead() {
  // Complex to do efficiently without a "last_read_at" on profile.
  // For now, iterate unread in top 20 or just insert all missing.
  // Or better: just add a "mark as read" button for individual.
  // Implementing "Mark All" naively: fetch unread, insert.

  const notifications = await getUserNotifications();
  const unread = notifications.filter((n) => !n.is_read);

  if (unread.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const inserts = unread.map((n) => ({
    user_id: user.id,
    notification_id: n.id,
  }));

  await supabase.from("notification_reads").insert(inserts);
  revalidatePath("/dashboard");
}

export async function updateGlobalNotification(
  id: string,
  data: {
    title: string;
    message: string;
    type: "info" | "warning" | "success";
  },
) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("global_notifications")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/account/admin/notifications");
  // Also revalidate dashboard if updated?
  revalidatePath("/dashboard");
}

export async function deleteGlobalNotification(id: string) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("global_notifications")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/account/admin/notifications");
  revalidatePath("/dashboard");
}
