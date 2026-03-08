-- Add Subscription and Access Columns to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS paystack_customer_id text,
ADD COLUMN IF NOT EXISTS paystack_subscription_id text,
ADD COLUMN IF NOT EXISTS manual_access_granted boolean DEFAULT false;

-- Add Visibility Column to Quizzes
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS visibility text CHECK (visibility IN ('public', 'private')) DEFAULT 'private';
