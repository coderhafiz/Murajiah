import { createClient } from "@/utils/supabase/server";
import { CommentForm } from "@/components/marketing/CommentForm";

export default async function CommentFormWrapper() {
  const supabase = await createClient();
  let user = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("Auth fetch error in CommentFormWrapper:", error);
  }

  return <CommentForm user={user} />;
}
