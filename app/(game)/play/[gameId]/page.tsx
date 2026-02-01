import { createClient } from "@/utils/supabase/server";
import PlayerGameController from "./PlayerGameController";

export default async function PlayerGamePage({
  params,
}: {
  params: { gameId: string };
}) {
  const supabase = await createClient();
  const { gameId } = await params;

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (!game) return <div>Game not found</div>;

  return <PlayerGameController game={game} />;
}
