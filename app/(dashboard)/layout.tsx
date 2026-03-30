import { createClient } from "@/utils/supabase/server";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import BackToTopButton from "@/components/dashboard/BackToTopButton";
import { getActiveWelcomeAnnouncement } from "@/app/actions/announcements";
import { NotificationConsentModal } from "@/components/marketing/NotificationConsentModal";
import { getUserAccessContext } from "@/lib/access";
import { checkAndNotifyTrialExpiry } from "@/app/actions/trial";
import { sendWelcomeNotification } from "@/app/actions/notifications";


export default async function DashboardLayout({
  children,
  modal,
  sidebar,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeSessionCount = 0;
  let profile = null;
  let welcomeAnnouncement = null;
  let notificationSettings = null;
  let isPremium = false;
  let access = null;


  if (user) {
    // 1. Check for trial expiry and notify if needed
    await checkAndNotifyTrialExpiry();
    
    // 2. Send welcome notification if new user
    await sendWelcomeNotification();

    const [accessResult, gamesCountResult, profileResult] = await Promise.all([

      getUserAccessContext(),


      supabase
        .from("games")
        .select("*", { count: "exact", head: true })
        .eq("host_id", user.id)
        .in("status", ["waiting", "active"])
        .or("is_preview.eq.false,is_preview.is.null"),
      supabase
        .from("profiles")
        .select("avatar_url, email, full_name, notification_settings")
        .eq("id", user.id)
        .single(),
    ]);

    access = accessResult;
    isPremium = access.isPremium;

    activeSessionCount = gamesCountResult.count || 0;
    profile = profileResult.data;
    notificationSettings = profile?.notification_settings;

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
        isPremium={isPremium}
        isTrial={access?.isTrial}
        trialEndsAt={access?.trialEndsAt}
      />


      <div className="flex w-full">
        <aside className="hidden lg:block w-64 border-r border-border sticky top-[70px] h-[calc(100vh-70px)] overflow-y-auto shrink-0 bg-card/50">
          {sidebar}
          {isPremium && (
            <div className="p-4 mt-4 bg-purple-500/5 rounded-xl border border-purple-500/20 mx-4">
              <p className="text-xs font-bold text-purple-600 uppercase mb-1">
                {access?.isTrial ? "Trial Feature" : "Premium Feature"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {access?.isTrial 
                  ? "You have full access to all Premium features during your trial." 
                  : "You have access to all AI models and advanced settings."}
              </p>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0 w-full p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
      {modal}
      <BackToTopButton />
      <NotificationConsentModal
        announcement={welcomeAnnouncement}
        hasSettings={!!notificationSettings}
      />
    </div>
  );
}
