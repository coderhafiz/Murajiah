"use client";

import { motion } from "framer-motion";
import { Brain, Users, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

export default function HomepageFeatureCards() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Consolidate mounting and mobile check into one effect cycle
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    // setTimeout avoids cascading render warning
    setTimeout(() => {
      setMounted(true);
    }, 0);
    
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const item = {
    hidden: () => ({
      opacity: 0,
      scale: isMobile ? 0.8 : 1,
      y: isMobile ? 0 : 30,
    }),
    show: (index: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        delay: isMobile ? 0 : index * 0.1,
      },
    }),
  };

  if (!mounted) {
    return <div className="grid md:grid-cols-3 gap-8 min-h-[250px]"></div>;
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* Feature 1 */}
      <motion.div
        custom={0}
        variants={item}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="bg-card border border-border/50 h-full rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        <div className="h-12 w-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
          <Brain className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3">Smart Creation</h3>
        <p className="text-muted-foreground leading-relaxed">
          Build quizzes in seconds. Support for multiple choice, voice
          answers, polls, and more. Customizable to fit any need.
        </p>
      </motion.div>

      {/* Feature 2 */}
      <motion.div
        custom={1}
        variants={item}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="bg-card border border-border/50 h-full rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3">Live Hosting</h3>
        <p className="text-muted-foreground leading-relaxed">
          Host live games that players can join from any device.
          Real-time leaderboards and instant feedback keep everyone
          engaged.
        </p>
      </motion.div>

      {/* Feature 3 */}
      <motion.div
        custom={2}
        variants={item}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="bg-card border border-border/50 h-full rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center mb-6 text-yellow-600 dark:text-yellow-400">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3">Deep Analytics</h3>
        <p className="text-muted-foreground leading-relaxed">
          Track performance with detailed reports. Identify learning
          gaps and celebrate improvements over time.
        </p>
      </motion.div>
    </div>
  );
}
