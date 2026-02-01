"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, StopCircle, RefreshCw, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import LoadingModal from "@/components/ui/LoadingModal";

type Game = {
  id: string;
  pin: string;
  status: string;
  created_at: string;
  quiz?: {
    title: string;
  };
};

export default function ActiveSessions({
  initialGames,
}: {
  initialGames: Game[];
}) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    gameId?: string;
  }>({
    open: false,
  });

  const confirmEndGame = (gameId: string) => {
    setConfirmModal({ open: true, gameId });
  };

  const handleEndGame = async () => {
    const gameId = confirmModal.gameId;
    if (!gameId) return;

    setLoading(true);
    const { error } = await supabase
      .from("games")
      .update({
        status: "finished",
        ended_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (!error) {
      setGames((prev) => prev.filter((g) => g.id !== gameId));
      router.refresh();
    } else {
      alert("Failed to end game");
      console.error(error);
    }
    setLoading(false);
  };

  if (games.length === 0) return null;

  return (
    <Card className="mb-8 bg-primary/5">
      <CardHeader className="pb-3 border-b-0">
        <CardTitle className="text-primary flex items-center gap-2 text-xl">
          <Play className="w-5 h-5 text-primary" /> Active Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 grid gap-4">
        {games.map((game) => (
          <div
            key={game.id}
            className="flex items-center justify-between bg-card p-4 rounded-lg shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
              <div>
                <p className="font-bold text-foreground">
                  {game.quiz?.title || "Unknown Quiz"}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground font-bold">
                    PIN: {game.pin}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      game.status === "active"
                        ? "bg-green-100 text-green-700 animate-pulse"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {game.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/host/${game.id}`}>
                <Button size="sm" variant="outline" className="gap-2">
                  <Users className="w-4 h-4" /> Join
                </Button>
              </Link>
              <Button
                size="sm"
                variant="destructive"
                className="gap-2"
                onClick={() => confirmEndGame(game.id)}
                disabled={loading}
              >
                <StopCircle className="w-4 h-4" /> End
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <ConfirmationModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title="End Session?"
        description="Are you sure you want to end this active session? Players will be disconnected."
        confirmText="End Session"
        variant="destructive"
        onConfirm={handleEndGame}
      />

      <LoadingModal open={loading} message="Ending Session..." />
    </Card>
  );
}
