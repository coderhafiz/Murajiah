"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, History, ClipboardList, BarChart3, Settings, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState(pathname);

  // Sync optimistic path back to real path once navigation completes
  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/sessions", label: "Sessions", icon: History },
    { href: "/dashboard/assignments", label: "Assignments", icon: ClipboardList },
    { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
    { href: "/account", label: "Settings", icon: Settings },
  ];

  return (
    <div className="p-4 space-y-2">
      <p className="px-4 text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest mb-4">
        My Library
      </p>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = optimisticPath === link.href;
        const isLoadingLink = isActive && pathname !== link.href;
        
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOptimisticPath(link.href)}
            className={cn(
              "relative flex items-center gap-3 px-4 py-2 rounded-lg text-base font-bold transition-colors duration-200 group overflow-hidden",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-active-pill"
                className="absolute inset-0 bg-primary/10 rounded-lg z-0"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-3 w-full">
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {link.label}
              
              {isLoadingLink && (
                <Loader2 className="w-4 h-4 ml-auto animate-spin text-primary opacity-70" />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
