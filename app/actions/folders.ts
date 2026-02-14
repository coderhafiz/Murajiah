"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type Folder = {
  id: string;
  name: string;
  created_at: string;
  quiz_count?: number; // Start with 0, or count later
};

export async function getFolders() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("folders")
    .select("*, quizzes(count)")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching folders:", error);
    return [];
  }

  // Map result to include quiz count if possible, or just return basic folder data
  return data.map((folder) => ({
    ...folder,
    quiz_count: folder.quizzes[0]?.count || 0,
  }));
}

export async function createFolder(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("folders").insert({
    name,
    user_id: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function updateFolder(id: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("folders")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteFolder(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function moveQuizToFolder(
  quizId: string,
  folderId: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Verify ownership of quiz AND folder (if folderId is not null)
  // Simply updating quiz where id=quizId and creator_id=user.id is safe enough for quiz ownership.
  // We trust foreign key constraints for folder existence, but RLS on quiz update protects us.

  const { error } = await supabase
    .from("quizzes")
    .update({ folder_id: folderId })
    .eq("id", quizId)
    .eq("creator_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function moveQuizzesToFolder(
  quizIds: string[],
  folderId: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("quizzes")
    .update({ folder_id: folderId })
    .in("id", quizIds)
    .eq("creator_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
