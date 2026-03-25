import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/server";
import { MobileMenu } from "@/components/landing/MobileMenu";
import NotificationBell from "@/components/dashboard/NotificationBell";

export default async function ExploreNavbarAuth() {
  const supabase = await createClient();
  let user = null;
  let profile = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("id", user.id)
        .single();
      profile = profileData;
    }
  } catch (error) {
    console.error("Auth fetch error in ExploreNavbarAuth:", error);
  }

  return (
    <div className="flex-1 md:flex-none flex justify-end items-center gap-2">
      {/* Notification Bell (Only if logged in) */}
      {user && <NotificationBell />}

      {/* Mobile Menu */}
      <MobileMenu user={user} profile={profile} />

      {/* Join Game Input (Mini) */}
      <div className="hidden sm:block">
        <Link href="/join">
          <Button
            size="lg"
            className="font-black bg-card text-primary border-2 border-border hover:bg-accent hover:text-accent-foreground shadow-sm rounded-md px-6 hidden sm:flex h-11"
          >
            Enter PIN
          </Button>
        </Link>
      </div>

      {user ? (
        <>
          <Link href="/dashboard" className="hidden sm:block">
            <Button variant="ghost" className="font-bold">
              My Library
            </Button>
          </Link>
          <Link href="/account">
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm cursor-pointer hover:opacity-80 transition hover:scale-105">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {user.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </>
      ) : (
        <Link href="/login">
          <Button
            size="lg"
            className="font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-md px-6 h-11"
          >
            Log in
          </Button>
        </Link>
      )}
    </div>
  );
}
