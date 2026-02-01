-- PERFORMANCE INDEXES
-- Run this in your Supabase SQL Editor to fix sluggishness

-- Foreign Key Indexes (Crucial for Joins)
create index if not exists idx_questions_quiz_id on questions(quiz_id);
create index if not exists idx_answers_question_id on answers(question_id);
create index if not exists idx_games_quiz_id on games(quiz_id);
create index if not exists idx_games_host_id on games(host_id);
create index if not exists idx_players_game_id on players(game_id);
create index if not exists idx_player_answers_game_id on player_answers(game_id);
create index if not exists idx_player_answers_player_id on player_answers(player_id);
create index if not exists idx_player_answers_question_id on player_answers(question_id);

-- Ordering Indexes (Crucial for "Order By" queries)
create index if not exists idx_questions_order_index on questions(order_index);
create index if not exists idx_answers_order_index on answers(order_index);

-- Composite Indexes (for RLS performance)
create index if not exists idx_quizzes_creator_id on quizzes(creator_id);
