-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- QUIZZES
create table quizzes (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  cover_image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('draft', 'published')) default 'draft'
);

-- QUESTIONS
create table questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references quizzes(id) on delete cascade not null,
  title text not null,
  time_limit integer default 20, -- seconds
  points_multiplier integer default 1,
  order_index integer not null default 0,
  question_type text check (question_type in ('quiz', 'true_false', 'type_answer', 'puzzle', 'voice', 'poll')) default 'quiz',
  media_url text
);

-- ANSWERS
create table answers (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  text text not null,
  is_correct boolean default false,
  color text, -- optional: 'red', 'blue', 'yellow', 'green' to match kahoot styles
  order_index integer default 0
);

-- GAMES (Live Sessions)
create table games (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references quizzes(id) on delete restrict not null,
  host_id uuid references profiles(id) not null,
  pin text not null, -- Game PIN (e.g. '123456')
  status text check (status in ('waiting', 'active', 'finished')) default 'waiting',
  current_question_id uuid references questions(id), -- Null if waiting or finished, or between questions
  current_question_status text check (current_question_status in ('intro', 'answering', 'finished')) default 'intro',
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- PLAYERS
create table players (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references games(id) on delete cascade not null,
  nickname text not null,
  score integer default 0,
  streak integer default 0,
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  unique(game_id, nickname)
);

-- PLAYER ANSWERS
create table player_answers (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references players(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  answer_id uuid references answers(id) on delete cascade, -- Null if they didn't answer in time?
  game_id uuid references games(id) on delete cascade not null,
  answered_at timestamp with time zone default timezone('utc'::text, now()),
  is_correct boolean default false,
  score_awarded integer default 0,
  answer_text text,
  submission_data jsonb
);

-- REALTIME
-- Enable realtime for games and players so we can subscribe to changes
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table player_answers;

-- POLICIES (Simple RLS for now - refine later)
alter table profiles enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table games enable row level security;
alter table players enable row level security;
alter table player_answers enable row level security;

-- READ POLICIES
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Public quizzes are viewable by everyone" on quizzes for select using (true);
create policy "Questions are viewable by everyone" on questions for select using (true);
create policy "Answers are viewable by everyone" on answers for select using (true);

-- GAMES: Viewable by everyone (needed for players to find game by PIN)
create policy "Games viewable by everyone" on games for select using (true);

-- PLAYERS: Viewable by everyone in the game
create policy "Players viewable by everyone" on players for select using (true); 
create policy "Players can map themselves" on players for insert with check (true);
create policy "Players can update their own score" on players for update using (true);

-- HOST POLICIES
create policy "Hosts can create games" on games for insert with check (auth.uid() = host_id);
create policy "Hosts can update their games" on games for update using (auth.uid() = host_id);


-- FIXES: MISSING RLS POLICIES FOR QUIZ CREATION
-- QUIZZES
create policy "Users can create their own quizzes" on quizzes for insert with check (auth.uid() = creator_id);
create policy "Users can update their own quizzes" on quizzes for update using (auth.uid() = creator_id);
create policy "Users can delete their own quizzes" on quizzes for delete using (auth.uid() = creator_id);

-- QUESTIONS
create policy "Users can create questions for their quizzes" on questions for insert with check (
    exists ( select 1 from quizzes where id = quiz_id and creator_id = auth.uid() )
);
create policy "Users can update questions for their quizzes" on questions for update using (
    exists ( select 1 from quizzes where id = quiz_id and creator_id = auth.uid() )
);
create policy "Users can delete questions for their quizzes" on questions for delete using (
    exists ( select 1 from quizzes where id = quiz_id and creator_id = auth.uid() )
);

-- ANSWERS
create policy "Users can create answers for their questions" on answers for insert with check (
    exists ( 
        select 1 from questions 
        join quizzes on questions.quiz_id = quizzes.id
        where questions.id = question_id and quizzes.creator_id = auth.uid() 
    )
);
create policy "Users can update answers for their questions" on answers for update using (
    exists ( 
        select 1 from questions 
        join quizzes on questions.quiz_id = quizzes.id
        where questions.id = question_id and quizzes.creator_id = auth.uid() 
    )
);
create policy "Users can delete answers for their questions" on answers for delete using (
    exists ( 
        select 1 from questions 
        join quizzes on questions.quiz_id = quizzes.id
        where questions.id = question_id and quizzes.creator_id = auth.uid() 
    )
);

-- USER MANAGEMENT TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- BACKFILL PROFILES
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;