"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function clearAllReports() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // 1. Get IDs of games to delete
    const { data: gamesToDelete, error: fetchError } = await supabase
      .from("games")
      .select("id")
      .eq("host_id", user.id)
      .eq("status", "finished");

    if (fetchError) {
      console.error("Error fetching games to delete:", fetchError);
      throw new Error("Failed to fetch games");
    }

    if (!gamesToDelete || gamesToDelete.length === 0) {
      return { success: true };
    }

    const gameIds = gamesToDelete.map((g) => g.id);

    // 1.5. Archive them first (Soft Delete guarantee)
    // This ensures they disappear from the UI immediately even if hard delete fails later
    await supabase
      .from("games")
      .update({ status: "archived" })
      .in("id", gameIds);

    // 2. Delete related player_answers
    const { error: answersError } = await supabase
      .from("player_answers")
      .delete()
      .in("game_id", gameIds);

    if (answersError) {
      console.error("Error deleting player answers:", answersError);
      throw new Error("Failed to delete answer history");
    }

    // 3. Delete related players
    const { error: playersError } = await supabase
      .from("players")
      .delete()
      .in("game_id", gameIds);

    if (playersError) {
      console.error("Error deleting players:", playersError);
      throw new Error("Failed to delete player history");
    }

    // 4. Delete games
    // 4. Delete games
    const { error: gamesError, count: deletedGamesCount } = await supabase
      .from("games")
      .delete({ count: "exact" })
      .in("id", gameIds);

    if (gamesError) {
      console.error("Error deleting games:", gamesError);
      throw new Error("Failed to delete game records");
    }

    console.log(
      `Successfully deleted ${deletedGamesCount} games and related data.`,
    );

    revalidatePath("/dashboard/reports");
    return { success: true, count: deletedGamesCount };
  } catch (error) {
    console.error("Error in clearAllReports:", error);
    throw error;
  }
}
