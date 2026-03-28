"use server";

import { createClient } from "@/utils/supabase/server";

export async function getQuizForExport(quizId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select(
      `
      id,
      title,
      description,
      created_at,
      questions (
        id,
        title,
        question_type,
        time_limit,
        answers (
          text,
          is_correct,
          color,
          order_index
        ),
        order_index
      )
    `,
    )
    .eq("id", quizId)
    .single();

  if (error || !quiz) {
    console.error("Error fetching quiz for export:", error);
    return { success: false, error: "Quiz not found or access denied." };
  }

  // Sort questions by order_index
  if (quiz.questions) {
    (quiz.questions as { order_index: number }[]).sort(
      (a, b) => (a.order_index || 0) - (b.order_index || 0),
    );
  }

  return { success: true, quiz };
}
