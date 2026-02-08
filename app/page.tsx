import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/utils/supabase/server";
import { searchQuizzes, getPopularTags } from "@/app/actions/search";
import { getHomepageContent } from "@/app/actions/homepage";
import { QuizCard } from "@/components/landing/QuizCard";
import { SearchBar } from "@/components/landing/SearchBar";
import { CategoryBar } from "@/components/landing/CategoryBar";
import { MurajiahBanner } from "@/components/landing/MurajiahBanner";
import { Sparkles, PenTool } from "lucide-react";
import { MobileMenu } from "@/components/landing/MobileMenu";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; lang?: string }>;
}) {
  const { q, tag, lang } = await searchParams;
  const supabase = await createClient();
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("Auth error:", error);
  }

  const showSearchResults = !!q || !!tag || !!lang;

  // Parallel data fetching
  const [tags, quizResult, homepageSections, profileResult] = await Promise.all(
    [
      getPopularTags(),
      showSearchResults
        ? searchQuizzes(q || "", tag, lang)
        : Promise.resolve({ data: [], error: null }),
      !showSearchResults ? getHomepageContent() : Promise.resolve([]),
      user
        ? supabase
            .from("profiles")
            .select("full_name, avatar_url, email")
            .eq("id", user.id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ],
  );

  const quizzes = quizResult.data || []; // For search results
  const profile = profileResult.data;
  const sectionTitle = showSearchResults
    ? `Results for "${q || tag || "filters"}"`
    : "Recently published";

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-background text-foreground font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-sm border-b border-border">
        <div className="container mx-auto max-w-7xl flex h-16 items-center gap-4 py-2 px-4 md:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center mr-4">
            <span className="text-2xl font-black text-primary tracking-tight drop-shadow-sm">
              Murajiah
            </span>
          </Link>

          {/* Search Bar - Hidden on mobile, shown on desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-auto px-4">
            <SearchBar />
          </div>

          <div className="flex-1 md:flex-none flex justify-end items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu */}
            <MobileMenu user={user} profile={profile} />

            {/* Join Game Input (Mini) */}
            <div className="hidden sm:block">
              <Link href="/join">
                <Button
                  size="lg"
                  className="font-black bg-card text-primary border-2 border-border hover:bg-accent hover:text-accent-foreground shadow-sm rounded-md px-6 hidden sm:flex h-11"
                >
                  Enter PIN
                </Button>
              </Link>
            </div>

            {user ? (
              <>
                <Link href="/dashboard" className="hidden sm:block">
                  <Button variant="ghost" className="font-bold">
                    My Library
                  </Button>
                </Link>
                <Link href="/account">
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm cursor-pointer hover:opacity-80 transition hover:scale-105">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {user.email?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <Button
                  size="lg"
                  className="font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-md px-6 h-11"
                >
                  Log in
                </Button>
              </Link>
            )}
          </div>
        </div>
        {/* Mobile Search Bar */}
        <div className="md:hidden container mx-auto max-w-7xl py-2 pb-3 bg-background border-b border-border px-4">
          <SearchBar />
        </div>
      </header>

      {/* CATEGORY BAR */}
      <div className="hidden md:block">
        <CategoryBar tags={tags} />
      </div>

      {/* BRANDING BANNER */}
      {/* BRANDING BANNER */}
      <MurajiahBanner user={user} />

      <main className="flex-1 container mx-auto max-w-7xl py-8 space-y-10 px-4 md:px-6">
        {/* HERO / ACTION CARDS (Only show if NOT searching) */}
        {!showSearchResults && (
          <div className="hidden md:grid md:grid-cols-2 gap-6">
            {/* Manual Create */}
            <div className="rounded-3xl bg-linear-to-br from-[#dc2626] to-[#f59e0b] p-5 md:p-6 text-white relative overflow-hidden shadow-xl group transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="relative z-10 space-y-2">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                  <PenTool className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight tracking-tight">
                    Create a quiz
                  </h2>
                  <p className="text-purple-100 font-medium text-base max-w-sm opacity-90">
                    Build engaging quizzes in minutes. Play for free with up to
                    300 participants.
                  </p>
                </div>
                <Link
                  href={
                    user
                      ? "/dashboard/create"
                      : "/signup-gateway?next=/dashboard/create"
                  }
                  className="inline-block"
                >
                  <Button className="bg-white text-[#b91c1c] hover:bg-white/90 font-black border-0 mt-1 h-10 px-6 rounded-lg shadow-lg text-base">
                    Quiz editor
                  </Button>
                </Link>
              </div>
              <div className="absolute right-[-30px] bottom-[-30px] opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                <PenTool className="h-40 w-40" />
              </div>
            </div>

            {/* AI Generate */}
            <div className="rounded-3xl bg-linear-to-br from-[#2563eb] to-[#06b6d4] p-5 md:p-6 text-white relative overflow-hidden shadow-xl group transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="relative z-10 space-y-2">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight tracking-tight">
                    A.I. Generator
                  </h2>
                  <p className="text-purple-100 font-medium text-base max-w-sm opacity-90">
                    Generate a quiz from any subject, PDF, or document
                    instantly.
                  </p>
                </div>
                <Link
                  href={
                    user
                      ? "/dashboard/create?mode=ai"
                      : "/signup-gateway?next=/dashboard/create?mode=ai"
                  }
                  className="inline-block"
                >
                  <Button className="bg-white text-[#1d4ed8] hover:bg-white/90 font-black border-0 mt-1 h-10 px-6 rounded-lg shadow-lg text-base">
                    Quiz generator
                  </Button>
                </Link>
              </div>
              <div className="absolute right-[-30px] bottom-[-30px] opacity-10 transform -rotate-12 group-hover:scale-110 transition-transform duration-500">
                <Sparkles className="h-40 w-40" />
              </div>
            </div>
          </div>
        )}

        {/* QUIZ GRID */}
        {showSearchResults ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4 border-border">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                {sectionTitle}
              </h2>
            </div>

            {quizzes.length > 0 ? (
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-visible md:pb-0 md:gap-6">
                {quizzes.map((quiz) => (
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {homepageSections.map((section: any) =>
              section.quizzes.length > 0 ? (
                <div key={section.id} className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-4 border-border">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 xl:grid-cols-4 md:overflow-visible md:pb-0">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {section.quizzes.map((quiz: any) => (
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

      <footer className="py-10 bg-background border-t border-border mt-auto">
        <div className="container mx-auto max-w-7xl text-center text-sm font-medium text-muted-foreground px-4">
          <p className="mb-2">
            &copy; {new Date().getFullYear()} Murajiah. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
