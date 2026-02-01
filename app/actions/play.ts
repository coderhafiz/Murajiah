"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // Ignore
}

export async function submitAnswer(
  playerId: string,
  gameId: string,
  questionId: string,
  answerPayload: string, // Can be simple color string or JSON {type, value}
  timeElapsed: number = 0, // NEW: Time in seconds since question started display
) {
  let supabase: any = await createClient();

  // Check if Host (Bypass RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (serviceKey === anonKey) {
      console.error(
        "CRITICAL: Service Key matches Anon Key! You pasted the wrong key into .env.local.",
      );
      return {
        success: false,
        error:
          "Server Configuration Error: Service Key is same as Anon Key (Wrong Secret)",
      };
    }

    if (!serviceKey) {
      console.error(
        "CRITICAL: Service Key is missing! Cannot verify host bypass.",
      );
      return {
        success: false,
        error: "Missing Server Configuration (Service Key)",
      };
    }

    // Use Admin Client to check ownership (Bypasses RLS on 'games' table too)
    const adminClient = createAdminClient();

    const { data: game } = await adminClient
      .from("games")
      .select("host_id")
      .eq("id", gameId)
      .single();

    if (game && game.host_id === user.id) {
      // User is the Game Host. Use Admin Client to allow inserting answers for virtual players.
      supabase = adminClient;
    }
  }

  // Fetch question and its answers to verify
  const { data: question } = await supabase
    .from("questions")
    .select("*, answers(*)")
    .eq("id", questionId)
    .single();

  if (!question) throw new Error("Question not found");

  let isCorrect = false;
  let score = 0;
  let answerId = null; // For simple choice mapping
  let submissionData = null; // For complex types
  let answerText = null; // For type_answer

  // Parse Payload
  let parsedType = "quiz";
  let parsedValue: any = answerPayload;

  try {
    const json = JSON.parse(answerPayload);
    if (json && typeof json === "object" && json.type) {
      parsedType = json.type;
      parsedValue = json.value;
    }
  } catch (e) {
    // legacy/simple string
    parsedType = "quiz";
  }

  // --- GRADING LOGIC ---

  if (
    parsedType === "type_answer" ||
    (parsedType === "voice" && question.answer_format === "text")
  ) {
    // Logic: Compare text (case insensitive)
    answerText = parsedValue;
    // Find matching answer in DB
    const match = question.answers.find(
      (a: any) =>
        a.text.trim().toLowerCase() ===
        String(parsedValue).trim().toLowerCase(),
    );
    if (match) {
      isCorrect = true;
      answerId = match.id; // Critical: Link to the answer ID so stats work
    }
  } else if (parsedType === "puzzle") {
    // Logic: Exact order match
    // parsedValue should be array of Answer IDs
    submissionData = parsedValue;

    const submittedIds = Array.isArray(parsedValue) ? parsedValue : [];
    // Expected order:
    const sortedAnswers = [...question.answers].sort(
      (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0),
    );

    console.log("DEBUG PUZZLE VALIDATION:", {
      submitted: submittedIds,
      expected: sortedAnswers.map((a: any) => ({
        id: a.id,
        order: a.order_index,
        text: a.text,
      })),
    });

    const expectedIds = sortedAnswers.map((a: any) => a.id);

    if (
      submittedIds.length === expectedIds.length &&
      submittedIds.every((id, i) => id === expectedIds[i])
    ) {
      isCorrect = true;
    }
  } else if (parsedType === "poll") {
    // Logic: Always "answered" but not "correct" in the sense of points usually,
    // but typically Polls give no points or participation points.
    // Let's match the answer ID if possible for stats.
    const match = question.answers.find(
      (a: any) => a.color === parsedValue || a.id === parsedValue,
    );
    if (match) {
      answerId = match.id;
    }
    isCorrect = true; // Mark as processed/valid participation
    score = 0; // Usually 0 points for polls
  } else {
    // Standard Quiz / True False / Voice (Choice)
    // parsedValue is likely 'color' or 'id'
    const match = question.answers.find(
      (a: any) => a.color === parsedValue || a.id === parsedValue,
    );
    if (match) {
      answerId = match.id;
      isCorrect = match.is_correct;
    }
  }

  // Determine Score with Time Variable
  if (isCorrect && parsedType !== "poll") {
    const basePoints = 1000 * (question.points_multiplier || 1);

    // Time Factor Calculation:
    // Score = Base * (1 - (Elapsed / Limit) / 2)
    // Instant (0s) = 100%
    // End (Limit) = 50%
    const limit = question.time_limit || 20;
    // Clamp elapsed to be between 0 and limit
    const safeElapsed = Math.min(Math.max(timeElapsed, 0), limit);
    const ratio = safeElapsed / limit;
    const timeFactor = 1 - ratio / 2;

    score = Math.round(basePoints * timeFactor);
  }

  // Record Answer
  const { error } = await supabase.from("player_answers").insert({
    player_id: playerId,
    game_id: gameId,
    question_id: questionId,
    answer_id: answerId,
    is_correct: isCorrect,
    score_awarded: score,
    answer_text: answerText,
    submission_data: submissionData ? JSON.stringify(submissionData) : null,
  });

  if (error) {
    console.error("Submit error", error);
    return { success: false, error: JSON.stringify(error) };
  }

  // Update Player Score
  if (score > 0) {
    // Safe atomic increment via simple read-update for now (or RPC if available)
    const { data: p } = await supabase
      .from("players")
      .select("score")
      .eq("id", playerId)
      .single();

    if (p) {
      await supabase
        .from("players")
        .update({ score: p.score + score })
        .eq("id", playerId);
    }
  }

  return { success: true, isCorrect };
}

export async function getRoundAnswers(questionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("player_answers")
    .select("answer_id, player_id, is_correct")
    .eq("question_id", questionId);

  if (error) {
    console.error("Failed to fetch round answers:", error);
    return [];
  }
  return data;
}

export async function getAnswerCount(questionId: string) {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("player_answers")
    .select("*", { count: "exact", head: true })
    .eq("question_id", questionId);

  if (error) {
    console.error("Failed to fetch answer count:", error);
    return 0;
  }
  return count || 0;
}

export async function getFullGameData(gameId: string) {
  const supabase = createAdminClient();

  // 1. Get Quiz ID
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("quiz_id")
    .eq("id", gameId)
    .single();

  if (gameError || !game) return null;

  // 2. Fetch all questions and answers
  const { data: questions } = await supabase
    .from("questions")
    .select("*, answers(*)")
    .eq("quiz_id", game.quiz_id)
    .order("order_index", { ascending: true });

  return questions;
}

export async function resetRound(gameId: string, questionId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("player_answers")
    .delete()
    .eq("game_id", gameId)
    .eq("question_id", questionId);

  if (error) {
    console.error("Failed to reset round:", error);
    return { success: false, error };
  }

  return { success: true };
}
