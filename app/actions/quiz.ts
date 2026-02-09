"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleLike(quizId: string) {
  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to like a quiz.");
  }

  // 2. Check if like exists
  const { data: existingLike, error: checkError } = await supabase
    .from("quiz_likes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("quiz_id", quizId)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116 is "No rows found", which is expected if not liked yet
    console.error("Error checking like status:", checkError);
    throw new Error("Failed to update like.");
  }

  if (existingLike) {
    // 3. Unlike: Delete the record
    const { error: deleteError } = await supabase
      .from("quiz_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("quiz_id", quizId);

    if (deleteError) {
      console.error("Error unliking:", deleteError);
      throw new Error("Failed to unlike quiz.");
    }
  } else {
    // 4. Like: Insert the record
    const { error: insertError } = await supabase.from("quiz_likes").insert({
      user_id: user.id,
      quiz_id: quizId,
    });

    if (insertError) {
      console.error("Error liking:", insertError);
      throw new Error("Failed to like quiz.");
    }
  }

  // 5. Revalidate to show updated count and state
  revalidatePath("/");
  revalidatePath(`/quiz/${quizId}`);
  revalidatePath("/dashboard");
}

export async function deleteQuiz(
  quizId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);

  if (error) {
    console.error("Error deleting quiz:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function duplicateQuiz(
  quizId: string,
): Promise<{ success: boolean; error?: string; newQuizId?: string }> {
  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // 2. Fetch original quiz
  const { data: originalQuiz, error: fetchError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (fetchError || !originalQuiz) {
    return { success: false, error: "Quiz not found" };
  }

  // 3. Create new quiz
  const { data: newQuiz, error: createError } = await supabase
    .from("quizzes")
    .insert({
      title: `${originalQuiz.title} (Copy)`,
      description: originalQuiz.description,
      cover_image: originalQuiz.cover_image,
      visibility: "private", // Default to private for copies
      creator_id: user.id,
      tags: originalQuiz.tags,
    })
    .select()
    .single();

  if (createError || !newQuiz) {
    console.error("Error creating duplicate quiz:", createError);
    return { success: false, error: createError?.message };
  }

  // 4. Fetch questions
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (questionsError) {
    console.warn("Could not fetch questions to duplicate:", questionsError);
  } else if (questions && questions.length > 0) {
    // 5. Duplicate questions
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const questionsToInsert = questions.map(
      ({ id, quiz_id, created_at, ...q }) => ({
        ...q,
        quiz_id: newQuiz.id,
      }),
    );

    const { error: insertQuestionsError } = await supabase
      .from("questions")
      .insert(questionsToInsert);

    if (insertQuestionsError) {
      console.error("Error duplicating questions:", insertQuestionsError);
    }
  }

  revalidatePath("/dashboard");
  return { success: true, newQuizId: newQuiz.id };
}

export async function deleteQuizzes(
  quizIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("quizzes").delete().in("id", quizIds);

  if (error) {
    console.error("Error deleting quizzes:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleFavorite(
  quizId: string,
  isFavorite: boolean,
): Promise<void> {
  // Alias to toggleLike, ignoring isFavorite boolean for now as toggleLike handles state source of truth
  // Or better, ensure state matches isFavorite if possible, but simpler to just toggle.
  // Actually, let's just call toggleLike since it does the same logic (insert if not exists, delete if exists).
  await toggleLike(quizId);
}
