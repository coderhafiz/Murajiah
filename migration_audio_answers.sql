-- Add media_url to answers table
ALTER TABLE answers 
ADD COLUMN IF NOT EXISTS media_url text;

-- Update questions answer_format check to include 'audio'
ALTER TABLE questions 
DROP CONSTRAINT IF EXISTS questions_answer_format_check;

ALTER TABLE questions
ADD CONSTRAINT questions_answer_format_check CHECK (answer_format IN ('choice', 'text', 'audio'));
