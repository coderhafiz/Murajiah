"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  notifyQuizPublished,
  notifyOwnerOfUserPublish,
} from "@/app/actions/quiz-events";

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
  await toggleLike(quizId);
}

// Types corresponding to QuizEditor
type Answer = {
  id?: string;
  text: string;
  is_correct: boolean;
  color?: string;
  order_index?: number;
  media_url?: string;
};

type Question = {
  id?: string;
  title: string;
  time_limit: number;
  answers: Answer[];
  question_type: string;
  media_url?: string;
  answer_format?: "choice" | "text" | "audio";
  points_multiplier?: number;
  order_index?: number; // Added for explicit ordering if passed
};

export async function saveQuiz(
  quizId: string,
  quizData: {
    title: string;
    description?: string | null;
    cover_image?: string | null;
    visibility: "public" | "private";
    tags: string[];
    // Status is calculated on client currently, but server should probably validate it?
    // Let's accept status from client for now to match logic.
    status: string;
  },
  questions: Question[],
  deletedQuestionIds: string[],
) {
  const supabase = await createClient(); // Authenticated client
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const adminClient = createAdminClient();

  // 1. Authorization Check (Owner or Collaborator)
  // Fetch creator_id and check collaboration status
  const { data: quizMeta, error: metaError } = await adminClient
    .from("quizzes")
    .select("creator_id, status")
    .eq("id", quizId)
    .single();

  if (metaError || !quizMeta) {
    throw new Error("Quiz not found or error fetching quiz.");
  }

  // Permission Logic
  let isAuthorized = false;

  // Check if Owner
  if (quizMeta.creator_id === user.id) {
    isAuthorized = true;
  } else {
    // Check if Collaborator
    const { data: collaborator } = await adminClient
      .from("quiz_collaborators")
      .select("role")
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .single();

    if (collaborator) {
      // Only 'editor' role (or owner, already checked) can save
      if (collaborator.role === "editor") {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    throw new Error("You do not have permission to edit this quiz.");
  }

  const currentQuiz = quizMeta; // Re-use fetched data

  // 2. Update Quiz Metadata
  // Use adminClient for updates to bypass RLS (since we verified permission above)
  const { error: quizError } = await adminClient
    .from("quizzes")
    .update({
      title: quizData.title,
      description: quizData.description,
      cover_image: quizData.cover_image,
      visibility: quizData.visibility,
      tags: quizData.tags,
      status: quizData.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quizId);

  if (quizError) throw quizError;

  // 3. Notify if becoming published
  if (
    quizData.status === "published" &&
    currentQuiz?.status !== "published" &&
    quizData.visibility === "public"
  ) {
    // Fire and forget notifications
    notifyQuizPublished(quizId).catch(console.error);
    notifyOwnerOfUserPublish(quizId).catch(console.error);
  }

  // 4. Delete removed questions
  if (deletedQuestionIds.length > 0) {
    await adminClient
      .from("games")
      .update({ current_question_id: null })
      .in("current_question_id", deletedQuestionIds);

    const { error: deleteError } = await adminClient
      .from("questions")
      .delete()
      .in("id", deletedQuestionIds);

    if (deleteError) throw deleteError;
  }

  // 5. Upsert Questions & Answers
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const upsertPayload: any = {
      quiz_id: quizId,
      title: q.title,
      time_limit: q.time_limit,
      order_index: i,
      question_type: q.question_type,
      points_multiplier: q.points_multiplier || 1,
      media_url: q.media_url,
      answer_format: q.answer_format ?? "choice",
    };
    if (q.id) upsertPayload.id = q.id;

    const { data: qData, error: qError } = await adminClient
      .from("questions")
      .upsert(upsertPayload)
      .select()
      .single();

    if (qError) throw qError;

    if (qData) {
      // Sync Answers
      // Delete removed answers
      if (q.id) {
        const { data: dbAnswers } = await adminClient
          .from("answers")
          .select("id")
          .eq("question_id", q.id);

        if (dbAnswers) {
          const currentAnswerIds = q.answers
            .map((a) => a.id)
            .filter(Boolean) as string[];
          const idsToDelete = dbAnswers
            .filter((dbA) => !currentAnswerIds.includes(dbA.id))
            .map((dbA) => dbA.id);

          if (idsToDelete.length > 0) {
            await adminClient.from("answers").delete().in("id", idsToDelete);
          }
        }
      }

      // Upsert answers
      for (let j = 0; j < q.answers.length; j++) {
        const a = q.answers[j];
        const answerPayload: any = {
          question_id: qData.id,
          text: a.text,
          is_correct: a.is_correct,
          color: a.color,
          order_index: a.order_index ?? j, // Use provided order or loop index
          media_url: a.media_url,
        };
        if (a.id) answerPayload.id = a.id;

        const { error: aError } = await adminClient
          .from("answers")
          .upsert(answerPayload);

        if (aError) throw aError;
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/quiz/${quizId}`);
  return { success: true };
}
