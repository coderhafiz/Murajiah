"use server";

import { createClient } from "@/utils/supabase/server";
import { isOwner, isAdmin } from "@/utils/supabase/role";
import { revalidatePath } from "next/cache";

export async function getUsers(
  query: string = "",
  page: number = 1,
  limit: number = 20,
) {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let queryBuilder = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1)
    .order("updated_at", { ascending: false, nullsFirst: false });
  // profiles might not have created_at if not added, but schema has updated_at.
  // The handle_new_user trigger doesn't set created_at on profiles?
  // Schema says updated_at. Let's order by email or updated_at.

  if (query) {
    queryBuilder = queryBuilder.or(
      `email.ilike.%${query}%,full_name.ilike.%${query}%`,
    );
  }

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Error fetching users:", error);
    return { data: [], count: 0, error: error.message };
  }

  return { data, count, error: null };
}

export async function updateUserRole(userId: string, newRole: string) {
  if (!(await isOwner())) {
    throw new Error("Unauthorized: Only owners can change roles");
  }

  const allowedRoles = ["owner", "admin", "moderator", "user"];
  if (!allowedRoles.includes(newRole)) {
    throw new Error("Invalid role");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/account/admin/users");
  return { success: true };
}

export async function softDeleteQuiz(quizId: string) {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", quizId);

  if (error) throw new Error(error.message);

  revalidatePath("/account/admin/content");
  return { success: true };
}

export async function restoreQuiz(quizId: string) {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({ deleted_at: null })
    .eq("id", quizId);

  if (error) throw new Error(error.message);

  revalidatePath("/account/admin/content");
  return { success: true };
}

export async function getAdminQuizzes(
  query: string = "",
  page: number = 1,
  limit: number = 20,
) {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let queryBuilder = supabase
    .from("quizzes")
    .select("*, profiles:creator_id(full_name, email)", { count: "exact" })
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (query) {
    queryBuilder = queryBuilder.ilike("title", `%${query}%`);
  }

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Error fetching quizzes:", error);
    return { data: [], count: 0, error: error.message };
  }

  return { data, count, error: null };
}
