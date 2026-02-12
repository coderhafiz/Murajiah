"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/server"; // Ensure this matches your admin client path
import { revalidatePath } from "next/cache";

export type Comment = {
  id: string;
  user_id: string; // Foreign Key to Profiles
  content: string;
  is_approved: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
};

export async function submitComment(content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Please sign in to leave a comment.");

  const { error } = await supabase.from("comments").insert({
    user_id: user.id,
    content,
    is_approved: false, // Default to pending
  });

  if (error) throw new Error(error.message);
  revalidatePath("/"); // Revalidate home in case we show pending status? Unlikely.
}

export async function getApprovedComments(): Promise<Comment[]> {
  const supabase = await createClient();
  let attempt = 0;
  const maxRetries = 2; // Reduced retries for faster feedback

  while (attempt < maxRetries) {
    try {
      // 1. Check if ANY approved comments exist (Lightweight HEAD request)
      const { count, error: countError } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", true);

      if (countError) throw countError;

      if (count === 0 || count === null) {
        return []; // No comments, return empty immediately
      }

      // 2. Only fetch if comments exist
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles(full_name, avatar_url)")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error) {
        return data as Comment[];
      }

      throw error;
    } catch (err: any) {
      if (attempt === maxRetries - 1) {
        // Silent fail on last attempt to avoid console noise for timeouts/empty DBs
        // console.warn("Failed to fetch comments after retries:", err.message);
        return [];
      }
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return [];
}

// ADMIN ACTIONS

import { hasModerationRights } from "@/utils/supabase/role";

// ... existing code ...

// ADMIN ACTIONS

export async function adminGetComments(): Promise<Comment[]> {
  if (!(await hasModerationRights())) {
    throw new Error("Unauthorized");
  }

  // Let's use createAdminClient to be safe and simple for Admin Dashboard
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("comments")
    .select("*, profiles(full_name, avatar_url)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Comment[];
}

export async function adminApproveComment(id: string, isApproved: boolean) {
  if (!(await hasModerationRights())) {
    throw new Error("Unauthorized");
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("comments")
    .update({ is_approved: isApproved })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/"); // Update homepage
  revalidatePath("/account/admin/comments"); // Update admin panel
}

export async function adminDeleteComment(id: string) {
  if (!(await hasModerationRights())) {
    throw new Error("Unauthorized");
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("comments").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/account/admin/comments");
}
