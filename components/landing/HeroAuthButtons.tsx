import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { ArrowRight, Zap } from "lucide-react";
import { LoadingNavElement } from "@/components/ui/LoadingNavElement";

export default async function HeroAuthButtons() {
  const supabase = await createClient();
  let user = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("Auth fetch error in HeroAuthButtons:", error);
  }

  return (
    <div className="flex flex-row flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 md:gap-4 pt-2 md:pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
      <Link href="/join">
        <Button
          className="h-9 sm:h-10 md:h-14 px-4 sm:px-6 md:px-8 text-sm sm:text-base md:text-lg font-bold rounded-full shadow-xl hover:scale-105 transition-transform bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 shadow-orange-500/20"
        >
          <Zap className="mr-1.5 h-4 w-4 md:h-5 md:w-5 text-yellow-200 fill-yellow-200" />
          Join Game
        </Button>
      </Link>
      <LoadingNavElement
        href={user ? "/dashboard" : "/login?tab=signup"}
        variant="beam"
        radius="9999px"
      >
        <Button
          className="h-9 sm:h-10 md:h-14 px-4 sm:px-6 md:px-8 text-sm sm:text-base md:text-lg font-bold rounded-full shadow-lg hover:shadow-blue-500/20 hover:scale-105 transition-all border-2 border-border hover:border-blue-500/50"
        >
          {user ? "Go to My Library" : "Create Account"}{" "}
          <ArrowRight className="ml-1.5 h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </LoadingNavElement>
    </div>
  );
}
