import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ActiveSessions from "@/components/dashboard/ActiveSessions";

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch active games
  const { data: activeGames } = await supabase
    .from("games")
    .select(
      `
      *,
      quiz:quizzes (
        title
      )
    `,
    )
    .eq("host_id", user.id)
    .in("status", ["waiting", "active"])
    .or("is_preview.eq.false,is_preview.is.null")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Active Sessions</h1>
      <ActiveSessions initialGames={activeGames || []} />
      {(!activeGames || activeGames.length === 0) && (
        <div className="text-center py-10 text-muted-foreground">
          No active sessions found.
        </div>
      )}
    </div>
  );
}
