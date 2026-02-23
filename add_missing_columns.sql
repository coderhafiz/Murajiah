-- Comprehensive fix to add ALL missing columns to the quizzes table
-- This catches up the live production database with the local schema changes
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
ADD COLUMN IF NOT EXISTS language text,
ADD COLUMN IF NOT EXISTS play_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS folder_id uuid;

-- Force a schema cache reload so the API picks everything up immediately
NOTIFY pgrst, 'reload schema';
