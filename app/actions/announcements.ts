"use server";

import { createClient } from "@/utils/supabase/server";
import { isAdmin } from "@/utils/supabase/role";
import { revalidatePath } from "next/cache";

export type Announcement = {
  id: string;
  heading: string;
  content: string;
  image_url?: string;
  layout_type: "centered" | "image_left" | "image_right" | "banner";
  is_active: boolean;
  created_at: string;
  created_by?: string;
  type?: "general" | "welcome";
};

export async function getActiveAnnouncement(): Promise<Announcement | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .neq("type", "welcome") // Exclude welcome messages from general banner
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code && error.code !== "PGRST116") {
    console.error("Error fetching active announcement:", error);
  }

  return data || null;
}

export async function getActiveWelcomeAnnouncement(): Promise<Announcement | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .eq("type", "welcome")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code && error.code !== "PGRST116") {
    // PGRST116 is "Relation null" or "Row not found" for single()
    console.error("Error fetching active welcome announcement:", error);
  }

  return data || null;
}

export async function getAnnouncements() {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Announcement[];
}

export async function createAnnouncement(
  data: Omit<Announcement, "id" | "created_at" | "created_by">,
) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const supabase = await createClient();

  // If setting this one to active, deactivate others (optional, but good UX)
  if (data.is_active) {
    await supabase
      .from("announcements")
      .update({ is_active: false })
      .eq("is_active", true);
  }

  const { error } = await supabase.from("announcements").insert(data);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/account/admin/announcements");
}

export async function updateAnnouncement(
  id: string,
  updates: Partial<Announcement>,
) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const supabase = await createClient();

  if (updates.is_active) {
    await supabase
      .from("announcements")
      .update({ is_active: false })
      .eq("is_active", true)
      .neq("id", id);
  }

  const { error } = await supabase
    .from("announcements")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/account/admin/announcements");
}

export async function deleteAnnouncement(id: string) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/account/admin/announcements");
}
