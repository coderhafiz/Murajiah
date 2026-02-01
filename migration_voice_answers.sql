-- Add answer_format column to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS answer_format text CHECK (answer_format IN ('single', 'multiple', 'text')) DEFAULT 'single';

-- 'single' = Single Choice (Standard 1/4) - but typically we use multiple choice UI where 1 is correct.
-- 'text' = Type the answer.
-- Let's stick to 'choice' | 'text' for simplicity in our logic, matching the user's "selecting" vs "text".
-- Actually, let's use 'choice' and 'text'.

ALTER TABLE questions 
DROP CONSTRAINT IF EXISTS questions_answer_format_check;

ALTER TABLE questions
ADD CONSTRAINT questions_answer_format_check CHECK (answer_format IN ('choice', 'text'));

ALTER TABLE questions
ALTER COLUMN answer_format SET DEFAULT 'choice';
