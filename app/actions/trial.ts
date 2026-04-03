"use server";

import { createClient } from "@/utils/supabase/server";


export async function checkAndNotifyTrialExpiry() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Fetch profile with trial info
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("trial_ends_at, trial_notification_sent, subscription_status, manual_access_granted")
    .eq("id", user.id)
    .single();

  if (error || !profile) return;

  // Only notify if they are on a trial (not already premium or manual)
  if (profile.subscription_status === "active" || profile.manual_access_granted) {
    return;
  }

  if (!profile.trial_ends_at || profile.trial_notification_sent) {
    return;
  }

  const trialEndsAt = new Date(profile.trial_ends_at);
  const now = new Date();
  const diffInHours = (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Notify if trial ends in less than 24 hours but is still active
  if (diffInHours > 0 && diffInHours <= 24) {
    // 1. Create the notification
    const { error: notifyError } = await supabase.from("global_notifications").insert({
      title: "Your Premium Trial is Expiring Soon!",
      message: "Your 7-day free trial will end in less than 24 hours. Upgrade now to keep your premium features!",
      type: "warning",
      user_id: user.id,
    });

    if (notifyError) {
      console.error("Failed to create trial expiry notification:", notifyError.message);
      return;
    }

    // 2. Mark as notified to avoid duplicate notifications
    await supabase
      .from("profiles")
      .update({ trial_notification_sent: true })
      .eq("id", user.id);
  }
}
export async function startManualTrial() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not logged in");

  // Fetch current user profile to verify eligibility
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("has_used_trial, subscription_status")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Could not verify profile for trial");
  }

  // Prevent multiple trials
  if (profile.has_used_trial) {
    throw new Error("You have already used your free trial.");
  }

  // Update profile to start trial
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ 
      trial_ends_at: trialEndsAt.toISOString(), 
      has_used_trial: true 
    })
    .eq("id", user.id);

  if (updateError) {
    throw new Error("Failed to start trial");
  }

  return { success: true };
}
