"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function deleteMyAccount() {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be logged in to delete your account.");
  }

  // Safeguard: Prevent admin accounts from being deleted
  if (user.email === process.env.ADMIN_EMAIL) {
    throw new Error("Admin accounts cannot be deleted.");
  }

  // 1. Create a Service Role client to bypass RLS and perform admin actions
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must exist in .env.local

  if (!supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
    throw new Error("Server configuration error. Cannot delete account.");
  }

  const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 2. Call our cleanup RPC to wipe games and the profile securely
  // This cleans up dependencies before deleting the Auth user
  const { error: rpcError } = await supabaseAdmin.rpc("delete_user_data", {
    target_user_id: user.id,
  });

  if (rpcError) {
    console.error("Failed to clean up user data:", rpcError);
    throw new Error("Failed to delete user profile data.");
  }

  // 3. Delete the user from Auth via Admin API
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Failed to delete user from Supabase Auth:", deleteError);
    throw new Error("Failed to delete user identity.");
  }

  // 4. Client-side will handle signout routing, but we can clear the server cookie state
  await supabase.auth.signOut();
  
  revalidatePath("/");
  
  return { success: true };
}
