-- Postgres Function to completely wipe a user's data before Auth deletion
-- This bypasses restrictive foreign keys (like games lacking ON DELETE CASCADE)

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete all games hosted by this user 
  -- (This will cascade to players and player_answers because of games ID)
  DELETE FROM public.games WHERE host_id = target_user_id;

  -- 2. Delete the user's profile
  -- (Because quizzes has 'creator_id references profiles(id) on delete cascade', 
  -- this automatically wipes their quizzes, questions, and answers)
  DELETE FROM public.profiles WHERE id = target_user_id;
END;
$$;
