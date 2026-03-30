import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import {
  searchQuizzes,
  type QuizResult,
} from "@/app/actions/search";
import { getHomepageContent } from "@/app/actions/homepage";
import { QuizCard } from "@/components/landing/QuizCard";
import { HomeActionCards } from "@/components/landing/HomeActionCards";

interface HomepageSection {
  id: string;
  title: string;
  description: string;
  quizzes: QuizResult[];
}

interface ExploreContentWrapperProps {
  q?: string;
  tag?: string;
  lang?: string;
}

export default async function ExploreContentWrapper({ q, tag, lang }: ExploreContentWrapperProps) {
  const supabase = await createClient();
  const showSearchResults = !!q || !!tag || !!lang;

  let user = null;
  let quizzes: QuizResult[] = [];
  let homepageSections: HomepageSection[] = [];
  let likedQuizIds = new Set<string>();

  try {
    const { data: authData } = await supabase.auth.getUser();
    user = authData.user;

    // Parallel data fetching
    const [
      quizResult,
      homepageSectionsResult,
      likesResult,
    ] = await Promise.all([
      showSearchResults
        ? searchQuizzes(q || "", tag, lang)
        : Promise.resolve({ data: [], error: null }),
      !showSearchResults ? getHomepageContent() : Promise.resolve([]),
      user
        ? supabase.from("quiz_likes").select("quiz_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);

    quizzes = quizResult?.data || [];
    homepageSections = (homepageSectionsResult || []) as HomepageSection[];
    likedQuizIds = new Set(
      likesResult.data?.map((l: { quiz_id: string }) => l.quiz_id) || [],
    );
  } catch (error) {
    console.error("Data fetching failed in ExploreContentWrapper:", error);
  }

  const sectionTitle = showSearchResults
    ? `Results for "${q || tag || "filters"}"`
    : "Recently published";

  return (
    <main className="flex-1 container mx-auto max-w-[1400px] py-8 space-y-10 px-4 md:px-6">
      {/* HERO / ACTION CARDS (Only show if NOT searching) */}
      {!showSearchResults && <HomeActionCards user={user} />}

      {/* QUIZ GRID */}
      {showSearchResults ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-border">
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
              {sectionTitle}
            </h2>
          </div>

          {quizzes.length > 0 ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 md:overflow-visible md:pb-0 md:gap-6">
              {quizzes.map((quiz, index) => (
                <div
                  key={quiz.id}
                  className="w-[45%] sm:w-[40%] shrink-0 snap-center md:w-auto md:shrink md:snap-align-none"
                >
                  <QuizCard
                    id={quiz.id}
                    title={quiz.title}
                    description={quiz.description || ""}
                    coverImage={quiz.cover_image}
                    authorName={quiz.author_name || "Unknown"}
                    authorAvatar={quiz.author_avatar}
                    playCount={quiz.play_count || 0}
                    likeCount={quiz.like_count || 0}
                    isLiked={likedQuizIds.has(quiz.id)}
                    index={index}
                    customHref={
                      user
                        ? undefined
                        : `/signup-gateway?next=/quiz/${quiz.id}`
                    }
                  />
                </div>
              ))}
            </div>

          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-card border-2 border-dashed border-border shadow-sm rounded-3xl">
              <div className="h-24 w-24 bg-accent rounded-full flex items-center justify-center">
                <span className="text-5xl opacity-50">🏜️</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground">
                  No quizzes found
                </h3>
                <p className="text-muted-foreground font-medium text-lg max-w-md mx-auto">
                  We couldn&apos;t find any quizzes matching your search.
                </p>
              </div>
              <Link href="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-2 font-bold px-8 mt-2"
                >
                  Clear Filters
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* HOMEPAGE SECTIONS */
        <div className="space-y-12">
          {homepageSections.map((section) =>
            section.quizzes.length > 0 ? (
              <div key={section.id} className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4 border-border">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                      {section.title}
                    </h2>
                  </div>
                </div>

                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-6 xl:grid-cols-8 md:overflow-visible md:pb-0">
                  {section.quizzes.map((quiz, index) => (
                    <div
                      key={quiz.id}
                      className="w-[40%] shrink-0 snap-center md:w-auto md:shrink md:snap-align-none"
                    >
                      <QuizCard
                        id={quiz.id}
                        title={quiz.title}
                        description={quiz.description}
                        coverImage={quiz.cover_image}
                        authorName={quiz.author_name || "Unknown"}
                        authorAvatar={quiz.author_avatar}
                        playCount={quiz.play_count}
                        likeCount={quiz.like_count}
                        isLiked={likedQuizIds.has(quiz.id)}
                        index={index}
                        hideDescription={true}
                        variant="poster"
                        customHref={
                          user
                            ? undefined
                            : `/signup-gateway?next=/quiz/${quiz.id}`
                        }
                      />
                    </div>
                  ))}
                </div>

              </div>
            ) : null,
          )}
          {homepageSections.length === 0 && (
            <div className="text-center py-10 opacity-50">
              Start adding sections in Admin Dashboard
            </div>
          )}
        </div>
      )}
    </main>
  );
}
