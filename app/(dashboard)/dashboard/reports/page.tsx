import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { ClearReportsButton } from "@/components/reports/ClearReportsButton";
import Link from "next/link";

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8">Please login to view reports.</div>;
  }

  const { data: previousGames } = await supabase
    .from("games")
    .select("*, quiz:quizzes(title)")
    .eq("host_id", user.id)
    .eq("status", "finished")
    .order("ended_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        {previousGames && previousGames.length > 0 && <ClearReportsButton />}
      </div>

      {previousGames && previousGames.length > 0 ? (
        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quiz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Participants
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {previousGames.map((game) => (
                <tr key={game.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {game.quiz?.title || "Untitled Quiz"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">
                      {new Date(game.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">-</div>{" "}
                    {/* Need to count players */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/dashboard/reports/${game.id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl">
          <p className="text-muted-foreground">No finished games yet.</p>
        </div>
      )}
    </div>
  );
}
