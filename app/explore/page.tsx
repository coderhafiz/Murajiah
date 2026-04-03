import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/landing/SearchBar";
import ExploreNavbarAuth from "@/components/landing/ExploreNavbarAuth";
import CategoryBarWrapper from "@/components/landing/CategoryBarWrapper";
import ExploreContentWrapper from "@/components/landing/ExploreContentWrapper";
import ExploreBannerWrapper from "@/components/landing/ExploreBannerWrapper";
import {
  ExploreNavbarAuthSkeleton,
  CategoryBarSkeleton,
  QuizGridSkeleton,
} from "@/components/landing/ExploreSkeletons";

export const metadata: Metadata = {
  title: "Explore Quizzes",
  description:
    "Browse thousands of interactive quizzes on Murajiah. Find quizzes by topic, language, or popularity.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; lang?: string }>;
}) {
  const params = await searchParams;
  const { q, tag, lang } = params;

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-background text-foreground font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-sm border-b border-border">
        <div className="container mx-auto max-w-[1400px] flex h-16 items-center gap-4 py-2 px-4 md:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center mr-4">
            <Image
              src="/murajiah-logo.png"
              alt="Murajiah Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </Link>

          {/* Search Bar - Hidden on mobile, shown on desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-auto px-4">
            <SearchBar />
          </div>

          <div className="flex-1 md:flex-none flex justify-end items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Bell, User Auth & PIN Input */}
            <Suspense fallback={<ExploreNavbarAuthSkeleton />}>
              <ExploreNavbarAuth />
            </Suspense>
          </div>
        </div>
        {/* Mobile Search Bar */}
        <div className="md:hidden container mx-auto max-w-[1400px] py-2 pb-3 bg-background border-b border-border px-4">
          <SearchBar />
        </div>
      </header>

      {/* CATEGORY BAR */}
      <Suspense fallback={<CategoryBarSkeleton />}>
        <CategoryBarWrapper />
      </Suspense>

      {/* BRANDING BANNER */}
      <Suspense fallback={null}>
        <ExploreBannerWrapper />
      </Suspense>

      <Suspense fallback={<div className="container mx-auto max-w-[1400px] py-8 px-4 md:px-6 space-y-12"><QuizGridSkeleton /></div>}>
        <ExploreContentWrapper q={q} tag={tag} lang={lang} />
      </Suspense>

      <footer className="py-10 bg-background border-t border-border mt-auto">
        <div className="container mx-auto max-w-[1400px] text-center text-sm font-medium text-muted-foreground px-4">
          <p className="mb-2">
            &copy; {new Date().getFullYear()} Murajiah. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
