import { createClient } from "@/utils/supabase/server";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import BackToTopButton from "@/components/dashboard/BackToTopButton";
import { getActiveWelcomeAnnouncement } from "@/app/actions/announcements";
import { NotificationConsentModal } from "@/components/marketing/NotificationConsentModal";

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
  let welcomeAnnouncement = null;
  let notificationSettings = null;

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
      .select("avatar_url, email, full_name, notification_settings")
      .eq("id", user.id)
      .single();
    profile = data;
    notificationSettings = data?.notification_settings;

    // Fetch welcome announcement if no settings
    if (!notificationSettings) {
      welcomeAnnouncement = await getActiveWelcomeAnnouncement();
    }
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
      <NotificationConsentModal
        announcement={welcomeAnnouncement}
        hasSettings={!!notificationSettings}
      />
    </div>
  );
}
