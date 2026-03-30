import { cache } from "react";
import { createClient } from "@/utils/supabase/server";

export type AccessTier = "ADMIN" | "PREMIUM" | "FREE";

export interface UserAccessContext {
  tier: AccessTier;
  error?: string;
  isPremium: boolean;
  isAdmin: boolean;
  isTrial?: boolean;
  trialEndsAt?: string | null;
}

export const getUserAccessContext = cache(async function getUserAccessContext(): Promise<UserAccessContext> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        tier: "FREE",
        error: "Not logged in",
        isPremium: false,
        isAdmin: false,
      };
    }

    // 1. Admin Override (Checks ENV variable)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email === adminEmail) {
      return { tier: "ADMIN", isPremium: true, isAdmin: true };
    }

    // 2. Fetch Profile to check Subscription Status
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("subscription_status, manual_access_granted, trial_ends_at")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return {
        tier: "FREE",
        error: "Profile not found",
        isPremium: false,
        isAdmin: false,
      };
    }

    // 3. Trial Check
    const trialEndsAt = profile.trial_ends_at; // ISO string from Supabase
    const isTrialActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;

    // 4. Premium Check
    if (
      profile.subscription_status === "active" ||
      profile.manual_access_granted === true ||
      isTrialActive
    ) {
      return { 
        tier: "PREMIUM", 
        isPremium: true, 
        isAdmin: false,
        isTrial: isTrialActive && profile.subscription_status !== "active" && !profile.manual_access_granted,
        trialEndsAt: trialEndsAt
      };
    }

    // Default Fallback
    return { 
      tier: "FREE", 
      isPremium: false, 
      isAdmin: false,
      isTrial: false,
      trialEndsAt: trialEndsAt 
    };
  } catch (err) {
    console.error("Error evaluating user access context:", err);
    return {
      tier: "FREE",
      error: "Internal Server Error",
      isPremium: false,
      isAdmin: false,
    };
  }
});

