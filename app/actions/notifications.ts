"use server";

import { createClient } from "@/utils/supabase/server";
import { isAdmin } from "@/utils/supabase/role";
import { revalidatePath } from "next/cache";

export type NotificationType = "info" | "warning" | "success";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  created_at: string;
  user_id?: string | null;
  is_sticky?: boolean;
}


export async function createGlobalNotification(data: {
  title: string;
  message: string;
  type: NotificationType;
  is_sticky?: boolean;
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

  // Check user settings and join date
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_settings, created_at")
    .eq("id", user.id)
    .single();

  const userCreatedAt = profile?.created_at || user.created_at;


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
  const query = supabase
    .from("global_notifications")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: notifications, error } = await query as { data: Notification[] | null; error: unknown };

  if (error || !notifications) return [];

  // Filter in memory for now allows fine-grained control
  const filteredNotifications = notifications.filter((n: Notification) => {
    // Always show targeted notifications
    if (n.user_id === user.id) return true;

    // For Global: Only show if created after user join date OR if it is sticky
    const notificationDate = new Date(n.created_at).getTime();
    const joinDate = new Date(userCreatedAt).getTime();
    
    if (notificationDate < joinDate && !n.is_sticky) return false;

    // Check opt-out settings
    if (settings?.quiz_publish === false) return false;

    return true;
  });


  // Fetch read status
  const { data: reads } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", user.id);

  const readIds = new Set((reads as { notification_id: string }[] | null)?.map((r) => r.notification_id));

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
  const unread = (notifications as { is_read: boolean; id: string }[]).filter((n) => !n.is_read);

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
    is_sticky?: boolean;
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
export async function sendWelcomeNotification() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Check if they already received the welcome notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("welcome_notified")
    .eq("id", user.id)
    .single();

  if (profile?.welcome_notified) return;

  // Create the welcome notification
  const { error } = await supabase.from("global_notifications").insert({
    user_id: user.id,
    title: "🎉 Welcome to Murajiah!",
    message: "We're glad to have you! Explore thousands of public quizzes and start your learning journey today.",
    type: "success",
  });

  if (!error) {
    // Mark as notified
    await supabase
      .from("profiles")
      .update({ welcome_notified: true })
      .eq("id", user.id);
  }
}

