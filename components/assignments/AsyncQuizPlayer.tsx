"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Triangle,
  Hexagon,
  Square,
  Circle,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { submitAttempt } from "@/app/actions/assignments";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Reorder } from "framer-motion";

// Types (simplified from GameStore)
type Answer = {
  id: string;
  text: string;
  is_correct: boolean;
  color: string;
  order_index?: number;
};

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  answers: Answer[];
  time_limit?: number;
  points_multiplier?: number;
  media_url?: string;
  order_index: number;
};

type Assignment = {
  id: string;
  title: string;
  settings: {
    time_per_question?: number;
    shuffle_answers?: boolean;
    show_results?: boolean;
    attempts_allowed?: number;
  };
  quiz: {
    questions: Question[];
  };
};

type Attempt = {
  id: string;
  user_id: string;
  assignment_id: string;
};

const shapes = {
  red: Triangle,
  blue: Hexagon,
  yellow: Circle,
  green: Square,
};

export default function AsyncQuizPlayer({
  assignment,
  attempt,
}: {
  assignment: Assignment;
  attempt: Attempt;
}) {
  const router = useRouter();
  const [currentInfoIndex, setCurrentInfoIndex] = useState(0); // For instructions/start
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);

  // Feedback State
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<
    string | string[] | null
  >(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [puzzleOrder, setPuzzleOrder] = useState<Answer[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const questions = assignment.quiz.questions;
  const currentQuestion = questions[currentQuestionIndex];

  // Timer Setup (if enabled)
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (started && !finished && !showingFeedback) {
      // Initialize Timer if set
      const limit =
        assignment.settings.time_per_question || currentQuestion.time_limit;
      if (limit && limit > 0) {
        setTimeLeft(limit);
        const interval = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev === null) return null;
            if (prev <= 1) {
              clearInterval(interval);
              handleTimeUp();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        timerRef.current = interval;
        return () => clearInterval(interval);
      } else {
        setTimeLeft(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, currentQuestionIndex, showingFeedback]);

  // Puzzle Setup
  useEffect(() => {
    if (currentQuestion?.question_type === "puzzle") {
      setPuzzleOrder(
        [...currentQuestion.answers].sort(() => Math.random() - 0.5),
      );
    }
  }, [currentQuestion]);

  const handleTimeUp = () => {
    // Auto submit empty or wrong
    handleSubmit(null, true);
  };

  const calculatePoints = (
    question: Question,
    isCorrect: boolean,
    elapsed: number,
  ) => {
    if (!isCorrect) return 0;
    const base = 1000 * (question.points_multiplier || 1);
    // Simple decay if timer exists
    const limit =
      assignment.settings.time_per_question || question.time_limit || 20;
    if (limit > 0) {
      const safeElapsed = Math.min(elapsed, limit);
      const ratio = safeElapsed / limit;
      const timeFactor = 1 - ratio / 2;
      return Math.round(base * timeFactor);
    }
    return base;
  };

  const handleSubmit = async (value: any, isTimeUp = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Determine Correctness
    let isCorrect = false;
    const qType = currentQuestion.question_type;

    if (value) {
      if (qType === "type_answer") {
        const valStr = String(value).trim().toLowerCase();
        isCorrect = currentQuestion.answers.some(
          (a) => a.text.trim().toLowerCase() === valStr,
        );
      } else if (qType === "puzzle") {
        const submittedIds = Array.isArray(value) ? value : [];
        const sortedAnswers = [...currentQuestion.answers].sort(
          (a, b) => (a.order_index || 0) - (b.order_index || 0),
        );
        const expectedIds = sortedAnswers.map((a) => a.id);
        isCorrect =
          submittedIds.length === expectedIds.length &&
          submittedIds.every((id, i) => id === expectedIds[i]);
      } else {
        // Choice / TrueFalse
        // Check if selected ID/Color matches a correct answer
        isCorrect = currentQuestion.answers.some(
          (a) => (a.color === value || a.id === value) && a.is_correct,
        );
      }
    }

    // Calculate Points
    const limit =
      assignment.settings.time_per_question || currentQuestion.time_limit || 0;
    const elapsed = limit && timeLeft ? limit - timeLeft : 0; // Rough estimate
    const points = calculatePoints(currentQuestion, isCorrect, elapsed);

    // Update State
    setScore((prev) => prev + points);
    setTotalPoints((prev) => prev + points); // Simplified: Assuming "Possible Points" tracked separately or just user score
    setLastCorrect(isCorrect);

    // Record Answer
    const newAnswer = {
      question_id: currentQuestion.id,
      value,
      is_correct: isCorrect,
      points,
    };
    setUserAnswers((prev) => [...prev, newAnswer]);

    // Show Feedback?
    if (assignment.settings.show_results) {
      setShowingFeedback(true);
    } else {
      nextQuestion();
    }
  };

  const nextQuestion = () => {
    setShowingFeedback(false);
    setSelectedAnswer(null);
    setTypedAnswer("");
    // setTimeLeft... handles in effect

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishAssignment();
    }
  };

  const finishAssignment = async () => {
    setFinished(true);
    setSubmitting(true);

    // Final score is already in state `score`
    // We pass it to server
    try {
      await submitAttempt(attempt.id, userAnswers, score, score); // score, totalPoints (using score as total achieved for now)
      toast.success("Assignment Submitted!");
    } catch (error) {
      toast.error("Error submitting results.");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // --- RENDER ---

  if (finished) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700 p-8 text-center space-y-6">
          <h1 className="text-3xl font-black">Assignment Complete!</h1>
          <div className="space-y-2">
            <p className="text-slate-400 uppercase tracking-widest text-sm">
              Your Score
            </p>
            <div className="text-6xl font-black text-primary">{score}</div>
          </div>
          {submitting ? (
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="animate-spin" /> Saving results...
            </div>
          ) : (
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full text-lg h-12"
            >
              Back to Dashboard
            </Button>
          )}
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚀</span>
          </div>
          <div>
            <h1 className="text-3xl font-black mb-2">{assignment.title}</h1>
            <p className="text-slate-400">Ready to start?</p>
          </div>
          <Button
            size="lg"
            className="text-xl px-12 py-8 rounded-full font-black"
            onClick={() => setStarted(true)}
          >
            LET&apos;S GO!
          </Button>
        </div>
      </div>
    );
  }

  // --- FEEDBACK VIEW ---
  if (showingFeedback) {
    return (
      <div
        className={cn(
          "min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500",
          lastCorrect ? "bg-green-600" : "bg-red-600",
        )}
      >
        <div className="text-white text-center space-y-6 animate-in scale-in-90 duration-300">
          <div className="text-2xl font-bold uppercase tracking-widest opacity-80">
            {lastCorrect ? "Correct!" : "Incorrect"}
          </div>
          <div className="text-6xl font-black">
            {lastCorrect
              ? "+ " + (userAnswers[userAnswers.length - 1]?.points || 0)
              : "0"}{" "}
            Points
          </div>
          {!lastCorrect && (
            <div className="bg-black/20 p-4 rounded-xl">
              <p className="opacity-80 text-sm mb-1">Correct Answer:</p>
              <p className="font-bold text-xl">
                {currentQuestion.answers
                  .filter((a) => a.is_correct)
                  .map((a) => a.text || a.color)
                  .join(", ")}
              </p>
            </div>
          )}
          <Button
            variant="secondary"
            size="lg"
            className="w-full mt-8"
            onClick={nextQuestion}
          >
            Next Question <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // --- QUESTION VIEW ---

  const qType = currentQuestion?.question_type || "quiz";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="font-bold text-slate-500">
          Q{currentQuestionIndex + 1} / {questions.length}
        </div>
        {timeLeft !== null && (
          <div
            className={cn(
              "font-mono text-xl font-bold px-3 py-1 rounded-md",
              timeLeft <= 5
                ? "bg-red-100 text-red-600"
                : "bg-slate-100 dark:bg-slate-700",
            )}
          >
            {timeLeft}s
          </div>
        )}
        <div className="font-bold text-primary">{score} pts</div>
      </div>

      {/* Question Area */}
      <div className="flex-1 container max-w-4xl mx-auto p-4 flex flex-col justify-center space-y-8">
        <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-2xl shadow-sm text-center">
          <h2
            dir="auto"
            className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100"
          >
            {currentQuestion.question_text}
          </h2>
          {currentQuestion.media_url && (
            <div className="mt-6 rounded-xl overflow-hidden max-h-[300px] border-2 border-slate-100 dark:border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentQuestion.media_url}
                alt="Question Media"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>

        {/* Answer Area */}
        <div className="w-full">
          {qType === "type_answer" ? (
            <div className="space-y-4 max-w-md mx-auto">
              <Input
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="h-14 text-lg text-center font-bold"
                autoFocus
              />
              <Button
                className="w-full h-14 text-xl"
                onClick={() => handleSubmit(typedAnswer)}
              >
                Submit Answer
              </Button>
            </div>
          ) : qType === "puzzle" ? (
            <div className="space-y-4">
              <Reorder.Group
                axis="y"
                values={puzzleOrder}
                onReorder={setPuzzleOrder}
                className="flex flex-col gap-3"
              >
                {puzzleOrder.map((item) => (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <div
                      className={cn(
                        "p-4 rounded-xl text-white font-bold flex items-center justify-between shadow-sm",
                        item.color === "red"
                          ? "bg-red-500"
                          : item.color === "blue"
                            ? "bg-blue-500"
                            : item.color === "yellow"
                              ? "bg-yellow-500"
                              : "bg-green-500",
                      )}
                    >
                      <span
                        className="text-lg break-words w-full mr-2"
                        dir="auto"
                      >
                        {item.text}
                      </span>
                      <div className="flex flex-col gap-1 p-2 shrink-0">
                        <div className="w-6 h-0.5 bg-white/50" />
                        <div className="w-6 h-0.5 bg-white/50" />
                        <div className="w-6 h-0.5 bg-white/50" />
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              <Button
                className="w-full h-14 text-xl font-bold"
                onClick={() => handleSubmit(puzzleOrder.map((i) => i.id))}
              >
                Submit Order
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.answers.map((answer) => (
                <button
                  key={answer.id}
                  onClick={() => handleSubmit(answer.color || answer.id)}
                  className={cn(
                    "p-6 md:p-8 rounded-xl text-white font-bold text-lg md:text-xl shadow-lg transition-transform active:scale-95 flex items-center gap-4 text-left h-auto min-h-[100px]",
                    answer.color === "red"
                      ? "bg-red-500 hover:bg-red-600"
                      : answer.color === "blue"
                        ? "bg-blue-500 hover:bg-blue-600"
                        : answer.color === "yellow"
                          ? "bg-yellow-500 hover:bg-yellow-600"
                          : "bg-green-500 hover:bg-green-600",
                  )}
                >
                  {(() => {
                    const Icon =
                      shapes[answer.color as keyof typeof shapes] || Circle;
                    return <Icon className="w-8 h-8 shrink-0 fill-current" />;
                  })()}
                  <span dir="auto" className="break-words w-full">
                    {answer.text}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
