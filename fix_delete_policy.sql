-- Allow Hosts to delete player_answers (to reset question state)
create policy "Hosts can delete player_answers" 
on player_answers 
for delete 
using (
  exists (
    select 1 from games
    where games.id = player_answers.game_id
    and games.host_id = auth.uid()
  )
);
