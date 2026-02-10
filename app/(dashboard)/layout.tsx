import { createClient } from "@/utils/supabase/server";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import BackToTopButton from "@/components/dashboard/BackToTopButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeSessionCount = 0;
  let profile = null;

  if (user) {
    const { count } = await supabase
      .from("games")
      .select("*", { count: "exact", head: true })
      .eq("host_id", user.id)
      .in("status", ["waiting", "active"])
      .or("is_preview.eq.false,is_preview.is.null");
    activeSessionCount = count || 0;

    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, email, full_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardNavbar
        user={user}
        profile={profile}
        activeSessionCount={activeSessionCount}
      />
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
      <BackToTopButton />
    </div>
  );
}
