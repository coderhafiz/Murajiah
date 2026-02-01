import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, User, Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function ReportDetailsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  // Await params first (Next.js 15 requirement, good practice generally now)
  const { gameId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8">Please login to view report details.</div>;
  }

  // Fetch Game Details (Verify ownership)
  const { data: game, error } = await supabase
    .from("games")
    .select("*, quiz:quizzes(title, questions(*))")
    .eq("id", gameId)
    .eq("host_id", user.id)
    .single();

  if (error || !game) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">Report Not Found</h1>
        <p className="text-muted-foreground">
          This report does not exist or you do not have permission to view it.
        </p>
        <Link href="/dashboard/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>
    );
  }

  // Fetch Players and their scores
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false });

  // Assume questions count from quiz relation
  // Note: if quiz was deleted, this might be null. We should handle that.
  // Ideally, we snapshot questions into game? For now, we rely on relation.
  // Actually, wait, if quiz changes later, report changes?
  // Current architecture relies on live quiz link. If quiz deleted, we might lose title.
  // But let's assuming standard happy path.

  const totalQuestions = game.quiz?.questions?.length || 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/dashboard/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            {game.quiz?.title || "Untitled Quiz"}
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md border">
              Game Report
            </span>
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground text-sm mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(game.created_at).toLocaleDateString()} at{" "}
              {new Date(game.created_at).toLocaleTimeString()}
            </span>
            <span>•</span>
            <span>{players?.length || 0} Players</span>
            <span>•</span>
            <span>{totalQuestions} Questions</span>
          </div>
        </div>
      </div>

      {/* Podium / Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            Winner
          </p>
          <p className="text-2xl font-black text-foreground mt-1">
            {players?.[0]?.nickname || "No Players"}
          </p>
          <p className="text-sm text-muted-foreground">
            {players?.[0]?.score || 0} points
          </p>
        </div>

        <div className="bg-card p-6 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <User className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            Total Players
          </p>
          <p className="text-2xl font-black text-foreground mt-1">
            {players?.length || 0}
          </p>
        </div>

        <div className="bg-card p-6 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            Average Score
          </p>
          <p className="text-2xl font-black text-foreground mt-1">
            {players && players.length > 0
              ? Math.round(
                  players.reduce((acc, p) => acc + p.score, 0) / players.length,
                )
              : 0}
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Leaderboard</h2>
        </div>
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {players?.map((player, index) => (
              <tr
                key={player.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                      index === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : index === 1
                          ? "bg-gray-100 text-gray-700"
                          : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-foreground">
                    {player.nickname}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-foreground">
                  {player.score.toLocaleString()}
                </td>
              </tr>
            ))}
            {(!players || players.length === 0) && (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-muted-foreground"
                >
                  No players data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
