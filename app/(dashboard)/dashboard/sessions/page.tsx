import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ActiveSessions from "@/components/dashboard/ActiveSessions";
import { FadeIn } from "@/components/dashboard/FadeIn";

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/sessions");
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
    <FadeIn>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Active Sessions</h1>
        <ActiveSessions initialGames={activeGames || []} />
        {(!activeGames || activeGames.length === 0) && (
          <div className="text-center py-10 text-muted-foreground">
            No active sessions found.
          </div>
        )}
      </div>
    </FadeIn>
  );
}
