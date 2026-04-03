-- Migration: Remove automatic 7-Day Free Trial
-- Description: Updates the 'handle_new_user' trigger so it no longer
-- automatically grants the 7-day free trial on signup. 
-- Users start with trial_ends_at = NULL and has_used_trial = FALSE.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_ends_at, has_used_trial)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    NULL,
    FALSE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
