"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import dns from "node:dns";

// Force IPv4 to resolve node fetch issues in some environments
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore if not supported
}

export type Folder = {
  id: string;
  name: string;
  created_at: string;
  quiz_count?: number;
  is_hidden?: boolean;
};

export async function getFolders() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*, quizzes(count)")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) {
        console.error(`Error fetching folders (attempt ${attempts + 1}): ${error?.message || "Unknown error"}`, error);
        if (attempts === maxAttempts - 1) return [];
      } else {
        return data.map((folder) => ({
          ...folder,
          quiz_count: folder.quizzes[0]?.count || 0,
        }));
      }
    } catch (err) {
      console.error(`Fetch failed (attempt ${attempts + 1}):`, err);
      if (attempts === maxAttempts - 1) return [];
    }
    
    attempts++;
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, 500 * attempts));
  }

  return [];
}

export async function toggleFolderVisibility(id: string, isHidden: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("folders")
    .update({ is_hidden: isHidden })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
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
