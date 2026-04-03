import { createClient } from "@/utils/supabase/server";
import { QuizGrid } from "./QuizGrid";
import { FadeIn } from "@/components/dashboard/FadeIn";

interface QuizListWrapperProps {
  currentUserId: string;
  selectedFolderId: string | null;
  filter: string;
  searchQuery: string;
}

export default async function QuizListWrapper({
  currentUserId,
  selectedFolderId,
  filter,
  searchQuery,
}: QuizListWrapperProps) {
  const supabase = await createClient();

  // Fetch data in parallel
  const [ownedRes, sharedRes, likedRes] = await Promise.all([
    supabase
      .from("quizzes")
      .select("*")
      .eq("creator_id", currentUserId)
      .order("created_at", { ascending: false }),
    supabase
      .from("quizzes")
      .select("*, quiz_collaborators!inner(user_id)")
      .eq("quiz_collaborators.user_id", currentUserId),
    supabase.from("quiz_likes").select("quiz_id").eq("user_id", currentUserId),
  ]);

  const ownedQuizzes = ownedRes.data || [];
  const sharedQuizzes = (sharedRes.data || []).map((q) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { quiz_collaborators: _, ...rest } = q as unknown as { quiz_collaborators: unknown; id: string; title: string };
    return rest;
  });

  const likedQuizIds = new Set((likedRes?.data || []).map((l: { quiz_id: string }) => l.quiz_id));

  // Merge and apply initial favors
  const allQuizzes = [...ownedQuizzes, ...sharedQuizzes].map((q) => ({
    ...q,
    is_favorite: likedQuizIds.has(q.id),
  }));

  const foldersRes = await supabase.from("folders").select("id, is_hidden").eq("user_id", currentUserId);
  const hiddenFolderIds = new Set((foldersRes.data || []).filter(f => f.is_hidden).map(f => f.id));

  // Filtering (Server side for speed)
  const filteredQuizzes = allQuizzes.filter((quiz) => {
    // 1. Folder Filter
    if (selectedFolderId === "unorganized") {
      if (quiz.folder_id) return false;
    } else if (selectedFolderId !== null) {
      if (quiz.folder_id !== selectedFolderId) return false;
    } else {
      // "All Quizzes" view: filter out quizzes from hidden folders
      if (quiz.folder_id && hiddenFolderIds.has(quiz.folder_id)) return false;
    }

    // 2. Tab Filter
    let matchesFilter = true;
    if (filter === "favorites") {
      matchesFilter = !!quiz.is_favorite;
    } else if (filter === "shared") {
      matchesFilter = quiz.creator_id !== currentUserId;
    } else if (filter !== "all") {
      matchesFilter = quiz.status === filter;
    }

    // 3. Search Filter
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quiz.description &&
        quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  }).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <FadeIn>
      <QuizGrid
        quizzes={filteredQuizzes}
        searchQuery={searchQuery}
        filter={filter}
      />
    </FadeIn>
  );
}
