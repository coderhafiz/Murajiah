import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/utils/supabase/server";
import {
  searchQuizzes,
  getPopularTags,
  getTrendingQuizzes,
} from "@/app/actions/search";
import { QuizCard } from "@/components/landing/QuizCard";
import { SearchBar } from "@/components/landing/SearchBar";
import { CategoryBar } from "@/components/landing/CategoryBar";
import { MurajiahBanner } from "@/components/landing/MurajiahBanner";
import { Sparkles, PenTool } from "lucide-react";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; lang?: string }>;
}) {
  const { q, tag, lang } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Parallel data fetching
  const [tags, quizResult, trending] = await Promise.all([
    getPopularTags(),
    searchQuizzes(q || "", tag, lang),
    getTrendingQuizzes(),
  ]);

  const showSearchResults = !!q || !!tag || !!lang;
  const quizzes = showSearchResults ? quizResult.data : trending;
  const sectionTitle = showSearchResults
    ? `Results for "${q || tag || "filters"}"`
    : "Recently published";

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-background text-foreground font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm border-b border-border">
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
              <Link href="/dashboard">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm cursor-pointer hover:opacity-80 transition hover:scale-105">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
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
      <MurajiahBanner />

      <main className="flex-1 container mx-auto max-w-7xl py-8 space-y-10 px-4 md:px-6">
        {/* HERO / ACTION CARDS (Only show if NOT searching) */}
        {!showSearchResults && (
          <div className="hidden md:grid md:grid-cols-2 gap-6">
            {/* Manual Create */}
            <div className="rounded-3xl bg-[#0F4C5C] p-6 md:p-8 text-white relative overflow-hidden shadow-xl group transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="relative z-10 space-y-4">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                  <PenTool className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight tracking-tight">
                    Create a quiz
                  </h2>
                  <p className="text-blue-50 font-medium text-base max-w-sm opacity-90">
                    Build engaging quizzes in minutes. Play for free with up to
                    300 participants.
                  </p>
                </div>
                <Link href="/dashboard/create" className="inline-block">
                  <Button className="bg-white text-[#0F4C5C] hover:bg-white/90 font-black border-0 mt-1 h-10 px-6 rounded-lg shadow-lg text-base">
                    Quiz editor
                  </Button>
                </Link>
              </div>
              <div className="absolute right-[-30px] bottom-[-30px] opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                <PenTool className="h-40 w-40" />
              </div>
            </div>

            {/* AI Generate */}
            <div className="rounded-3xl bg-[#136F63] p-6 md:p-8 text-white relative overflow-hidden shadow-xl group transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="relative z-10 space-y-4">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight tracking-tight">
                    A.I. Generator
                  </h2>
                  <p className="text-emerald-50 font-medium text-base max-w-sm opacity-90">
                    Generate a quiz from any subject, PDF, or document
                    instantly.
                  </p>
                </div>
                <Link href="/dashboard/create?mode=ai" className="inline-block">
                  <Button className="bg-white text-[#136F63] hover:bg-white/90 font-black border-0 mt-1 h-10 px-6 rounded-lg shadow-lg text-base">
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
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-border">
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
              {sectionTitle}
            </h2>
          </div>

          {quizzes && quizzes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  id={quiz.id}
                  title={quiz.title}
                  description={quiz.description}
                  coverImage={quiz.cover_image}
                  authorName={quiz.author_name || "Unknown"}
                  authorAvatar={quiz.author_avatar}
                  playCount={quiz.play_count}
                  likeCount={quiz.like_count}
                />
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
              {showSearchResults && (
                <Link href="/">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full border-2 font-bold px-8 mt-2"
                  >
                    Clear Filters
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
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
