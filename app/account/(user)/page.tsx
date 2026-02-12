import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AccountForm from "@/components/account/AccountForm";
import { getUserRole } from "@/utils/supabase/role";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole();

  return <AccountForm user={user} role={role || undefined} />;
}
