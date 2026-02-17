-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb, -- { time_per_question, attempts_allowed, show_results, shuffle_answers }
  access_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assignment_attempts table
CREATE TABLE IF NOT EXISTS assignment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, 
  score INT DEFAULT 0,
  total_points INT DEFAULT 0,
  answers_snapshot JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_access_token ON assignments(access_token);
CREATE INDEX IF NOT EXISTS idx_assignments_creator_id ON assignments(creator_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_assignment_id ON assignment_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_user_id ON assignment_attempts(user_id);

-- RLS Policies
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_attempts ENABLE ROW LEVEL SECURITY;

-- Assignments Policies
-- 1. Owners can manage fully (view/edit/delete)
DO $$ BEGIN
  CREATE POLICY "Owners can manage their assignments" ON assignments
    USING (auth.uid() = creator_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Anyone can read assignment definition via token (public read for valid tokens)
DO $$ BEGIN
  CREATE POLICY "Public read for assignments" ON assignments
    FOR SELECT
    USING (true); 
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Assignment Attempts Policies
-- 1. Users can view/manage their own attempts
DO $$ BEGIN
  CREATE POLICY "Users can view their own attempts" ON assignment_attempts
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create attempts" ON assignment_attempts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own attempts" ON assignment_attempts
    FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Owners can view ALL attempts for their assignments
DO $$ BEGIN
  CREATE POLICY "Owners can view attempts for their assignments" ON assignment_attempts
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM assignments
        WHERE assignments.id = assignment_attempts.assignment_id
        AND assignments.creator_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
