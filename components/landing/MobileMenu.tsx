"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import {
  Menu,
  LogIn,
  LayoutDashboard,
  KeyRound,
  User as UserIcon,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MobileMenuProps {
  user: User | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile?: any;
}

export function MobileMenu({ user, profile }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle className="text-left flex items-center gap-2">
            <span className="text-xl font-black text-primary tracking-tight">
              Murajiah
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 h-full">
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
              <Avatar className="h-10 w-10 border border-background">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {user.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden justify-center">
                <span className="font-bold text-sm truncate">
                  {displayName}
                </span>
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-2">
            <Link href="/" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-base"
              >
                <Home className="w-5 h-5 text-muted-foreground" />
                Home
              </Button>
            </Link>

            <Link href="/join" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-base"
              >
                <KeyRound className="w-5 h-5 text-muted-foreground" />
                Enter PIN
              </Button>
            </Link>

            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12 text-base"
                  >
                    <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
                    My Library
                  </Button>
                </Link>
                <Link href="/account" onClick={() => setOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12 text-base"
                  >
                    <UserIcon className="w-5 h-5 text-muted-foreground" />
                    Account Settings
                  </Button>
                </Link>
              </>
            ) : (
              <div className="pt-2">
                <Link href="/login" onClick={() => setOpen(false)}>
                  <Button
                    className="w-full justify-center gap-2 font-bold h-11"
                    size="lg"
                  >
                    <LogIn className="w-4 h-4" />
                    Log in
                  </Button>
                </Link>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/login?tab=signup"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setOpen(false)}
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            )}
          </nav>

          <div className="mt-auto pb-4">
            <p className="text-xs text-center text-muted-foreground">
              &copy; {new Date().getFullYear()} Murajiah
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
