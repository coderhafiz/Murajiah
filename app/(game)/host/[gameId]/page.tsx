import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import HostGameController from "./HostGameController";

export default async function HostGamePage({
  params,
}: {
  params: { gameId: string };
}) {
  const supabase = createClient();
  const { gameId } = await params;

  // Fetch game and quiz
  const { data: game, error } = await (
    await supabase
  )
    .from("games")
    .select(
      `
        *,
        quiz:quizzes(*)
    `,
    )
    .eq("id", gameId)
    .single();

  if (error || !game) {
    console.error("HostPage Error Raw:", error);
    console.error(
      "HostPage Error Message:",
      (error as any)?.message || "No message",
    );
    console.error("Game Data:", game);
    return (
      <div className="p-8 text-center text-white">
        <h1 className="text-2xl font-bold mb-4">Game not found</h1>
        {error && (
          <pre className="text-red-400 bg-black/50 p-4 rounded text-left overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  // Fetch questions for this quiz separately (to allow sorting)
  const { data: questions } = await (await supabase)
    .from("questions")
    .select("*, answers(*)")
    .eq("quiz_id", game.quiz_id)
    .order("order_index");

  // Sort answers manually (server-side consistency)
  if (questions) {
    questions.forEach((q) => {
      if (q.answers && Array.isArray(q.answers)) {
        q.answers.sort(
          (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0),
        );
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <HostGameController
        game={game}
        quiz={game.quiz}
        questions={questions || []}
      />
    </div>
  );
}
