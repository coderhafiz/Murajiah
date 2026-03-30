-- Notification System Refinement Migration
-- 1. Add created_at to profiles (if missing) and welcome_notified status
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS welcome_notified BOOLEAN DEFAULT FALSE;

-- 2. Add is_sticky to global_notifications
ALTER TABLE global_notifications
ADD COLUMN IF NOT EXISTS is_sticky BOOLEAN DEFAULT FALSE;

-- 3. Update handle_new_user trigger to include created_at
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', NOW());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Backfill existing profile created_at from auth.users if needed
UPDATE profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE p.id = u.id AND p.created_at IS NULL;
