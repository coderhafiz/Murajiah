"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { sendSystemNotification } from "@/lib/notifications";

export async function notifyQuizPublished(quizId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Verify ownership and visibility
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("title, visibility, creator_id")
    .eq("id", quizId)
    .single();

  if (error || !quiz) return { error: "Quiz not found" };

  if (quiz.creator_id !== user.id) return { error: "Unauthorized" };
  if (quiz.visibility !== "public") return { error: "Quiz is not public" };

  // Send Notification
  await sendSystemNotification(
    "New Quiz Published!",
    `A new quiz "${quiz.title}" is now available for everyone to play.`,
    "success",
  );

  return { success: true };
}

export async function notifyOwnerOfUserPublish(quizId: string) {
  const supabase = await createClient(); // Use regular client to get session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const adminSupabase = createAdminClient();

  // 1. Check if user is already owner (don't notify self)
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role === "owner") return; // Owner published it, no need to notify

  // 2. Find Owner
  const { data: owners } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role", "owner");

  if (!owners || owners.length === 0) return;

  // 3. Notify each owner (usually just one)
  const userName = profile?.full_name || profile?.email || "Unknown User";

  for (const owner of owners) {
    await sendSystemNotification(
      "User Published Quiz",
      `User ${userName} published a new quiz.`,
      "warning",
      owner.id,
    );
  }
}
