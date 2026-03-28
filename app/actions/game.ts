"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUserAccessContext } from "@/lib/access";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore
}

import { sendSystemNotification } from "@/lib/notifications";

// ...

export async function createGame(quizId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Fetch Quiz Details for Notification & Access Check
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("title, visibility, creator_id")
    .eq("id", quizId)
    .single();

  const quizTitle = quiz?.title || "Unknown Quiz";

  if (quizError || !quiz) {
    throw new Error("Quiz not found");
  }

  // Tier Check
  const access = await getUserAccessContext();
  if (access.tier === "FREE") {
    // Free users can only host public quizzes OR their own quizzes (if we decide to allow it)
    // Based on requirements: "only view and host public quizzes"
    if (quiz.visibility !== "public" && quiz.creator_id !== user.id) {
      throw new Error(
        "Free users can only host games for Public quizzes. Please upgrade to host private quizzes from other users.",
      );
    }
  }

  // Generate random 6 digit PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  const { data: game, error } = await supabase
    .from("games")
    .insert({
      quiz_id: quizId,
      host_id: user.id,
      pin: pin,
      status: "waiting",
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Failed to create game");
  }

  // Trigger Notification
  await sendSystemNotification(
    "Live Game Started!",
    `A new Live Game for "${quizTitle}" has started! Join with PIN: ${pin}`,
    "info",
  );

  redirect(`/host/${game.id}`);
}

export async function endGame(gameId: string) {
  const supabase = await createClient();

  // Update the game status
  const { error } = await supabase
    .from("games")
    .update({
      status: "finished",
      ended_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  if (error) {
    console.error("Error ending game:", error);
    throw new Error("Failed to end game");
  }

  return { success: true };
}
