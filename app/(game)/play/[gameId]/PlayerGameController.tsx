"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { submitAnswer, getFullGameData } from "@/app/actions/play";
import { Reorder } from "framer-motion";
import { Triangle, Hexagon, Square, Circle } from "lucide-react";
import type { Game, Question, Answer } from "@/app/store/useGameStore";

export default function PlayerGameController({ game }: { game: Game }) {
  const supabase = createClient();
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<Game>(game);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [puzzleOrder, setPuzzleOrder] = useState<Answer[]>([]);
  const [fullQuizData, setFullQuizData] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<
    string | string[] | null
  >(null);

  const shapes = {
    red: Triangle,
    blue: Hexagon, // Diamond-ish
    yellow: Circle,
    green: Square,
  };

  const questionStartTime = useRef<number | null>(null);

  // Colors mapping
  const answerColors = [
    { name: "Red", color: "bg-game-red", value: "red" },
    { name: "Blue", color: "bg-game-blue", value: "blue" },
    { name: "Yellow", color: "bg-game-yellow", value: "yellow" },
    { name: "Green", color: "bg-game-green", value: "green" },
  ];

  // Realtime subscription for Game State
  useEffect(() => {
    const channel = supabase
      .channel("game_status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          setGameState((prev: Game) => ({ ...prev, ...payload.new }));

          // Track start time when status changes to answering
          if (
            payload.new.current_question_status === "answering" &&
            gameState.current_question_status !== "answering"
          ) {
            questionStartTime.current = Date.now();
          }

          // Reset submitted state if question changes
          if (
            payload.new.current_question_id &&
            payload.new.current_question_id !== gameState.current_question_id
          ) {
            setSubmitted(false);
            setTypedAnswer(""); // Reset typed answer
            setSelectedAnswer(null); // Reset selection
            // Also reset start time if we moved to a new question (and it's already answering? unlikely but safe)
            if (payload.new.current_question_status === "answering") {
              questionStartTime.current = Date.now();
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    game.id,
    supabase,
    gameState.current_question_id,
    gameState.current_question_status,
  ]);

  // Realtime subscription for Player Score
  useEffect(() => {
    if (!playerId) return;

    const channel = supabase
      .channel(`player_score_${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `id=eq.${playerId}`,
        },
        (payload) => {
          setScore(payload.new.score);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, supabase]);

  // Prefetch Game Data (Load Once)
  useEffect(() => {
    getFullGameData(game.id).then((data) => {
      if (data) {
        setFullQuizData(data as Question[]);
        console.log("Full quiz data prefetched:", data.length, "questions");
      }
    });
  }, [game.id]);

  // Update Current Question from Local Data (No DB Fetch)
  useEffect(() => {
    if (gameState.current_question_id && fullQuizData.length > 0) {
      const question = fullQuizData.find(
        (q) => q.id === gameState.current_question_id,
      );
      if (question) {
        setCurrentQuestion(question);
        if (question.question_type === "puzzle") {
          const shuffled = [...question.answers].sort(
            () => Math.random() - 0.5,
          );
          setPuzzleOrder(shuffled);
        }
      }
    }
  }, [gameState.current_question_id, fullQuizData]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname) return;

    // Check if the joining user is the Host (Owner)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let existingHostPlayer = null;

    if (user && game.host_id === user.id) {
      // Look for the "Host (You)" placeholder created by the dashboard
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", game.id)
        .eq("nickname", "Host (You)")
        .maybeSingle();
      existingHostPlayer = data;
    }

    let result;
    if (existingHostPlayer) {
      // Merge identity: Update the placeholder with the real nickname
      console.log(
        "Merging Host identity with specific player",
        existingHostPlayer.id,
      );
      result = await supabase
        .from("players")
        .update({ nickname: nickname })
        .eq("id", existingHostPlayer.id)
        .select()
        .single();
    } else {
      // Regular join
      result = await supabase
        .from("players")
        .insert({
          game_id: game.id,
          nickname,
          score: 0,
        })
        .select()
        .single();
    }

    const { data, error } = result;

    if (error) {
      alert("Could not join. Try another nickname.");
    } else {
      setPlayerId(data.id);
      setScore(data.score); // Set initial score (preserves host score if any)
      setJoined(true);
    }
  };

  const handleSubmit = async (answerValue: string | string[]) => {
    // Calculate elapsed time
    // eslint-disable-next-line
    const now = Date.now();
    const start = questionStartTime.current || now;
    const elapsedSeconds = (now - start) / 1000;

    console.log(
      "Submitting:",
      answerValue,
      playerId,
      gameState.current_question_id,
      "Elapsed:",
      elapsedSeconds,
    );

    if (!playerId || submitted || !gameState.current_question_id) {
      return;
    }

    // Interactive feedback: Select immediately
    setSelectedAnswer(answerValue);

    // Play haptic
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // --- CLIENT SIDE VALIDATION (Optimistic) ---
    let optimisticIsCorrect = false;
    let optimisticPoints = 0;

    if (currentQuestion) {
      const qType = currentQuestion.question_type || "quiz";

      if (qType === "puzzle") {
        // Puzzle Validation
        const submittedIds = Array.isArray(answerValue) ? answerValue : [];
        const sortedAnswers = [...currentQuestion.answers].sort(
          (a, b) => (a.order_index || 0) - (b.order_index || 0),
        );
        const expectedIds = sortedAnswers.map((a) => a.id);

        if (
          submittedIds.length === expectedIds.length &&
          submittedIds.every((id, i) => id === expectedIds[i])
        ) {
          optimisticIsCorrect = true;
        }
      } else if (qType === "type_answer") {
        // Text Validation
        const valStr = String(answerValue).trim().toLowerCase();
        if (
          currentQuestion.answers.some(
            (a) => a.text.trim().toLowerCase() === valStr,
          )
        ) {
          optimisticIsCorrect = true;
        }
      } else {
        // Choice / TrueFalse Validation (Color or ID)
        // Note: answerValue is usually 'color' string for buttons
        if (
          currentQuestion.answers.some(
            (a) =>
              (a.color === answerValue || a.id === answerValue) && a.is_correct,
          )
        ) {
          optimisticIsCorrect = true;
        }
      }

      // Calculate Points (Kahoot-style)
      if (optimisticIsCorrect && qType !== "poll") {
        const basePoints = 1000 * (currentQuestion.points_multiplier || 1);
        const limit = currentQuestion.time_limit || 20;
        const safeElapsed = Math.min(Math.max(elapsedSeconds, 0), limit);
        const ratio = safeElapsed / limit;
        const timeFactor = 1 - ratio / 2;
        optimisticPoints = Math.round(basePoints * timeFactor);
      }
    }

    // Apply Optimistic Score Update
    if (optimisticPoints > 0) {
      setScore((prev) => prev + optimisticPoints);
    }

    // --- END CLIENT SIDE VALIDATION ---

    try {
      const qType = currentQuestion?.question_type || "quiz";
      const submission: { type: string; value: string | string[] } = {
        type: qType,
        value: answerValue,
      };

      // Submit in background
      // We don't await the result to block the UI flow,
      // but we do catch errors.
      submitAnswer(
        playerId,
        game.id,
        gameState.current_question_id,
        JSON.stringify(submission),
        elapsedSeconds,
      ).then((result) => {
        if (!result?.success) {
          console.error("Background submission failed:", result);
          // Revert score if failed? Too complex for now, Realtime will fix it eventually.
        }
      });

      // Show submitted screen immediately (or small delay for visual effect)
      setTimeout(() => {
        setSubmitted(true);
      }, 500);
    } catch (err) {
      console.error("Submission error exception:", err);
    }
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-[#46178f] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 space-y-4">
          <h1 className="text-center text-2xl font-black">Join Game</h1>
          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              placeholder="Nickname"
              className="text-center font-bold text-xl"
              maxLength={15}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <Button type="submit" className="w-full text-xl py-6 font-black">
              OK, Go!
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <div className="min-h-screen bg-[#46178f] flex flex-col items-center justify-center text-white p-4 text-center space-y-6">
        <h1 className="text-3xl font-bold">You&apos;re in!</h1>
        <p className="text-xl opacity-80">See your name on screen?</p>
        <div className="animate-bounce font-black text-2xl bg-white text-primary px-6 py-2 rounded-full">
          {nickname}
        </div>
      </div>
    );
  }

  if (gameState.status === "active") {
    if (gameState.current_question_status === "intro") {
      return (
        <div className="min-h-screen bg-purple-900 flex items-center justify-center text-white">
          <h1 className="text-4xl font-black animate-pulse">Get Ready...</h1>
        </div>
      );
    }

    if (gameState.current_question_status === "finished") {
      return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white space-y-4">
          <h1 className="text-4xl font-bold">Time&apos;s Up!</h1>
          <p className="text-2xl">Look at the big screen</p>
          <div className="bg-white/10 p-4 rounded-xl">
            <span className="text-sm uppercase tracking-widest opacity-70">
              Your Score
            </span>
            <div className="text-4xl font-black">{score}</div>
          </div>
        </div>
      );
    }

    // Question Active and NOT submitted yet
    if (!submitted) {
      const qType = currentQuestion?.question_type || "quiz";

      if (qType === "type_answer") {
        return (
          <div className="min-h-screen bg-purple-900 p-8 flex flex-col items-center justify-center space-y-6">
            <h2 className="text-white text-2xl font-bold">Type your answer</h2>
            <Input
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              className="text-center text-xl p-6 font-bold h-20"
              placeholder="Type here..."
            />
            <Button
              size="lg"
              className="w-full text-xl py-6"
              onClick={() => handleSubmit(typedAnswer)}
            >
              Submit
            </Button>
          </div>
        );
      } else if (qType === "true_false") {
        return (
          <div className="min-h-screen bg-gray-100 p-2 grid grid-cols-2 gap-2 h-screen max-h-screen">
            <button
              onClick={() => handleSubmit("blue")} // True usually blue
              className="rounded-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center bg-blue-600 text-white text-4xl font-black"
            >
              TRUE
            </button>
            <button
              onClick={() => handleSubmit("red")} // False usually red
              className="rounded-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center bg-red-600 text-white text-4xl font-black"
            >
              FALSE
            </button>
          </div>
        );
      } else if (qType === "puzzle") {
        return (
          <div className="h-screen max-h-screen bg-purple-900 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 pt-10 pb-32">
              <h2 className="text-white text-center mb-6 text-3xl font-black uppercase tracking-tighter">
                Rearrange the blocks!
              </h2>

              <div className="bg-white/10 p-8 rounded-3xl border-4 border-dashed border-white/20 min-h-[300px] relative overflow-hidden shadow-2xl backdrop-blur-sm">
                {/* Grid background effect */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(#fff 1px, transparent 1px)",
                    backgroundSize: "30px 30px",
                  }}
                ></div>

                <Reorder.Group
                  axis="y"
                  values={puzzleOrder}
                  onReorder={setPuzzleOrder}
                  className="flex flex-col gap-4 relative z-10 items-center w-full"
                >
                  {puzzleOrder.map((item) => (
                    <Reorder.Item
                      key={item.id}
                      value={item}
                      className="w-full max-w-lg cursor-grab active:cursor-grabbing"
                    >
                      <div
                        className={cn(
                          "p-4 rounded-xl text-white font-black text-xl shadow-md flex items-center justify-between border-b-4",
                          item.color === "red"
                            ? "bg-red-500 border-red-700"
                            : item.color === "blue"
                              ? "bg-blue-500 border-blue-700"
                              : item.color === "yellow"
                                ? "bg-yellow-500 border-yellow-700"
                                : "bg-green-500 border-green-700",
                        )}
                      >
                        <span>{item.text}</span>
                        <div className="flex flex-col gap-1">
                          <div className="w-8 h-1 bg-white/50 rounded-full" />
                          <div className="w-8 h-1 bg-white/50 rounded-full" />
                          <div className="w-8 h-1 bg-white/50 rounded-full" />
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            </div>

            <div className="p-4 bg-purple-900 border-t border-white/10 shrink-0 z-20">
              <Button
                className="w-full text-2xl py-8 font-black bg-white text-purple-900 hover:bg-gray-100 rounded-2xl shadow-xl border-b-8 active:border-b-2 transition-all active:translate-y-1"
                onClick={() => {
                  handleSubmit(puzzleOrder.map((i) => i.id));
                }}
              >
                FINISH ORDER
              </Button>
            </div>
          </div>
        );
      }

      // Default Quiz / Poll / Voice
      return (
        <div className="min-h-screen bg-background p-2 grid grid-cols-2 grid-rows-2 gap-2 h-screen max-h-screen">
          {currentQuestion?.answers?.map((a: Answer) => (
            <button
              key={a.id}
              onClick={() => handleSubmit(a.color)}
              className={cn(
                "w-full h-full rounded-lg shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center p-4 relative overflow-hidden",
                "text-white", // Always white text as requested
                "disabled:cursor-not-allowed disabled:opacity-100 disabled:active:scale-100", // don't fade out selected one
                a.color === "red"
                  ? "bg-game-red"
                  : a.color === "blue"
                    ? "bg-game-blue"
                    : a.color === "yellow"
                      ? "bg-game-yellow"
                      : "bg-game-green",
                selectedAnswer === a.color
                  ? "ring-4 ring-white scale-105 brightness-110 z-10 shadow-2xl"
                  : selectedAnswer
                    ? "opacity-50 scale-95 grayscale-[0.5]" // Dim others
                    : "",
              )}
            >
              {(() => {
                const Icon = shapes[a.color as keyof typeof shapes] || Circle;
                return <Icon className="w-16 h-16 mb-4 fill-current" />;
              })()}
              {a.text && (
                <span className="text-xl font-bold text-center leading-tight">
                  {a.text}
                </span>
              )}
            </button>
          )) ||
            answerColors.map((c) => (
              <button
                key={c.value}
                className={cn(
                  "w-full h-full rounded-lg bg-gray-300 animate-pulse",
                )}
              />
            ))}
        </div>
      );
    }

    // Submitted state (waiting for others)
    return (
      <div className="min-h-screen bg-purple-900 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Answer Submitted</h1>
          {/* Visual Feedback of Selection */}
          {selectedAnswer && typeof selectedAnswer === "string" && (
            <div
              className={cn(
                "w-24 h-24 rounded-full mx-auto shadow-2xl border-4 border-white/20 flex items-center justify-center mb-6",
                selectedAnswer === "red"
                  ? "bg-game-red"
                  : selectedAnswer === "blue"
                    ? "bg-game-blue"
                    : selectedAnswer === "yellow"
                      ? "bg-game-yellow"
                      : selectedAnswer === "green"
                        ? "bg-game-green"
                        : "bg-white/10",
              )}
            >
              {(() => {
                const Icon = shapes[selectedAnswer as keyof typeof shapes];
                return Icon ? (
                  <Icon className="w-12 h-12 text-white fill-current" />
                ) : null;
              })()}
            </div>
          )}

          <div className="text-xl opacity-80">Waiting for others...</div>
          <div
            className="spinner-border animate-spin inline-block w-8 h-8 border-4 border-t-white border-white/20 rounded-full"
            role="status"
          ></div>
        </div>
      </div>
    );
  }

  if (gameState.status === "finished") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-5xl font-black text-purple-500">Game Over</h1>
        <p className="text-2xl mt-4">Thanks for playing!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-900 flex items-center justify-center text-white font-bold text-2xl">
      Loading...
    </div>
  );
}
