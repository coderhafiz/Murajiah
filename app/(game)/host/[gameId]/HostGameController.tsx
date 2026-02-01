"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import LoadingModal from "@/components/ui/LoadingModal";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

import {
  submitAnswer,
  getRoundAnswers,
  getAnswerCount,
  resetRound,
} from "@/app/actions/play";
import { endGame } from "@/app/actions/game";
import {
  useGameStore,
  Game,
  Question,
  Answer,
  Player,
} from "@/app/store/useGameStore";

type Quiz = {
  title: string;
};

export default function HostGameController({
  game: initialGame,
  quiz,
  questions: initialQuestions,
}: {
  game: Game;
  quiz: Quiz;
  questions: Question[];
}) {
  const supabase = createClient();

  const {
    players,
    setPlayers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    currentQuestionStatus,
    setCurrentQuestionStatus,
    timeLeft,
    setTimeLeft,
    setAnswersReceivedCount,
    answersCount,
    setAnswersCount,
    lastRoundResults,
    setLastRoundResults,
    setGame,
    setQuestions,
  } = useGameStore();

  // Sync props to store
  useEffect(() => {
    setGame(initialGame);
    setQuestions(initialQuestions);
  }, [initialGame, initialQuestions, setGame, setQuestions]);

  // Use initialGame for static properties like ID, or accessor
  const game = initialGame;

  const [status, setStatus] = useState(game.status); // 'waiting', 'active', 'finished'
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processing...");
  // Note: players, currentQuestionIndex etc are now from store

  const [lastClickedAnswerId, setLastClickedAnswerId] = useState<string | null>(
    null,
  );
  const [answerText, setAnswerText] = useState("");
  const [puzzleOrder, setPuzzleOrder] = useState<any[]>([]);

  // Initialize Puzzle Order

  // Local state for preview mode
  const previewAnswers = useRef<{
    [playerId: string]: { answer: Answer; elapsed: number };
  }>({});
  const questionStartTime = useRef<number | null>(null);

  // Access store questions
  const questions = useGameStore((state) => state.questions);
  const currentQ = questions[currentQuestionIndex];

  // Initialize Puzzle Order
  useEffect(() => {
    if (currentQ?.question_type === "puzzle") {
      // Shuffle back enabled for Preview/Host
      setPuzzleOrder([...currentQ.answers].sort(() => Math.random() - 0.5));
    }
  }, [currentQ]);

  const startQuestion = async () => {
    console.log("Starting Question...");
    const currentQ = questions[currentQuestionIndex];

    if (!currentQ) return;

    // 1. Optimistic UI Update: Immediate Feedback
    setTimeLeft(currentQ.time_limit || 20);
    setAnswersReceivedCount(0); // Reset count
    previewAnswers.current = {}; // Reset local answers
    setLastClickedAnswerId(null); // Reset visual feedback
    setCurrentQuestionStatus("answering");
    questionStartTime.current = Date.now(); // Start timer
    console.log("Question Started (Optimistic). Status set to answering.");

    // 2. Background Operations (Critical but hidden from UI latency)
    try {
      // Clear previous answers (Use Server Action for robustness)
      console.log("Resetting round answers...");
      const resetResult = await resetRound(game.id, currentQ.id);
      if (!resetResult.success) {
        console.error("Failed to reset round answers:", resetResult.error);
      }

      await supabase
        .from("games")
        .update({
          current_question_status: "answering",
        })
        .eq("id", game.id);
    } catch (err) {
      console.error("Error confirming question start:", err);
    }
  };

  const showResults = useCallback(async () => {
    setLoadingMessage("Processing...");
    setLoading(true); // Immediate visual feedback

    try {
      const currentQ = questions[currentQuestionIndex];
      // 1. Parallelize DB Update and Data Fetching
      const updateGamePromise = supabase
        .from("games")
        .update({
          current_question_status: "finished",
        })
        .eq("id", game.id);

      let answersPromise: Promise<{ answer_id: string; player_id?: string }[]>;

      if (game.is_preview) {
        // Local preview data
        const localAnswers = Object.entries(previewAnswers.current).map(
          ([pid, a]) => ({
            answer_id: a.answer.id,
            player_id: pid,
          }),
        );
        answersPromise = Promise.resolve(localAnswers);
      } else {
        // Live data fetch
        answersPromise = getRoundAnswers(currentQ?.id || "");
      }

      const [, fetchedAnswers] = await Promise.all([
        updateGamePromise,
        answersPromise,
      ]);

      const currentAnswers: { answer_id: string; player_id?: string }[] =
        fetchedAnswers;

      if (currentQ) {
        const counts = currentQ.answers.map((a: Answer) => {
          const count =
            currentAnswers.filter(
              (ans: { answer_id: string }) => ans.answer_id === a.id,
            ).length || 0;
          return {
            name: a.text,
            count: count,
            color: a.color,
            isCorrect: a.is_correct,
          };
        });
        setAnswersCount(counts);

        // Determine Correctness for each player (New Logic)
        const correctAnswers = currentQ.answers.filter((a) => a.is_correct);

        const newRoundResults: Record<string, boolean> = {};

        players.forEach((p) => {
          const playerAns = currentAnswers.find((a) => a.player_id === p.id);
          if (!playerAns) {
            newRoundResults[p.id] = false;
            return;
          }

          let isCorrect = false;
          if (game.is_preview) {
            const entry = previewAnswers.current[p.id];
            if (entry) {
              isCorrect = !!entry.answer.is_correct;
            }
          } else {
            isCorrect = !!(playerAns as any).is_correct;
          }
          newRoundResults[p.id] = isCorrect;
        });
        setLastRoundResults(newRoundResults);

        // --- Preview Mode Scoring Logic ---
        if (game.is_preview) {
          const updatedPlayers = players.map((p) => {
            const entry = previewAnswers.current[p.id];
            if (!entry) return p;

            const isCorrect = newRoundResults[p.id];

            if (isCorrect) {
              // 1000 points base
              const basePoints = 1000;
              const limit = currentQ.time_limit || 20;
              const safeElapsed = Math.min(Math.max(entry.elapsed, 0), limit);
              const ratio = safeElapsed / limit;
              const timeFactor = 1 - ratio / 2;

              const points = Math.round(basePoints * timeFactor);
              return { ...p, score: p.score + points };
            }
            return p;
          });

          setPlayers(updatedPlayers);
        }

        // Data ready: Switch view
        setCurrentQuestionStatus("scoreboard");
      }
    } catch (err) {
      console.error("Error showing results:", err);
    } finally {
      setLoading(false);
    }
  }, [
    currentQuestionIndex,
    game.id,
    game.is_preview,
    questions,
    supabase,
    players,
  ]);

  const showScoreboard = () => {
    setCurrentQuestionStatus("scoreboard");
  };

  const showChart = () => {
    setCurrentQuestionStatus("results");
  };

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const confirmFinishGame = () => {
    setConfirmModal({
      open: true,
      title: "End Game?",
      description:
        "Are you sure you want to end the game? This will calculate final scores.",
      onConfirm: finishGame,
    });
  };

  const finishGame = async () => {
    setLoadingMessage("Ending Game...");
    setLoading(true);
    if (game.is_preview) {
      // For previews, delete the game and data entirely
      await supabase.from("games").delete().eq("id", game.id);
    } else {
      await endGame(game.id);
    }

    // Show finished screen instead of auto-closing
    setStatus("finished");
    setLoading(false);
  };

  const nextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      // End Game
      if (game.is_preview) {
        await supabase.from("games").delete().eq("id", game.id);
      } else {
        await endGame(game.id);
      }

      setStatus("finished");
    } else {
      const nextQ = questions[nextIndex];
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestionStatus("intro");
      await supabase
        .from("games")
        .update({
          current_question_id: nextQ.id,
          current_question_status: "intro",
        })
        .eq("id", game.id);
    }
  };

  const startGame = async () => {
    // Optimistic UI Update
    setStatus("active");
    setCurrentQuestionIndex(0);
    setCurrentQuestionStatus("intro");

    try {
      await supabase
        .from("games")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
          current_question_id: questions[0]?.id || null,
          current_question_status: "intro",
        })
        .eq("id", game.id);
    } catch (err) {
      console.error("Error starting game:", err);
    }
  };

  // Track the Host's player ID permanently so we recognize them even if renamed
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(null);

  const handleAnswerClick = async (answer: Answer) => {
    if (currentQuestionStatus !== "answering") return;

    // Visual feedback immediately
    setLastClickedAnswerId(answer.id);

    if (game.is_preview) {
      if (players.length === 0) {
        alert("Add simulated players (bots) first to register answers!");
        return;
      }

      // Use the Host player if available, otherwise fallback to random
      const hostPlayer = players.find((p) => p.id === "host-player");
      const targetPlayer =
        hostPlayer || players[Math.floor(Math.random() * players.length)];

      // Calculate elapsed time locally for preview
      const now = Date.now();
      const start = questionStartTime.current || now;
      const elapsed = (now - start) / 1000;

      // Store strictly locally
      previewAnswers.current[targetPlayer.id] = { answer, elapsed };

      // Update counter
      setAnswersReceivedCount(Object.keys(previewAnswers.current).length);

      // Trigger End Round (User Request: Host answer = End Question)
      setTimeLeft(0);
      setTimeout(() => {
        showResults();
      }, 1000);
    } else {
      // Live Game Logic: Allow Host to answer as a player
      // 1. Try to find the host player by ID (if we are tracking a renamed one)
      // 2. Fallback to finding by reserved nickname "Host (You)"
      let hostPlayer = players.find((p) =>
        hostPlayerId ? p.id === hostPlayerId : p.nickname === "Host (You)",
      );

      if (!hostPlayer) {
        // Create Host Player on the fly if not exists
        const { data, error } = await supabase
          .from("players")
          .insert({
            game_id: game.id,
            nickname: "Host (You)",
            score: 0,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to create host player:", error);
          return;
        }
        hostPlayer = data;
      }

      if (hostPlayer) {
        // Remember this ID! If the host renames themselves to "Ali", we will still know "Ali" is the host (via this ID).
        if (hostPlayerId !== hostPlayer.id) {
          setHostPlayerId(hostPlayer.id);
        }

        const now = Date.now();
        const start = questionStartTime.current || now;
        const elapsed = (now - start) / 1000;

        // Fire-and-forget submission for instant UX
        submitAnswer(
          hostPlayer.id,
          game.id,
          questions[currentQuestionIndex].id,
          answer.color,
          elapsed,
        ).then((result) => {
          if (!result.success) {
            console.error(
              "Failed to submit host answer:",
              (result as { error: string }).error,
            );
          }
        });

        // Trigger End Round (User Request: Host answer = End Question)
        setTimeLeft(0);
        setTimeout(() => {
          showResults();
        }, 1000);
      }
    }
  };

  const handleTextSubmit = async () => {
    if (currentQuestionStatus !== "answering" || !answerText.trim()) return;

    const payload = JSON.stringify({
      type: "type_answer",
      value: answerText.trim(),
    });

    if (game.is_preview) {
      if (players.length === 0) {
        alert("Add simulated players (bots) first to register answers!");
        return;
      }

      // Use the Host player if available, otherwise fallback to random
      const hostPlayer = players.find((p) => p.id === "host-player");
      const targetPlayer =
        hostPlayer || players[Math.floor(Math.random() * players.length)];

      // Calculate elapsed time locally for preview
      const now = Date.now();
      const start = questionStartTime.current || now;
      const elapsed = (now - start) / 1000;

      // Mock answer object for preview storage
      // Validate locally for Preview
      const currentQ = questions[currentQuestionIndex];
      const matchingAnswer = currentQ.answers.find(
        (a) =>
          a.text &&
          a.text.trim().toLowerCase() === answerText.trim().toLowerCase(),
      );

      // Use real answer if correct, otherwise mock wrong answer
      const mockAnswer: Answer = matchingAnswer || {
        id: "wrong-answer-" + Date.now(),
        text: answerText,
        is_correct: false,
        color: "gray",
      };

      // Store strictly locally
      previewAnswers.current[targetPlayer.id] = {
        answer: mockAnswer,
        elapsed,
      };

      // Update counter
      setAnswersReceivedCount(Object.keys(previewAnswers.current).length);
      setAnswerText(""); // Clear input

      // Trigger End Round (User Request: Host answer = End Question)
      setTimeLeft(0);
      setTimeout(() => {
        showResults();
      }, 1000);
    } else {
      // Live Game Logic
      let hostPlayer = players.find((p) =>
        hostPlayerId ? p.id === hostPlayerId : p.nickname === "Host (You)",
      );

      if (!hostPlayer) {
        // Create Host Player on the fly if not exists
        const { data, error } = await supabase
          .from("players")
          .insert({
            game_id: game.id,
            nickname: "Host (You)",
            score: 0,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to create host player:", error);
          return;
        }
        hostPlayer = data;
      }

      if (hostPlayer) {
        if (hostPlayerId !== hostPlayer.id) {
          setHostPlayerId(hostPlayer.id);
        }

        const now = Date.now();
        const start = questionStartTime.current || now;
        const elapsed = (now - start) / 1000;

        const result = await submitAnswer(
          hostPlayer.id,
          game.id,
          questions[currentQuestionIndex].id,
          payload,
          elapsed,
        );

        if (!result.success) {
          console.error(
            "Failed to submit host answer:",
            (result as { error: string }).error,
          );
        } else {
          setAnswerText(""); // Clear input on success
          // Trigger End Round (User Request: Host answer = End Question)
          setTimeLeft(0);
          setTimeout(() => {
            showResults();
          }, 1000);
        }
      }
    }
  };

  const handlePuzzleSubmit = async () => {
    if (currentQuestionStatus !== "answering") return;

    const payload = JSON.stringify({
      type: "puzzle",
      value: puzzleOrder.map((i) => i.id),
    });

    if (game.is_preview) {
      if (players.length === 0) {
        alert("Add simulated players (bots) first to register answers!");
        return;
      }
      const hostPlayer = players.find((p) => p.id === "host-player");
      const targetPlayer =
        hostPlayer || players[Math.floor(Math.random() * players.length)];

      const now = Date.now();
      const start = questionStartTime.current || now;
      const elapsed = (now - start) / 1000;

      // Validate locally for Preview (Puzzle)
      const currentQ = questions[currentQuestionIndex];
      const submittedIds = puzzleOrder.map((i) => i.id);
      const expectedIds = [...currentQ.answers]
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map((a) => a.id);

      const isOrderCorrect =
        submittedIds.length === expectedIds.length &&
        submittedIds.every((id, index) => id === expectedIds[index]);

      const mockAnswer: Answer = {
        id: "puzzle-answer",
        text: "Puzzle Submission",
        is_correct: isOrderCorrect,
        color: isOrderCorrect ? "green" : "red",
      };

      previewAnswers.current[targetPlayer.id] = {
        answer: mockAnswer,
        elapsed,
      };

      setAnswersReceivedCount(Object.keys(previewAnswers.current).length);

      // Trigger End Round (User Request: Host answer = End Question)
      setTimeLeft(0);
      setTimeout(() => {
        showResults();
      }, 1000);
    } else {
      // Live Game
      let hostPlayer = players.find((p) =>
        hostPlayerId ? p.id === hostPlayerId : p.nickname === "Host (You)",
      );

      if (!hostPlayer) {
        const { data, error } = await supabase
          .from("players")
          .insert({
            game_id: game.id,
            nickname: "Host (You)",
            score: 0,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to create host player:", error);
          return;
        }
        hostPlayer = data;
      }

      if (hostPlayer) {
        if (hostPlayerId !== hostPlayer.id) setHostPlayerId(hostPlayer.id);

        const now = Date.now();
        const start = questionStartTime.current || now;
        const elapsed = (now - start) / 1000;

        const result = await submitAnswer(
          hostPlayer.id,
          game.id,
          questions[currentQuestionIndex].id,
          payload,
          elapsed,
        );

        if (!result.success) {
          console.error(
            "Failed to submit puzzle:",
            (result as { error: string }).error,
          );
        }

        // Trigger End Round (User Request: Host answer = End Question)
        setTimeLeft(0);
        setTimeout(() => {
          showResults();
        }, 1000);
      }
    }
  };

  // Bot Logic
  const addBots = async (count: number) => {
    const botNames = [
      "SmartBot",
      "QuizMaster",
      "Turbo",
      "Slowpoke",
      "Genius",
      "Beginner",
      "MurajiahFan",
      "Pixel",
      "Brainy",
      "Speedy",
    ];
    const newBots: Player[] = [];

    for (let i = 0; i < count; i++) {
      const name = `${botNames[Math.floor(Math.random() * botNames.length)]}_${Math.floor(Math.random() * 999)}`;
      newBots.push({
        game_id: game.id,
        nickname: name,
        score: 0,
        id: crypto.randomUUID(), // Generate local ID
      });
    }

    if (game.is_preview) {
      console.log("Adding local bots", newBots);
      setPlayers((prev) => [...prev, ...newBots]);
    } else {
      const { error } = await supabase.from("players").insert(newBots);
      if (error) console.error("Error adding bots:", error);
    }
  };

  useEffect(() => {
    if (!game.is_preview || currentQuestionStatus !== "answering") return;

    // Simulate bot answers
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    console.log("Bot answering effect triggered. Players:", players.length);

    // Only bots that haven't answered yet should answer
    const botAnswering = async () => {
      // Find bots (for simplicity, we assume players with '_' are robots or we just target all and DB handles unique constraints)
      // Actually, let's just fetch all players for this game
      const gamePlayers = players; // Use local players state

      if (!gamePlayers || gamePlayers.length === 0) {
        console.log("No players to answer.");
        return;
      }

      gamePlayers.forEach(async (player) => {
        // Skip host player - they must answer manually
        if (player.id === "host-player") return;

        // Simple heuristic: bots answer after 1-3 seconds for snappier preview
        const delay = Math.random() * 2000 + 1000;
        console.log(`Scheduling answer for ${player.nickname} in ${delay}ms`);

        setTimeout(() => {
          console.log(`Executing answer for ${player.nickname}`);
          // Check if still answering
          if (currentQuestionStatus !== "answering") {
            console.log("Skipping answer - not answering status");
            return;
          }

          // Check if already answered locally
          if (previewAnswers.current[player.id]) return;

          let answerValue: Answer | undefined; // Use the Answer object locally

          if (currentQ.question_type === "type_answer") {
            // Not supported in this simplified local bot logic yet, default to first answer
            answerValue = currentQ.answers[0];
          } else if (currentQ.question_type === "puzzle") {
            // Just pick one for now
            answerValue = currentQ.answers[0];
          } else {
            // Random choice
            answerValue =
              currentQ.answers[
                Math.floor(Math.random() * currentQ.answers.length)
              ];
          }

          if (answerValue) {
            // Calculate simulated elapsed time based on delay
            // delay is in ms, we want seconds.
            // In reality, bot "started" waiting when effect ran, which is right as question started answering.
            // So delay approx equals elapsed time.
            const elapsed = delay / 1000;

            previewAnswers.current[player.id] = {
              answer: answerValue,
              elapsed,
            };
            setAnswersReceivedCount(Object.keys(previewAnswers.current).length);

            /*
            if (
              players.length > 0 &&
              Object.keys(previewAnswers.current).length >= players.length
            ) {
              setTimeout(() => {
                showResults();
              }, 500);
            }
            */
          }
        }, delay);
      });
    };

    botAnswering();
  }, [
    currentQuestionStatus,
    currentQuestionIndex,
    game.id,
    game.is_preview,
    questions,
    supabase,
    players, // Added players dependency
  ]);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentQuestionStatus === "answering" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            showResults();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentQuestionStatus, timeLeft]); // showResults is stable enough (recreated on render but effect deps handle it?)
  // Actually showResults changes on every render.
  // This might cause infinite loop or effect re-triggering?
  // UseEffect depends on 'currentQuestionStatus' and 'timeLeft'.
  // We should NOT include showResults in dependency array if we want to avoid re-bind, but strict mode might complain.
  // Ideally wrap showResults in useCallback.
  // For now, I'll allow it. The effect re-runs when timeLeft changes? YES.
  // So interval is cleared and recreated every second. That is inefficient but works.

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("game_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${game.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPlayers((prev) => [...prev, payload.new as Player]);
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? (payload.new as Player) : p,
              ),
            );
          }
        },
      )
      .subscribe();

    const fetchPlayers = async () => {
      if (game.is_preview) {
        // Initialize with Host player for preview
        setPlayers([
          {
            id: "host-player",
            nickname: "You (Host)",
            game_id: game.id,
            score: 0,
          },
        ]);
        return;
      }

      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", game.id);
      if (data) setPlayers(data);
    };
    fetchPlayers();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id, supabase, game.is_preview]);

  // Track Answers for Auto-Advance
  useEffect(() => {
    if (currentQuestionStatus !== "answering") return;
    // Removed !game.is_preview check to allow live games to auto-advance too

    // Initial fetch of answers count for this question (recovery)
    const fetchCount = async () => {
      const { count } = await supabase
        .from("player_answers")
        .select("*", { count: "exact", head: true })
        .eq("game_id", game.id)
        .eq("question_id", questions[currentQuestionIndex]?.id);

      if (count !== null) setAnswersReceivedCount(count);
    };
    fetchCount();

    const channel = supabase
      .channel("answers_channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "player_answers",
          filter: `game_id=eq.${game.id}`,
        },
        (payload) => {
          // Verify it's for current question (though filter theoretically handles game_id, we need question check if multiple active? No, just one active question usually)
          // But safer to check question_id
          if (payload.new.question_id === questions[currentQuestionIndex]?.id) {
            setAnswersReceivedCount((prev) => prev + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    game.id,
    currentQuestionStatus,
    currentQuestionIndex,
    questions,
    players.length,
    showResults,
    supabase,
  ]);

  // Polling for answers (Reliable fallback for RLS limitations)
  useEffect(() => {
    if (game.is_preview || currentQuestionStatus !== "answering") return;
    if (players.length === 0) return;

    const pollAnswers = async () => {
      const currentQ = questions[currentQuestionIndex];
      if (!currentQ) return;

      const count = await getAnswerCount(currentQ.id);
      setAnswersReceivedCount(count); // Trust exact count from server
    };

    const interval = setInterval(pollAnswers, 5000); // Check every 5s (reduced from 0.5s to prevent server overload)
    pollAnswers(); // Initial check

    return () => clearInterval(interval);
  }, [
    currentQuestionStatus,
    currentQuestionIndex,
    game.is_preview,
    questions,
    players.length,
  ]);

  // Check for Auto-Advance (REMOVED)
  /* 
  useEffect(() => {

  }, []); 
  */

  if (status === "waiting") {
    return (
      <div className="flex flex-col h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-black p-4 md:p-8 font-sans overflow-y-auto">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 md:gap-0">
          <div className="bg-white/10 p-4 rounded-xl text-white backdrop-blur-md w-full md:w-auto text-center md:text-left">
            <h2 className="text-xl font-bold opacity-80">Join at</h2>
            <div className="text-3xl font-black">murajiah.app</div>
            <div className="text-sm opacity-60">(or wherever)</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-2xl text-center w-full max-w-sm md:min-w-[300px] animate-pulse">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Game PIN:</h2>
            <div className="text-4xl md:text-6xl font-black text-gray-900 tracking-widest break-all">
              {game.pin}
            </div>
          </div>

          <div className="bg-white/10 p-4 rounded-xl text-white backdrop-blur-md w-full md:w-auto text-center md:text-right">
            <div className="text-4xl font-black text-center">
              {players.length}
            </div>
            <div className="text-sm font-bold uppercase tracking-widest opacity-70">
              Players
            </div>
          </div>
        </div>

        {game.is_preview && (
          <div className="mt-8 flex justify-center gap-4">
            <Button
              variant="secondary"
              onClick={() => addBots(1)}
              className="bg-purple-500 hover:bg-purple-600 text-white border-none shadow-lg"
            >
              Add 1 Bot
            </Button>
            <Button
              variant="secondary"
              onClick={() => addBots(5)}
              className="bg-purple-500 hover:bg-purple-600 text-white border-none shadow-lg"
            >
              Add 5 Bots
            </Button>
            <Button
              variant="outline"
              onClick={() => setPlayers([])}
              className="bg-transparent text-white border-white/20 hover:bg-white/20 hover:!text-white"
            >
              Clear Room
            </Button>
          </div>
        )}

        <div className="flex-1 my-12 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnimatePresence>
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="bg-black/30 text-white font-bold text-xl p-4 rounded-lg flex items-center gap-3 backdrop-blur-sm border border-white/10"
                >
                  <div className="w-10 h-10 rounded-full bg-linear-to-tr from-pink-500 to-yellow-500 flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  {player.nickname}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {players.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <h3 className="text-3xl font-bold">Waiting for players...</h3>
              <div className="loader mt-4"></div>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-xl md:text-3xl font-bold text-white/80 text-center md:text-left">
            {quiz.title}
          </h1>
          <Button
            size="lg"
            onClick={startGame}
            disabled={players.length === 0}
            className={cn(
              "text-2xl px-12 py-8 transition-all",
              players.length > 0
                ? "animate-bounce shadow-xl shadow-purple-500/50"
                : "opacity-50",
            )}
          >
            Start Game
          </Button>
        </div>
      </div>
    );
  }

  // Active Game View

  if (!currentQ || status === "finished") {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const top3 = sortedPlayers.slice(0, 3);
    const runnersUp = sortedPlayers.slice(3);

    return (
      <div className="flex flex-col h-screen bg-gray-900 overflow-hidden relative">
        {/* Confetti Effect (Simple CSS or just a background for now) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-gray-900 to-black z-0" />

        <div className="relative z-10 flex flex-col items-center h-full p-8">
          <h1 className="text-6xl font-black text-white mb-2 uppercase tracking-tight drop-shadow-lg">
            Podium
          </h1>
          <p className="text-purple-300 text-xl font-bold mb-12">
            The Final Results
          </p>

          <div className="flex-1 flex items-end justify-center w-full max-w-4xl gap-2 md:gap-4 mb-12 min-h-0 transform scale-90 md:scale-100 origin-bottom">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="flex flex-col items-center w-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: [20, 40, 0], // Anticipation: Drop lower before rising
                    scale: [1, 0.9, 1], // Anticipation: Squash
                  }}
                  transition={{
                    duration: 0.8,
                    times: [0, 0.4, 1], // 40% anticipation
                    delay: 1.5,
                    ease: "backOut", // Overshoot at end
                  }}
                  className="text-white font-bold text-2xl mb-4 text-center origin-bottom"
                >
                  {top3[1].nickname}
                </motion.div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "12rem" }} // h-48
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 12,
                    delay: 1.9, // Sync with end of anticipation
                  }}
                  className="w-full bg-gray-400 rounded-t-lg shadow-2xl flex flex-col items-center justify-end p-4 border-t-4 border-gray-300 origin-bottom overflow-hidden"
                >
                  <div className="text-5xl font-black text-white/20 mb-2">
                    2
                  </div>
                  <div className="bg-white/20 px-4 py-1 rounded-full text-white font-bold">
                    {top3[1].score}
                  </div>
                </motion.div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="flex flex-col items-center w-1/3 z-20">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    scale: [0.5, 0.4, 1.2, 1], // Anticipation (0.4) -> Overstretch (1.2) -> Settle (1)
                    y: [0, 30, 0], // Anticipation: Deep drop
                  }}
                  transition={{
                    delay: 2.5,
                    duration: 1.0,
                    times: [0, 0.3, 0.7, 1],
                    // type: "spring", // REMOVED: Spring doesn't support 4 keyframes
                    ease: "easeInOut",
                  }}
                  className="mb-6 relative origin-bottom"
                >
                  <div className="text-yellow-400 font-black text-4xl text-center drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                    {top3[0].nickname}
                  </div>
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 3.5, type: "spring", bounce: 0.6 }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 text-5xl filter drop-shadow-lg"
                  >
                    👑
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "16rem" }} // h-64
                  transition={{
                    type: "spring",
                    stiffness: 140, // Stiffer for more power
                    damping: 10,
                    delay: 3.0, // Delayed for Wind-up
                  }}
                  className="w-full bg-yellow-500 rounded-t-lg shadow-[0_0_50px_rgba(234,179,8,0.3)] flex flex-col items-center justify-end p-4 border-t-8 border-yellow-300 relative overflow-hidden origin-bottom"
                >
                  <div className="absolute inset-0 bg-linear-to-b from-yellow-400/20 to-transparent" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 3.2, duration: 0.5 }}
                  >
                    <User className="absolute top-4 left-1/2 -translate-x-1/2 text-yellow-800/20 w-24 h-24" />
                  </motion.div>

                  <div className="text-7xl font-black text-white/90 mb-4 drop-shadow-md z-10">
                    1
                  </div>
                  <div className="bg-black/20 px-6 py-2 rounded-full text-white font-black text-2xl shadow-inner backdrop-blur-sm z-10">
                    {top3[0].score}
                  </div>
                </motion.div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="flex flex-col items-center w-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: [20, 30, 0], // Anticipation
                    scale: [1, 0.9, 1], // Anticipation
                  }}
                  transition={{
                    duration: 0.6,
                    times: [0, 0.4, 1],
                    delay: 0.5,
                    ease: "backOut",
                  }}
                  className="text-orange-200 font-bold text-xl mb-4 text-center origin-bottom"
                >
                  {top3[2].nickname}
                </motion.div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "8rem" }} // h-32
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 12,
                    delay: 0.9,
                  }}
                  className="w-full bg-orange-700 rounded-t-lg shadow-2xl flex flex-col items-center justify-end p-4 border-t-4 border-orange-500 origin-bottom overflow-hidden"
                >
                  <div className="text-5xl font-black text-white/20 mb-2">
                    3
                  </div>
                  <div className="bg-white/20 px-4 py-1 rounded-full text-white font-bold">
                    {top3[2].score}
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Runners Up List */}
          {runnersUp.length > 0 && (
            <div className="w-full max-w-2xl bg-white/5 rounded-xl border border-white/10 p-4 overflow-y-auto max-h-[200px] backdrop-blur-sm">
              <h3 className="text-white/50 text-sm font-bold uppercase mb-4 tracking-widest pl-2">
                Runners Up
              </h3>
              {runnersUp.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors text-white"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-white/40 w-6 text-right">
                      {i + 4}
                    </span>
                    <span className="font-bold">{p.nickname}</span>
                  </div>
                  <span className="font-mono opacity-70">{p.score}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4 mt-8 z-20">
            <Button
              onClick={() => window.close()}
              variant="destructive"
              className="gap-2"
            >
              Close Window
            </Button>
            <Button
              onClick={() => (window.location.href = "/dashboard")}
              variant="outline"
              className="bg-transparent border-white/20 text-white hover:bg-white/20 hover:!text-white"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const colorsMap: { [key: string]: string } = {
    red: "bg-game-red",
    blue: "bg-game-blue",
    yellow: "bg-game-yellow",
    green: "bg-game-green",
  };

  const chartColorsMap: { [key: string]: string } = {
    red: "#EF4444", // Tailwind red-500
    blue: "#3B82F6", // Tailwind blue-500
    yellow: "#F59E0B", // Tailwind yellow-500
    green: "#10B981", // Tailwind green-500
  };

  const SortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-screen bg-background p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 md:mb-8 gap-4">
        <div className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold">
          {currentQuestionIndex + 1} / {questions.length}
        </div>
        <div className="flex gap-2">
          {currentQuestionStatus === "intro" && (
            <Button onClick={startQuestion}>Start Question</Button>
          )}
          {currentQuestionStatus === "answering" && (
            <Button onClick={showResults}>Show Results</Button>
          )}
          {currentQuestionStatus === "results" && (
            <Button onClick={showScoreboard}>Scoreboard</Button>
          )}
          {currentQuestionStatus === "scoreboard" && (
            <Button onClick={nextQuestion}>
              {currentQuestionIndex === questions.length - 1
                ? "Finish"
                : "Next Question"}
            </Button>
          )}
          <Button variant="destructive" onClick={confirmFinishGame}>
            End Game
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8 overflow-hidden">
        {currentQuestionStatus === "intro" && (
          <div className="bg-white p-12 rounded-3xl shadow-xl w-full max-w-5xl text-center min-h-[300px] flex items-center justify-center relative overflow-hidden">
            {/* Points Badge */}
            {currentQ.points_multiplier > 1 && (
              <div className="absolute top-6 right-6 bg-yellow-400 text-yellow-900 font-black px-4 py-2 rounded-full text-xl shadow-lg border-2 border-yellow-500 animate-pulse">
                x2 POINTS
              </div>
            )}
            <h1 className="text-2xl md:text-5xl font-black text-gray-800 leading-tight">
              {currentQ?.title}
            </h1>
          </div>
        )}

        {currentQuestionStatus === "answering" && (
          <>
            <div className="bg-white p-12 rounded-3xl shadow-xl w-full max-w-5xl text-center min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
              {/* Timer Bar */}
              <div
                className="absolute bottom-0 left-0 h-4 bg-purple-600 transition-all duration-1000 ease-linear"
                style={{
                  width: `${(timeLeft / (currentQ?.time_limit || 20)) * 100}%`,
                }}
              />
              <div className="absolute top-6 right-6 bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center font-black text-2xl text-gray-800 shadow-inner">
                {timeLeft}
              </div>

              <h1 className="text-2xl md:text-5xl font-black text-gray-800 leading-tight relative z-10">
                {currentQ?.title}
              </h1>

              {/* Voice Question Audio */}
              {currentQ?.question_type === "voice" && currentQ.media_url && (
                <audio controls autoPlay className="mt-8 z-10">
                  <source src={currentQ.media_url} />
                  Your browser does not support the audio element.
                </audio>
              )}
            </div>

            {/* Answers Grid - Handle different types layout */}
            {currentQ?.question_type === "type_answer" ||
            (currentQ?.question_type === "voice" &&
              currentQ.answer_format === "text") ? (
              <div className="w-full max-w-4xl p-8 bg-gray-200 rounded-xl text-center text-2xl font-bold text-gray-800 flex flex-col items-center gap-4">
                <div>Players are typing...</div>
                {(game.is_preview ||
                  players.some(
                    (p) => p.id === hostPlayerId || p.nickname === "Host (You)",
                  )) && (
                  <div className="flex gap-2 w-full max-w-md mt-4">
                    <Input
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Type your answer..."
                      className="text-lg h-12 bg-white"
                      onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                    />
                    <Button onClick={handleTextSubmit} size="lg">
                      Send
                    </Button>
                  </div>
                )}
              </div>
            ) : currentQ?.question_type === "puzzle" ? (
              <div className="w-full max-w-4xl bg-gray-200 rounded-xl flex flex-col h-[500px] overflow-hidden relative">
                <div className="p-4 text-center text-2xl font-bold text-gray-800 shrink-0 bg-gray-200 z-10">
                  Players are reordering...
                </div>

                <div className="flex-1 overflow-y-auto p-4 content-center">
                  {(game.is_preview ||
                    players.some(
                      (p) =>
                        p.id === hostPlayerId || p.nickname === "Host (You)",
                    )) && (
                    <div className="w-full flex flex-col items-center">
                      <Reorder.Group
                        axis="y"
                        values={puzzleOrder}
                        onReorder={setPuzzleOrder} // Using generic handler from framer-motion which updates state
                        className="flex flex-col gap-2 relative z-10 items-center w-full max-w-lg"
                      >
                        {puzzleOrder.map((item) => (
                          <Reorder.Item
                            key={item.id}
                            value={item}
                            className="w-full cursor-grab active:cursor-grabbing"
                          >
                            <div
                              className={cn(
                                "p-4 rounded-xl text-white font-bold text-xl shadow-md flex items-center justify-between",
                                item.color === "red"
                                  ? "bg-red-500"
                                  : item.color === "blue"
                                    ? "bg-blue-500"
                                    : item.color === "yellow"
                                      ? "bg-yellow-500"
                                      : "bg-green-500",
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
                  )}
                </div>

                {(game.is_preview ||
                  players.some(
                    (p) => p.id === hostPlayerId || p.nickname === "Host (You)",
                  )) && (
                  <div className="p-4 bg-gray-300 shrink-0 flex justify-center">
                    <Button
                      onClick={handlePuzzleSubmit}
                      size="lg"
                      className="w-full max-w-xs text-lg"
                    >
                      Submit Order
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 w-full max-w-6xl h-64">
                {currentQ?.answers.map((a: Answer, i: number) => (
                  <div
                    key={i}
                    onClick={() => handleAnswerClick(a)}
                    className={cn(
                      "rounded-xl p-4 md:p-8 flex flex-col items-center justify-center text-xl md:text-3xl font-bold shadow-lg transition-all relative overflow-hidden",
                      "text-white", // Always white text
                      colorsMap[a.color as keyof typeof colorsMap],
                      currentQuestionStatus === "answering"
                        ? "cursor-pointer hover:scale-[1.02] active:scale-95 hover:brightness-110"
                        : "",
                      lastClickedAnswerId === a.id
                        ? "ring-4 ring-white scale-105 brightness-125 transition-all duration-200"
                        : "", // Visual feedback
                    )}
                  >
                    {/* Audio Answer Support */}
                    {currentQ?.answer_format === "audio" && a.media_url && (
                      <div
                        className="w-full mb-4 z-20 relative bg-black/20 rounded-lg p-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <audio
                          controls
                          src={a.media_url}
                          className="w-full h-8"
                        />
                      </div>
                    )}
                    <span className="text-center">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {currentQuestionStatus === "results" && (
          <div className="w-full max-w-6xl mx-auto flex flex-col h-full justify-end pb-20">
            {/* Results Header */}
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl mb-8 text-center self-center w-auto">
              <h2 className="text-4xl font-black text-white drop-shadow-md">
                Results
              </h2>
            </div>

            <div className="flex-1 w-full min-h-[400px] flex items-end">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={answersCount}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      color: "white",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="count"
                      position="top"
                      fill="white"
                      fontSize={24}
                      fontWeight="bold"
                    />
                    {answersCount.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          chartColorsMap[
                            entry.color as keyof typeof chartColorsMap
                          ] || "#8884d8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend at bottom */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {answersCount.map((entry, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "w-full h-3 rounded-full",
                      colorsMap[entry.color as keyof typeof colorsMap],
                    )}
                  ></div>
                  <span className="text-white font-bold opacity-80 text-sm truncate w-full text-center">
                    {entry.name}
                  </span>
                  {entry.isCorrect && (
                    <span className="text-green-400 text-xs font-bold">
                      ✓ Correct
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Show Correct Order for Puzzle */}
            {currentQ?.question_type === "puzzle" && (
              <div className="mt-8 w-full">
                <h3 className="text-2xl font-bold text-center mb-6 text-gray-400 uppercase tracking-widest">
                  Correct Order
                </h3>
                <div className="flex flex-wrap gap-4 justify-center max-w-4xl mx-auto p-8 rounded-3xl bg-gray-50 border-4 border-dashed border-gray-200">
                  {currentQ.answers
                    .sort(
                      (a: any, b: any) =>
                        (a.order_index || 0) - (b.order_index || 0),
                    )
                    .map((a: Answer, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "px-8 py-4 rounded-2xl text-white font-black text-2xl shadow-lg transform transition-transform border-b-8",
                          colorsMap[a.color as keyof typeof colorsMap],
                        )}
                      >
                        {a.text}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentQuestionStatus === "scoreboard" && (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center h-full">
            <div className="mb-4 text-center shrink-0">
              <h2 className="text-4xl font-black text-purple-600 mb-2">
                Scoreboard
              </h2>
              {/* Show Correct Answer Banner */}
              <div className="mb-4 bg-green-100 text-green-800 px-6 py-3 rounded-lg border-2 border-green-200 inline-block shadow-sm">
                <span className="font-bold uppercase text-xs tracking-widest text-green-600 block mb-1">
                  Correct Answer
                </span>
                <span className="text-xl font-black">
                  {questions[currentQuestionIndex]?.answers
                    .filter((a) => a.is_correct)
                    .map((a) => a.text)
                    .join(", ")}
                </span>
              </div>
              <p className="text-gray-500 font-bold">Leaderboard</p>
            </div>

            <div className="w-full flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
              <AnimatePresence>
                {SortedPlayers.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white p-4 rounded-xl shadow-md flex items-center justify-between border-l-8 border-purple-500"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                        {index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-gray-800">
                          {player.nickname}
                        </span>
                        {/* Show Correct/Wrong Indicator */}
                        {lastRoundResults[player.id] !== undefined && (
                          <span
                            className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-full w-fit mt-1",
                              lastRoundResults[player.id]
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-red-100 text-red-700 border border-red-200",
                            )}
                          >
                            {lastRoundResults[player.id]
                              ? "✓ Correct"
                              : "✗ Wrong"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xl font-black text-purple-600">
                      {player.score}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {players.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  No players yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        onConfirm={confirmModal.onConfirm}
        confirmText="End Game"
        variant="destructive"
      />

      <LoadingModal open={loading} message={loadingMessage} />
    </div>
  );
}
