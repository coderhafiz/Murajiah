import { create } from "zustand";

// --- Types ---
export type Player = {
  id: string;
  nickname: string;
  game_id: string;
  score: number;
};

export type Answer = {
  id: string;
  text: string;
  is_correct: boolean;
  color: string;
  order_index?: number;
  media_url?: string;
};

export type Question = {
  id: string;
  title: string;
  time_limit: number;
  points_multiplier: number;
  answers: Answer[];
  question_type?:
    | "quiz"
    | "true_false"
    | "type_answer"
    | "puzzle"
    | "voice"
    | "poll";
  media_url?: string;
  answer_format?: "choice" | "text" | "audio";
};

export type Game = {
  id: string;
  title: string;
  pin: string;
  host_id: string;
  status: string;
  current_question_id: string | null;
  current_question_status: string;
  is_preview?: boolean;
};

interface GameState {
  // Data
  game: Game | null;
  players: Player[];
  questions: Question[];
  currentQuestionIndex: number;
  currentQuestionStatus: string; // 'intro', 'answering', 'scoreboard', 'finished'

  // Realtime Data
  answersReceivedCount: number;
  timeLeft: number;
  answersCount: {
    name: string;
    count: number;
    color: string;
    isCorrect: boolean;
  }[];
  lastRoundResults: Record<string, boolean>;

  // Actions
  setGame: (game: Game | null) => void;
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  setQuestions: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setCurrentQuestionStatus: (status: string) => void;

  setAnswersReceivedCount: (count: number | ((prev: number) => number)) => void;
  setTimeLeft: (time: number | ((prev: number) => number)) => void;
  setAnswersCount: (
    counts: {
      name: string;
      count: number;
      color: string;
      isCorrect: boolean;
    }[],
  ) => void;
  setLastRoundResults: (results: Record<string, boolean>) => void;

  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (player: Player) => void;

  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Initial State
  game: null,
  players: [],
  questions: [],
  currentQuestionIndex: 0,
  currentQuestionStatus: "intro",

  answersReceivedCount: 0,
  timeLeft: 0,
  answersCount: [],
  lastRoundResults: {},

  // Setters
  setGame: (game) => set({ game }),

  setPlayers: (updater) =>
    set((state) => ({
      players: typeof updater === "function" ? updater(state.players) : updater,
    })),

  setQuestions: (questions) => set({ questions }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  setCurrentQuestionStatus: (status) => set({ currentQuestionStatus: status }),

  setAnswersReceivedCount: (updater) =>
    set((state) => ({
      answersReceivedCount:
        typeof updater === "function"
          ? updater(state.answersReceivedCount)
          : updater,
    })),

  setTimeLeft: (updater) =>
    set((state) => ({
      timeLeft:
        typeof updater === "function" ? updater(state.timeLeft) : updater,
    })),

  setAnswersCount: (counts) => set({ answersCount: counts }),
  setLastRoundResults: (results) => set({ lastRoundResults: results }),

  // Helpers
  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  updatePlayer: (player) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === player.id ? player : p)),
    })),

  resetGame: () =>
    set({
      game: null,
      players: [],
      questions: [],
      currentQuestionIndex: 0,
      currentQuestionStatus: "intro",
      answersReceivedCount: 0,
      timeLeft: 0,
      answersCount: [],
      lastRoundResults: {},
    }),
}));
