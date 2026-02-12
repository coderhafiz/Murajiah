"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateNotificationSettings(settings: {
  quiz_publish: boolean;
  game_start: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update({ notification_settings: settings })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export async function getNotificationSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("notification_settings")
    .eq("id", user.id)
    .single();

  if (error) return null;

  return data.notification_settings;
}
