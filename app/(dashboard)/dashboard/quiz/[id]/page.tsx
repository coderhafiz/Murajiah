import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import QuizEditor from "./QuizEditor";

// I'll create QuizEditor client component in the same folder or components/game

export default async function QuizDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parallelize data fetching
  const [quizResponse, questionsResponse, tagsResponse, collaboratorResponse] =
    await Promise.all([
      // 1. Fetch Quiz
      supabase.from("quizzes").select("*").eq("id", id).single(),

      // 2. Fetch Questions & Answers
      supabase
        .from("questions")
        .select(`*, answers (*)`)
        .eq("quiz_id", id)
        .order("order_index", { ascending: true }),

      // 3. Fetch Tags
      supabase.from("quiz_tags").select("tag").eq("quiz_id", id),

      // 4. Fetch Collaborator Status (for permission check)
      supabase
        .from("quiz_collaborators")
        .select("role")
        .eq("quiz_id", id)
        .eq("user_id", user.id)
        .single(),
    ]);

  const quiz = quizResponse.data;
  const questions = questionsResponse.data;
  const tagsData = tagsResponse.data;
  const collaborator = collaboratorResponse.data;

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  // Determine Permission
  let permission: "owner" | "editor" | "viewer" | null = null;

  if (quiz.creator_id === user.id) {
    permission = "owner";
  } else if (collaborator) {
    permission = collaborator.role;
  } else if (quiz.visibility === "public") {
    permission = "viewer";
  }

  // Sort answers manually (just to be safe, as per original logic)
  if (questions) {
    questions.forEach((q) => {
      if (q.answers && Array.isArray(q.answers)) {
        q.answers.sort(
          (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0),
        );
      }
    });
  }

  const tags = tagsData?.map((t) => t.tag) || [];

  return (
    <div className="space-y-6">
      <QuizEditor
        quiz={quiz}
        initialQuestions={questions || []}
        permission={permission}
        initialVisibility={quiz.visibility || "private"}
        initialTags={tags}
      />
    </div>
  );
}
