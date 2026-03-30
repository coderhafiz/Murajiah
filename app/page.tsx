import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import HomepageFeatureCards from "@/components/landing/HomepageFeatureCards";
import ThreeDWrapper from "@/components/landing/ThreeDWrapper";
import NavbarAuth from "@/components/landing/NavbarAuth";
import HeroAuthButtons from "@/components/landing/HeroAuthButtons";
import TestimonialsWrapper from "@/components/landing/TestimonialsWrapper";
import CommentFormWrapper from "@/components/landing/CommentFormWrapper";
import {
  NavbarAuthSkeleton,
  HeroAuthButtonsSkeleton,
  TestimonialsSkeleton,
} from "@/components/landing/LandingSkeletons";
import { ArrowRight } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground font-sans selection:bg-primary/20">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/murajiah-logo.png"
              alt="Murajiah Logo"
              width={30}
              height={30}
              className="object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/explore"
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Explore Public Quizzes
            </Link>
            <Link
              href="#features"
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="#about"
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Suspense fallback={<NavbarAuthSkeleton />}>
              <NavbarAuth />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-4 pb-32 md:pt-32 md:pb-48 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-orange-500/20 via-red-500/10 to-background" />
          <div className="container px-4 md:px-6 mx-auto grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-left space-y-4 md:space-y-8 order-2 lg:order-1 z-10 relative">
              <div className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-600 dark:text-orange-400 mb-2 md:mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <span className="flex h-2 w-2 rounded-full bg-orange-500 mr-2 animate-pulse"></span>
                The Ultimate Quiz Platform
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700">
                Master Any Subject with{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-500 via-yellow-200 to-orange-500 bg-size-[200%_auto] animate-text-shimmer">
                  Murajiah
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                Create engaging quizzes, host live games, and track progress
                effortlessly. Whether for classrooms, teams, or fun—learning has
                never been this exciting.
              </p>

              <Suspense fallback={<HeroAuthButtonsSkeleton />}>
                <HeroAuthButtons />
              </Suspense>

              <div className="pt-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                <Link
                  href="/explore"
                  className="text-sm font-semibold text-muted-foreground hover:text-blue-600 inline-flex items-center gap-1 group"
                >
                  Explore Public Quizzes{" "}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* 3D Model */}
            <div className="relative w-full h-[280px] md:h-[400px] lg:h-[600px] order-1 lg:order-2 flex items-center justify-center animate-in fade-in zoom-in duration-1000">
              <div className="absolute inset-0 bg-radial-gradient from-orange-500/10 to-transparent blur-3xl -z-10" />
              <ThreeDWrapper />
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section
          id="features"
          className="py-24 bg-muted/50 border-y border-border/50"
        >
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                Everything you need to engage & assess
              </h2>
              <p className="text-muted-foreground text-lg">
                Powerful tools for educators, trainers, and quiz enthusiasts.
              </p>
            </div>
            <HomepageFeatureCards />
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="py-16 md:py-24">
          <div className="container px-4 md:px-6 mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-6 relative isolate rounded-3xl overflow-hidden p-8 md:p-0 md:overflow-visible md:rounded-none">
              {/* Mobile Background Image & Overlay */}
              <div className="absolute inset-0 -z-20 md:hidden">
                <Image
                  src="/images/g2.png"
                  alt="About Background"
                  fill
                  className="object-cover object-bottom-right"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>

              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white md:text-foreground relative z-10">
                About Murajiah
              </h2>
              <p className="text-lg text-gray-200 md:text-muted-foreground leading-relaxed relative z-10">
                Murajiah is designed to make reviewing and learning enjoyable.
                We believe that gamification is the key to retention and
                engagement.
              </p>
              <p className="text-lg text-gray-200 md:text-muted-foreground leading-relaxed relative z-10">
                Built with modern technology and a focus on user experience,
                Murajiah empowers anyone to create, share, and play interactive
                quizzes anywhere, anytime.
              </p>
              <div className="pt-4 relative z-10">
                <Link
                  href="/explore"
                  className="w-full md:w-auto block md:inline-block"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full md:w-auto rounded-full font-bold h-auto py-3 px-6 whitespace-normal text-center text-sm md:text-lg bg-white/10 text-white border-white/20 hover:bg-white/20 md:bg-background md:text-foreground md:border-border md:hover:bg-accent md:hover:text-accent-foreground"
                  >
                    See What Others Are Creating
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block relative aspect-square md:aspect-video bg-muted rounded-3xl overflow-hidden border border-border/50 shadow-2xl skew-y-1 rotate-1 hover:skew-y-0 hover:rotate-0 transition-all duration-500 group">
              <Image
                src="/images/g2.png"
                alt="About Murajiah"
                fill
                className="object-cover object-bottom-right transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section
          id="testimonials"
          className="py-24 bg-muted/30 border-t border-border/50"
        >
          <div className="container px-4 md:px-6 mx-auto space-y-16">
            <Suspense fallback={<TestimonialsSkeleton />}>
              <TestimonialsWrapper />
            </Suspense>

            {/* Comment Form */}
            <div className="max-w-2xl mx-auto pt-8">
              <Suspense fallback={null}>
                <CommentFormWrapper />
              </Suspense>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-muted py-12 border-t border-border/50">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <span className="flex items-center gap-2 text-2xl font-black text-primary tracking-tight mb-4">
                <Image
                  src="/murajiah-logo.png"
                  alt="Murajiah Logo"
                  width={60}
                  height={19}
                  className="object-contain"
                />
              </span>
              <p className="text-muted-foreground max-w-xs">
                The interactive quiz platform for modern learning. Join
                thousands of users learning smarter today.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/explore" className="hover:text-primary">
                    Explore Public Quizzes
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-primary">
                    My Library
                  </Link>
                </li>
                <li>
                  <Link href="/join" className="hover:text-primary">
                    Join Game
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-primary">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="mailto:muraajiah@gmail.com"
                    className="hover:text-primary transition-colors"
                  >
                    muraajiah@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Murajiah. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
