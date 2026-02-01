import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AccountForm from "@/components/account/AccountForm";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AccountForm user={user} />;
}
