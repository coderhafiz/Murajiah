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

  // Fetch all notifications
  const { data: notifications, error } = await supabase
    .from("global_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20); // Limit to last 20 for performance

  if (error) return [];

  // Fetch read status
  const { data: reads } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", user.id);

  const readIds = new Set(reads?.map((r) => r.notification_id));

  return notifications.map((n) => ({
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
