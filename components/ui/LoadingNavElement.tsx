"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingNavElementProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  radius?: number | string;
  role?: string;
  outside?: React.ReactNode;
  variant?: "border" | "beam";
}

export function LoadingNavElement({
  href,
  children,
  className,
  radius = 8,
  role,
  outside,
  variant = "border",
}: LoadingNavElementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  // Reset loading state if the pathname changes
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleClick = (e: React.MouseEvent) => {
    // External links or anchors should behave normally
    if (href.startsWith("http") || href.startsWith("#")) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    // If already leading to the same page, just reset or don't trigger
    if (pathname === href) {
      return;
    }

    setIsLoading(true);
    router.push(href);
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center group transition-all duration-300",
        isLoading && variant === "beam" && "scale-[0.98]",
        className
      )}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
      role={role || "link"}
    >
      {/* The Border-Wrapped Content */}
      <div className="relative h-full flex items-center">
        <div className={cn(
          "relative z-10 transition-colors duration-300",
          isLoading && variant === "beam" && "text-white"
        )}>
          {children}
        </div>

        {/* The Animated Border Overlay */}
        <AnimatePresence>
          {isLoading && variant === "border" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -inset-x-2.5 -inset-y-1.5 pointer-events-none z-20"
              style={{
                borderRadius: radius === "9999px" ? "9999px" : `${radius}px`,
              }}
            >
              <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <motion.rect
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  vectorEffect="non-scaling-stroke"
                  rx={radius === "9999px" ? 50 : radius}
                  strokeDasharray="25 75"
                  animate={{ strokeDashoffset: [0, -200] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </svg>
            </motion.div>
          )}

          {isLoading && variant === "beam" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-blue-600 rounded-[inherit] overflow-hidden z-0 pointer-events-none"
              style={{
                borderRadius: radius === "9999px" ? "9999px" : `${radius}px`,
              }}
            >
              <motion.div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/80 to-transparent w-[60%] -skew-x-20 z-10"
                animate={{ x: ["-150%", "250%"] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content Outside the Border */}
      {outside && <div className={cn(
        "relative z-10 ml-1 transition-colors duration-300",
        isLoading && variant === "beam" && "text-white"
      )}>{outside}</div>}
    </div>
  );
}
