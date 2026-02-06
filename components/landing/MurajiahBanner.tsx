"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function MurajiahBanner() {
  return (
    <div className="w-full bg-linear-to-r from-[#46178f] to-[#6c42ba] shadow-xl relative overflow-hidden">
      <div className="container mx-auto max-w-7xl p-8 md:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        {/* Content */}
        <div className="space-y-3 md:space-y-4 text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
            Welcome to <span className="text-yellow-400">Murajiah</span>
          </h1>
          <p className="text-purple-100 font-medium text-lg max-w-lg leading-relaxed">
            The interactive quiz platform for education. Create, share, and play
            quizzes with your students or friends in real-time.
          </p>
        </div>

        {/* Action Button (Optional, can link to create or about) */}
        <div className="relative z-10 hidden md:block">
          <Link href="/dashboard/create">
            <Button
              size="lg"
              className="bg-white text-[#46178f] hover:bg-gray-100 font-bold border-0 h-12 px-8 rounded-full shadow-lg group"
            >
              Start creating
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Decorative Circles */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-40 w-40 rounded-full bg-yellow-400/20 blur-2xl"></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light" />

      {/* Shimmer Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none animate-shimmer bg-linear-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
