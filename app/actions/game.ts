"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function createGame(quizId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Generate random 6 digit PIN
  // Simple logic:
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
