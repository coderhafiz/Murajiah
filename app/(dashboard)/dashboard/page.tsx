import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import QuizLibraryShell from "@/components/dashboard/QuizLibraryShell";
import FolderSidebarWrapper from "@/components/dashboard/FolderSidebarWrapper";
import QuizListWrapper from "@/components/dashboard/QuizListWrapper";
import { getUserAccessContext } from "@/lib/access";
import { FolderSidebarSkeleton, QuizGridSkeleton } from "@/components/dashboard/DashboardSkeletons";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    q?: string;
    folder?: string;
  }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { filter = "all", q = "", folder = null } = await searchParams;

  const [access, foldersRes, countsRes] = await Promise.all([
    getUserAccessContext(),
    supabase.from("folders").select("id, name, is_hidden"),
    Promise.all([
      supabase.from("quizzes").select("*", { count: "exact", head: true }).eq("creator_id", user.id),
      supabase.from("quiz_likes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("quiz_collaborators").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("quizzes").select("*", { count: "exact", head: true }).eq("creator_id", user.id).eq("status", "published"),
      supabase.from("quizzes").select("*", { count: "exact", head: true }).eq("creator_id", user.id).eq("status", "draft"),
    ])
  ]);

  const isPremium = access.isPremium;
  const folders = foldersRes.data || [];
  const [allCount, favCount, sharedCount, pubCount, draftCount] = countsRes.map(res => res.count || 0);

  return (
    <div className="space-y-6">
      <QuizLibraryShell
        isPremium={isPremium}
        folders={folders}
        counts={{
          all: allCount,
          favorites: favCount,
          shared: sharedCount,
          published: pubCount,
          draft: draftCount,
        }}
        foldersSidebar={
          <Suspense fallback={<FolderSidebarSkeleton />}>
            <FolderSidebarWrapper selectedFolderId={folder} />
          </Suspense>
        }
      >
        <Suspense key={`${filter}-${q}-${folder}`} fallback={<QuizGridSkeleton />}>
          <QuizListWrapper
            currentUserId={user.id}
            selectedFolderId={folder}
            filter={filter}
            searchQuery={q}
          />
        </Suspense>
      </QuizLibraryShell>
    </div>
  );
}
