import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/utils/supabase/server";
import { MobileMenu } from "@/components/landing/MobileMenu";
import { ArrowRight, Brain, Zap, BarChart3, Users } from "lucide-react";

export default async function MarketingPage() {
  const supabase = await createClient();
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("Auth error:", error);
  }

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, email")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground font-sans selection:bg-primary/20">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black text-primary tracking-tight">
              Murajiah
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/explore"
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Explore Library
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
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-3">
              {user ? (
                <Link href="/dashboard">
                  <Button className="font-bold shadow-md">
                    Go into Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="font-semibold">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/login?tab=signup">
                    <Button className="font-bold shadow-md">
                      Sign Up free
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <div className="md:hidden">
              <MobileMenu user={user} profile={profile} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-500/10 via-primary/5 to-background" />
          <div className="container px-4 md:px-6 mx-auto text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
              The Ultimate Quiz Platform
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter max-w-4xl mx-auto leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700">
              Master Any Subject with{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-blue-600">
                Murajiah
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              Create engaging quizzes, host live games, and track progress
              effortlessly. Whether for classrooms, teams, or fun—learning has
              never been this exciting.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <Link href="/join">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg font-bold rounded-full shadow-xl hover:scale-105 transition-transform bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600 shadow-blue-500/20"
                >
                  <Zap className="mr-2 h-5 w-5 text-yellow-300 fill-yellow-300" />
                  Join Game
                </Button>
              </Link>
              <Link href={user ? "/dashboard" : "/login?tab=signup"}>
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg font-bold rounded-full shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all"
                >
                  {user ? "Go to Dashboard" : "Create Account"}{" "}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link
                href="/explore"
                className="text-sm font-semibold text-muted-foreground hover:text-blue-600 flex items-center justify-center gap-1 group"
              >
                Explore Public Quizzes{" "}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
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

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-card border border-border/50 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Smart Creation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Build quizzes in seconds. Support for multiple choice, voice
                  answers, polls, and more. Customizable to fit any need.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-card border border-border/50 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Live Hosting</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Host live games that players can join from any device.
                  Real-time leaderboards and instant feedback keep everyone
                  engaged.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-card border border-border/50 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-12 w-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 text-green-600">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Deep Analytics</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track performance with detailed reports. Identify learning
                  gaps and celebrate improvements over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="py-24">
          <div className="container px-4 md:px-6 mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                About Murajiah
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Murajiah is designed to make reviewing and learning enjoyable.
                We believe that gamification is the key to retention and
                engagement.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Built with modern technology and a focus on user experience,
                Murajiah empowers anyone to create, share, and play interactive
                quizzes anywhere, anytime.
              </p>
              <div className="pt-4">
                <Link href="/explore">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full font-bold"
                  >
                    See What Others Are Creating
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative aspect-square md:aspect-video bg-muted rounded-3xl overflow-hidden border border-border/50 shadow-2xl skew-y-1 rotate-1 hover:skew-y-0 hover:rotate-0 transition-all duration-500">
              <div className="absolute inset-0 bg-linear-to-br from-blue-600/20 to-primary/20 flex items-center justify-center">
                <span className="text-9xl opacity-20 select-none">🎓</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-muted py-12 border-t border-border/50">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <span className="text-2xl font-black text-primary tracking-tight mb-4 block">
                Murajiah
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
                    Explore Library
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-primary">
                    Creator Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/join" className="hover:text-primary">
                    Join Game
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Cookie Policy
                  </Link>
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
