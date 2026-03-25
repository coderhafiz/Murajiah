import { createClient } from "@/utils/supabase/server";
import { MurajiahBanner } from "@/components/landing/MurajiahBanner";

export default async function ExploreBannerWrapper() {
  const supabase = await createClient();
  let user = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("Auth fetch error in ExploreBannerWrapper:", error);
  }

  return <MurajiahBanner user={user} />;
}
