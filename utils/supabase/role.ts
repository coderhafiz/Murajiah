import { createClient } from "@/utils/supabase/server";

export async function getUserRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) return "user";

  return (data.role as "owner" | "admin" | "moderator" | "user") || "user";
}

export async function isAdmin() {
  const role = await getUserRole();
  return role === "owner" || role === "admin";
}

export async function isOwner() {
  const role = await getUserRole();
  return role === "owner";
}
