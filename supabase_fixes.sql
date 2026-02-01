-- Fix Missing RLS Policies for Quizzes, Questions, Answers

-- QUIZZES
create policy "Users can create their own quizzes" on quizzes for insert with check (auth.uid() = creator_id);
create policy "Users can update their own quizzes" on quizzes for update using (auth.uid() = creator_id);
create policy "Users can delete their own quizzes" on quizzes for delete using (auth.uid() = creator_id);

-- QUESTIONS
-- Allow creators to add questions to their quizzes
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
-- Automatically create a profile when a new user signs up
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

-- BACKFILL PROFILES (Optional, safe to run)
-- Inserts profiles for existing users if missing
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
