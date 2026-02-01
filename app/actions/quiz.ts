"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function duplicateQuiz(quizId: string) {
  const supabase = await createClient();

  // 1. Fetch the original quiz
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*, questions(*, answers(*))")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) {
    console.error("Error fetching quiz for duplication:", quizError);
    return { success: false, error: "Quiz not found" };
  }

  // 2. Create the new quiz
  const { data: newQuiz, error: newQuizError } = await supabase
    .from("quizzes")
    .insert({
      title: `${quiz.title} (Copy)`,
      description: quiz.description,
      cover_image: quiz.cover_image,
      creator_id: quiz.creator_id,
      status: "draft", // Always start as draft
    })
    .select()
    .single();

  if (newQuizError || !newQuiz) {
    console.error("Error creating duplicated quiz:", newQuizError);
    return { success: false, error: "Failed to create duplicate" };
  }

  // 3. Duplicate questions and answers
  for (const question of quiz.questions) {
    const { data: newQuestion, error: questionError } = await supabase
      .from("questions")
      .insert({
        quiz_id: newQuiz.id,
        title: question.title,
        time_limit: question.time_limit,
        points_multiplier: question.points_multiplier,
        order_index: question.order_index,
        question_type: question.question_type,
        media_url: question.media_url,
      })
      .select()
      .single();

    if (questionError || !newQuestion) {
      console.error("Error duplicating question:", questionError);
      continue;
    }

    // Duplicate answers for this question
    const newAnswers = question.answers.map((a: any) => ({
      question_id: newQuestion.id,
      text: a.text,
      is_correct: a.is_correct,
      color: a.color,
      order_index: a.order_index,
    }));

    const { error: answersError } = await supabase
      .from("answers")
      .insert(newAnswers);

    if (answersError) {
      console.error("Error duplicating answers:", answersError);
    }
  }

  revalidatePath("/dashboard");
  return { success: true, id: newQuiz.id };
}

export async function deleteQuiz(quizId: string) {
  const supabase = await createClient();

  // 1. Delete associated data (cascade should handle it, but we can be explicit if needed)
  // Actually, wait, foreign keys in schema.sql are 'on delete cascade' for questions and answers.
  // Games are 'on delete restrict' for quiz_id. We need to handle that.

  // Detach/Delete games? Usually it's better to just delete the quiz and hope it doesn't break history.
  // But 'restrict' means we MUST delete/detach games first.

  // Let's detach first
  await supabase.from("games").delete().eq("quiz_id", quizId);

  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);

  if (error) {
    console.error("Error deleting quiz:", error);
    return { success: false, error: "Failed to delete quiz" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteQuizzes(quizIds: string[]) {
  const supabase = await createClient();

  // Detach games first
  await supabase.from("games").delete().in("quiz_id", quizIds);

  // Delete quizzes
  const { error } = await supabase.from("quizzes").delete().in("id", quizIds);

  if (error) {
    console.error("Error deleting quizzes:", error);
    return { success: false, error: "Failed to delete quizzes" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleFavorite(quizId: string, isFavorite: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("quizzes")
    .update({ is_favorite: isFavorite })
    .eq("id", quizId);

  if (error) {
    console.error("Error toggling favorite:", error);
    return { success: false, error: "Failed to update favorite status" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
