-- Migration: Add 7-Day Free Trial and Notifications
-- Description: Adds 'trial_ends_at', 'has_used_trial', and 'trial_notification_sent' columns to profiles.
-- Updates 'handle_new_user' trigger and backfills existing 'free' users.

-- 1. Add Columns to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_notification_sent BOOLEAN DEFAULT FALSE;

-- 2. Update Handle New User Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_ends_at, has_used_trial)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    timezone('utc'::text, now()) + interval '7 days',
    TRUE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill Existing 'Free' Users (One-time 7-day trial)
-- Only for those who haven't had a trial and are currently 'free'.
UPDATE public.profiles
SET 
  trial_ends_at = timezone('utc'::text, now()) + interval '7 days',
  has_used_trial = TRUE
WHERE 
  subscription_status = 'free' 
  AND trial_ends_at IS NULL 
  AND has_used_trial = FALSE;
