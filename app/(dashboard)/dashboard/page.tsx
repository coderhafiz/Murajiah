import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import QuizLibrary from "@/components/dashboard/QuizLibrary";
import { getFolders } from "@/app/actions/folders";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const [ownedRes, sharedRes, folders] = await Promise.all([
    supabase
      .from("quizzes")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quizzes")
      .select("*, quiz_collaborators!inner(user_id)")
      .eq("quiz_collaborators.user_id", user.id),
    getFolders(),
  ]);

  const ownedQuizzes = ownedRes.data || [];
  const sharedQuizzes = (sharedRes.data || []).map((q) => {
    // @ts-ignore
    const { quiz_collaborators, ...rest } = q;
    return rest;
  });

  const allQuizzes = [...ownedQuizzes, ...sharedQuizzes].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-6">
      <QuizLibrary
        quizzes={allQuizzes}
        folders={folders}
        currentUserId={user.id}
      />
    </div>
  );
}
