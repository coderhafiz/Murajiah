import { getUserRole } from "@/utils/supabase/role";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  Bell,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getUserRole();

  if (role !== "owner" && role !== "admin") {
    redirect("/account");
  }

  const navItems = [
    { href: "/account/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/account/admin/users", label: "Users", icon: Users },
    { href: "/account/admin/content", label: "Content", icon: FileText },
    {
      href: "/account/admin/announcements",
      label: "Announcements",
      icon: Megaphone,
    },
    {
      href: "/account/admin/notifications",
      label: "Notifications",
      icon: Bell,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar / Topbar */}
      <aside className="w-full md:w-64 shrink-0 space-y-2">
        <div className="font-bold text-lg mb-4 px-2 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Admin Panel
        </div>
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                size="sm"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          ))}
          <div className="hidden md:block my-2 border-t border-border" />
          <Link href="/account">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Account
            </Button>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-card rounded-lg border p-6 min-h-[500px]">
        {children}
      </main>
    </div>
  );
}
