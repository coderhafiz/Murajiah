-- 1. Add the missing tags column to the quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Force a schema cache reload to ensure API picks it up immediately
NOTIFY pgrst, 'reload schema';
