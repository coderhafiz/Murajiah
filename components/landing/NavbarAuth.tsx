import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { MobileMenu } from "@/components/landing/MobileMenu";

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
          <Link href="/dashboard">
            <Button className="font-bold shadow-md">
              Go to My Library
            </Button>
          </Link>
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
