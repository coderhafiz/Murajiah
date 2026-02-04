import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import QuizEditor from "./QuizEditor";
import { getQuizPermission } from "@/app/actions/share";
// I'll create QuizEditor client component in the same folder or components/game

export default async function QuizDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  // Await params in next 15+? No, params is props. Wait, Next 15 might require awaiting params?
  // Let's assume standard behavior for now. But strictly, yes, params is a Promise in recent versions.
  // I will check if I need to await it. Create-next-app 16.1.3 -> Next 15.
  // In Next 15, params is a Promise.
  const { id } = await params;
  const {
    data: { user },
  } = await (await supabase).auth.getUser();

  if (!user) redirect("/login");

  // Fetch quiz
  const { data: quiz, error } = await (await supabase)
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quiz) {
    return <div>Quiz not found</div>;
  }

  // Fetch Permission
  const permission = await getQuizPermission(id);

  // Fetch questions and answers
  const { data: questions } = await (
    await supabase
  )
    .from("questions")
    .select(
      `
      *,
      answers (*)
    `,
    )
    .eq("quiz_id", id)
    .eq("quiz_id", id)
    .order("order_index", { ascending: true });

  // Re-fetch with order_index if OrderIndex fails? No, stick to existing schema "order_index" if unsure.
  // Previous code used .order("order_index"). I kept it.

  // Sort answers by order_index manually to ensure consistency
  if (questions) {
    questions.forEach((q) => {
      if (q.answers && Array.isArray(q.answers)) {
        q.answers.sort(
          (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0),
        );
      }
    });
  }

  // Fetch tags
  const { data: tagsData } = await (await supabase)
    .from("quiz_tags")
    .select("tag")
    .eq("quiz_id", id);

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
