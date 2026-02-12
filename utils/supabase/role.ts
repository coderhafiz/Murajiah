import { createClient } from "@/utils/supabase/server";

export async function getUserRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("getUserRole: No user found");
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    console.error("getUserRole: Error fetching profile", error);
    return "user";
  }

  console.log(`getUserRole: User ${user.id} has role ${data.role}`);
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

export async function hasModerationRights() {
  const role = await getUserRole();
  return role === "owner" || role === "admin" || role === "moderator";
}
