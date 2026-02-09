"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PenTool, Sparkles } from "lucide-react";

import { User } from "@supabase/supabase-js";

interface HomeActionCardsProps {
  user: User | null;
}

export function HomeActionCards({ user }: HomeActionCardsProps) {
  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3, // Wait for banner
      },
    },
  };

  const item: Variants = {
    hidden: { y: -200, zIndex: -10, opacity: 1 },
    show: {
      y: 0,
      zIndex: 0,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 18,
      },
    },
  };

  return (
    <motion.div
      className="hidden md:grid md:grid-cols-2 gap-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Manual Create */}
      <motion.div
        variants={item}
        className="rounded-3xl bg-linear-to-br from-[#dc2626] to-[#f59e0b] p-5 md:p-6 text-white relative overflow-hidden shadow-xl group transition-all hover:-translate-y-1 hover:shadow-2xl"
      >
        <div className="relative z-10 space-y-2">
          <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
            <PenTool className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight tracking-tight">
              Create a quiz
            </h2>
            <p className="text-white/90 font-medium text-base max-w-sm opacity-90">
              Build engaging quizzes in minutes. Play for free with up to 300
              participants.
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
      </motion.div>

      {/* AI Generate */}
      <motion.div
        variants={item}
        className="rounded-3xl bg-linear-to-br from-[#2563eb] to-[#06b6d4] p-5 md:p-6 text-white relative overflow-hidden shadow-xl group transition-all hover:-translate-y-1 hover:shadow-2xl"
      >
        <div className="relative z-10 space-y-2">
          <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight tracking-tight">
              A.I. Generator
            </h2>
            <p className="text-white/90 font-medium text-base max-w-sm opacity-90">
              Generate a quiz from any subject, PDF, or document instantly.
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
      </motion.div>
    </motion.div>
  );
}
