"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import SessionCounter from "@/components/dashboard/SessionCounter";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { Menu, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/GoogleTranslate";

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
}

export default function DashboardNavbar({
  user,
  profile,
  activeSessionCount,
}: DashboardNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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
            width={50}
            height={31}
            className="object-contain"
          />
        </Link>
        <div className="hidden md:flex lg:hidden gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-semibold transition-colors relative",
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary",
              )}
            >
              {link.label}
              {link.extra}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-4">
          <ThemeToggle className="hidden sm:flex" />
          <Link href="/join" target="_blank" className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              className="font-semibold text-muted-foreground hover:text-primary"
            >
              Join Game
            </Button>
          </Link>
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
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-card border-b border-border shadow-xl p-6 flex flex-col gap-6 md:hidden animate-in slide-in-from-top-5">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "text-lg font-semibold py-2 border-b border-border/50",
                  pathname === link.href
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                <div className="flex items-center justify-between">
                  {link.label}
                  {link.extra && (
                    <div className="scale-75 origin-right">{link.extra}</div>
                  )}
                </div>
              </Link>
            ))}
            <Link
              href="/dashboard/create"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-semibold py-2 border-b border-border/50 text-muted-foreground"
            >
              Create Quiz
            </Link>
            <Link
              href="/join"
              target="_blank"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-semibold py-2 border-b border-border/50 text-muted-foreground"
            >
              Join Game
            </Link>
            <Link
              href="/account"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-semibold py-2 border-b border-border/50 text-muted-foreground flex items-center gap-2"
            >
              Account Settings
              <Avatar className="w-6 h-6">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {profile?.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
          <div className="flex flex-col gap-3 py-2 border-t border-border mt-2">
            <span className="text-sm font-bold text-muted-foreground">
              Preferences
            </span>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Language</span>
              <LanguageSwitcher className="w-[140px]" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
