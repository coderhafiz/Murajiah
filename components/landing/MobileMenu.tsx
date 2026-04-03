"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import {
  Menu,
  X,
  LogIn,
  LayoutDashboard,
  KeyRound,
  User as UserIcon,
  Home,
  Search,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface MobileMenuProps {
  user: User | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile?: any;
}

// Panel springs in from the right — feels native & snappy
const panelVariants: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring", stiffness: 320, damping: 30 },
  },
  exit: {
    x: "100%",
    transition: { duration: 0.22, ease: [0.4, 0, 0.6, 1] },
  },
};

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2, delay: 0.06 } },
};

// Staggered children container
const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

export function MobileMenu({ user, profile }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/pricing", label: "Pricing", icon: CreditCard },
    { href: "/explore", label: "Explore Public Quizzes", icon: Search },
    { href: "/join", label: "Enter PIN", icon: KeyRound },
    ...(user
      ? [
          { href: "/dashboard", label: "My Library", icon: LayoutDashboard },
          { href: "/account", label: "Account Settings", icon: UserIcon },
        ]
      : []),
  ];

  const menuContent = (
    <div className="md:hidden">
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Slide-in panel */}
            <motion.div
              key="panel"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 z-50 h-full w-[300px] sm:w-[360px] bg-background border-l border-border shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="text-xl font-black text-primary tracking-tight">
                  Murajiah
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                >
                  <motion.span
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.2, ease: "easeOut" }}
                  >
                    <X className="h-5 w-5" />
                  </motion.span>
                </Button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
                {/* User profile card */}
                {user && (
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                  >
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
                  </motion.div>
                )}

                {/* Nav links — staggered */}
                <motion.nav
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-1"
                >
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <motion.div key={href} variants={itemVariants}>
                      <Link href={href} onClick={() => setOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-12 text-base"
                        >
                          <Icon className="w-5 h-5 text-muted-foreground" />
                          {label}
                        </Button>
                      </Link>
                    </motion.div>
                  ))}

                  {!user && (
                    <motion.div variants={itemVariants} className="pt-2">
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
                    </motion.div>
                  )}
                </motion.nav>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border">
                <p className="text-xs text-center text-muted-foreground">
                  &copy; {new Date().getFullYear()} Murajiah
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden relative w-10 h-10"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {mounted ? createPortal(menuContent, document.body) : null}
    </>
  );
}
