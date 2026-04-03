import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingNavElement } from "@/components/ui/LoadingNavElement";
import { createClient } from "@/utils/supabase/server";
import { MobileMenu } from "@/components/landing/MobileMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function NavbarAuth() {
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
    console.error("Auth fetch error in NavbarAuth:", error);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <LoadingNavElement href="/dashboard" variant="beam" radius="9999px">
              <Button className="font-bold shadow-md">
                Go to My Library
              </Button>
            </LoadingNavElement>
            <Link href="/account">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm cursor-pointer hover:opacity-80 transition hover:scale-105">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {profile?.full_name?.charAt(0) || user.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        ) : (
          <>
            <Link href="/login">
              <Button variant="ghost" className="font-semibold">
                Log in
              </Button>
            </Link>
            <Link href="/login?tab=signup">
              <Button className="font-bold shadow-md">
                Sign Up free
              </Button>
            </Link>
          </>
        )}
      </div>
      <div className="md:hidden">
        <MobileMenu user={user} profile={profile} />
      </div>
    </div>
  );
}
