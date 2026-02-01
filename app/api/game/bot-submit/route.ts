import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Use Service Role to bypass RLS for bot submissions
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { playerId, gameId, questionId, answerPayload } =
      await request.json();

    // 1. Verify it's a preview game
    const { data: game } = await supabaseAdmin
      .from("games")
      .select("is_preview")
      .eq("id", gameId)
      .single();

    if (!game?.is_preview) {
      return new NextResponse("Not a preview game", { status: 403 });
    }

    // 2. Fetch question details for grading
    const { data: question } = await supabaseAdmin
      .from("questions")
      .select("*, answers(*)")
      .eq("id", questionId)
      .single();

    if (!question) {
      return NextResponse.json({ success: false, error: "Question not found" });
    }

    // 3. Grading Logic (Simplified copy of actions/play.ts)
    let isCorrect = false;
    let score = 0;
    let answerId: string | null = null;
    let submissionData: unknown = null;
    let answerText: string | null = null;

    let parsedType = "quiz";
    let parsedValue: unknown = answerPayload;

    try {
      const json = JSON.parse(answerPayload);
      if (json && typeof json === "object" && json.type) {
        parsedType = json.type;
        parsedValue = json.value;
      }
    } catch (e) {
      parsedType = "quiz";
    }

    // Define Answer interface locally or import it if shared
    interface StartAnswer {
      id: string;
      text: string;
      is_correct: boolean;
      color?: string;
      order_index?: number;
    }

    const answers = (question.answers || []) as StartAnswer[];

    if (parsedType === "type_answer") {
      answerText = String(parsedValue);
      const match = answers.find(
        (a) =>
          a.text.trim().toLowerCase() ===
          String(parsedValue).trim().toLowerCase(),
      );
      if (match) isCorrect = true;
    } else if (parsedType === "puzzle") {
      // Puzzle logic
      submissionData = parsedValue;
      const submittedIds = Array.isArray(parsedValue)
        ? (parsedValue as string[])
        : [];
      const expectedIds = [...answers]
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map((a) => a.id);

      if (
        submittedIds.length === expectedIds.length &&
        submittedIds.every((id, i) => id === expectedIds[i])
      ) {
        isCorrect = true;
      }
    } else if (parsedType === "poll") {
      const match = answers.find(
        (a) => a.color === parsedValue || a.id === parsedValue,
      );
      if (match) answerId = match.id;
      isCorrect = true;
    } else {
      // Standard
      const match = answers.find((a) => a.color === parsedValue);
      if (match) {
        answerId = match.id;
        isCorrect = match.is_correct;
      }
    }

    if (isCorrect && parsedType !== "poll") {
      score = 1000 * (question.points_multiplier || 1);
    }

    // 4. Insert Answer as Admin
    const { error } = await supabaseAdmin.from("player_answers").insert({
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
      console.error("Bot submit error:", error);
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, isCorrect });
  } catch (err: unknown) {
    console.error("Bot submit handler error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
