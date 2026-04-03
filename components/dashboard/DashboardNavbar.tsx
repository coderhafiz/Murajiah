"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import SessionCounter from "@/components/dashboard/SessionCounter";
import { Menu, X, Plus, Rocket, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/GoogleTranslate";
import { startManualTrial } from "@/app/actions/trial";
import { toast } from "sonner";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface User {
  id: string;
  email?: string;
}

interface Profile {
  full_name?: string | null;
  avatar_url?: string | null;
}

interface DashboardNavbarProps {
  user: User | null;
  profile: Profile | null;
  activeSessionCount: number;
  isPremium?: boolean;
  isTrial?: boolean;
  trialEndsAt?: string | null;
  hasUsedTrial?: boolean;
}

const dropdownVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: { type: "spring", stiffness: 320, damping: 30, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

export default function DashboardNavbar({
  user,
  profile,
  activeSessionCount,
  isPremium = false,
  isTrial = false,
  trialEndsAt,
  hasUsedTrial = false,
}: DashboardNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStartTrial = () => {
    startTransition(async () => {
      try {
        await startManualTrial();
        toast.success("7-Day Free Trial Started! Enjoy your premium features.");
        router.refresh();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to start trial.";
        toast.error(errorMessage);
      }
    });
  };

  const showStartTrial = !isPremium && !isTrial && hasUsedTrial === false;
  const showUpgrade = !isPremium && !isTrial && hasUsedTrial === true;

  const navLinks = [
    { href: "/dashboard", label: "My Quizzes" },
    {
      href: "/dashboard/sessions",
      label: "Sessions",
      extra: user ? (
        <SessionCounter initialCount={activeSessionCount} userId={user.id} />
      ) : null,
    },
    { href: "/dashboard/assignments", label: "Assignments" },
    { href: "/dashboard/reports", label: "Reports" },
  ];

  return (
    <nav className="bg-card border-b border-border px-6 h-[70px] flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition"
        >
          <Image
            src="/murajiah-logo.png"
            alt="Murajiah Logo"
            width={30}
            height={30}
            className="object-contain"
          />
          {isTrial && trialEndsAt && (
            <span className="hidden md:flex ml-2 items-center text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-600 bg-amber-500/10">
              {Math.max(
                0,
                Math.ceil(
                  (new Date(trialEndsAt).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )}{" "}
              days left
            </span>
          )}
          {isPremium && (
            <span className="hidden md:flex ml-2 items-center text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border border-green-500/30 text-green-600 bg-green-500/10 gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Premium
            </span>
          )}
        </Link>
      </div>

      <div className="flex flex-1 justify-end lg:flex-none lg:justify-start items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>

          <Link href="/join" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex font-bold hover:bg-muted active:scale-95 transition-all"
            >
              Join Game
            </Button>
          </Link>

          {showStartTrial && (
            <Button
              onClick={handleStartTrial}
              disabled={isPending}
              size="sm"
              className="hidden lg:inline-flex font-bold bg-amber-500 hover:bg-amber-600 text-white active:scale-95 transition-all shadow-md shadow-amber-500/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span>{isPending ? "Starting..." : "Start 7-Day Free Trial"}</span>
            </Button>
          )}

          {showUpgrade && (
            <a
              href="https://paystack.com/pay/murajiah-premium"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="sm"
                className="hidden lg:inline-flex font-bold bg-green-600 hover:bg-green-700 text-white active:scale-95 transition-all shadow-md shadow-green-500/20"
              >
                <Rocket className="w-4 h-4 mr-2" />
                <span>Upgrade to Premium</span>
              </Button>
            </a>
          )}

          <Link href="/dashboard/create">
            <Button
              size="sm"
              className="hidden md:inline-flex font-bold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>Create Quiz</span>
            </Button>
          </Link>
          <Link href="/account" className="hidden md:block">
            <Avatar className="w-9 h-9 border border-gray-200 shadow-sm hover:opacity-80 transition-opacity cursor-pointer">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden relative w-10 h-10 -mr-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-full left-0 w-full bg-card border-b border-border shadow-xl md:hidden overflow-hidden origin-top"
          >
            <div className="p-6 flex flex-col gap-6">
              <motion.nav
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-4"
              >
                {navLinks.map((link) => (
                  <motion.div key={link.href} variants={itemVariants}>
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex justify-between items-center py-2 border-b border-border/50 font-bold transition-colors text-lg",
                        pathname === link.href
                          ? "text-primary border-primary/20"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{link.label}</span>
                      {link.extra && (
                        <div className="scale-75 origin-right">{link.extra}</div>
                      )}
                    </Link>
                  </motion.div>
                ))}

                {showStartTrial && (
                  <motion.div variants={itemVariants} className="pt-2">
                    <Button
                      onClick={() => {
                        handleStartTrial();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={isPending}
                      className="w-full justify-start font-bold bg-amber-500 hover:bg-amber-600 text-white h-12"
                    >
                      <Sparkles className="w-5 h-5 mr-3" />
                      <span>{isPending ? "Starting..." : "Start Trial"}</span>
                    </Button>
                  </motion.div>
                )}

                {showUpgrade && (
                  <motion.div variants={itemVariants} className="pt-2">
                    <a
                      href="https://paystack.com/pay/murajiah-premium"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="w-full justify-start font-bold bg-green-600 hover:bg-green-700 text-white h-12">
                        <Rocket className="w-5 h-5 mr-3" />
                        <span>Upgrade to Premium</span>
                      </Button>
                    </a>
                  </motion.div>
                )}

                <motion.div variants={itemVariants}>
                  <Link
                    href="/dashboard/create"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex text-lg font-semibold py-2 border-b border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Create Quiz
                  </Link>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Link
                    href="/join"
                    target="_blank"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex text-lg font-semibold py-2 border-b border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Join Game
                  </Link>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Link
                    href="/account"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex text-lg font-semibold py-2 border-b border-border/50 text-muted-foreground hover:text-foreground transition-colors items-center gap-2"
                  >
                    Account Settings
                    <Avatar className="w-6 h-6 ml-auto">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {profile?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="flex flex-col gap-3 py-2 border-t border-border mt-2"
                >
                  <span className="text-sm font-bold text-muted-foreground">
                    Preferences
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Theme</span>
                    <ThemeToggle />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Language</span>
                    <LanguageSwitcher className="w-[140px]" />
                  </div>
                </motion.div>
              </motion.nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
