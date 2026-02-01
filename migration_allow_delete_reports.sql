-- Allow hosts to delete their own games
create policy "Hosts can delete their games" on games for delete using (auth.uid() = host_id);

-- Also allow deletion of players and player_answers if specific policies are needed, 
-- though ON DELETE CASCADE on the foreign keys should handle this automatically 
-- when the game is deleted.
-- However, for robustness if manual cleanup is attempted:

-- Allow hosts to delete players from their games
create policy "Hosts can delete players" on players for delete using (
  exists (
    select 1 from games
    where games.id = players.game_id
    and games.host_id = auth.uid()
  )
);

-- Allow hosts to delete player_answers from their games
create policy "Hosts can delete player_answers" on player_answers for delete using (
  exists (
    select 1 from games
    where games.id = player_answers.game_id
    and games.host_id = auth.uid()
  )
);
