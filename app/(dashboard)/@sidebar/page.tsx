"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, History, ClipboardList, BarChart3, Settings } from "lucide-react";

export default function DashboardSidebar() {
  const pathname = usePathname();

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
        Dashboard
      </p>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 group",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn(
              "w-4 h-4",
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
