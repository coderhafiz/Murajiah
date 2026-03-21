export type Answer = {
  id?: string;
  text: string;
  is_correct: boolean;
  color?: string;
  order_index?: number;
  media_url?: string;
};

export type QuestionType =
  | "quiz"
  | "true_false"
  | "type_answer"
  | "puzzle"
  | "voice"
  | "poll";

export type Question = {
  id?: string;
  title: string;
  time_limit: number;
  answers: Answer[];
  question_type: QuestionType;
  media_url?: string;
  answer_format?: "choice" | "text" | "audio";
  points_multiplier?: number;
};

export type QuizUpdateData = {
  title: string;
  description: string | null;
  cover_image: string | null;
  visibility: "public" | "private";
  tags: string[];
  status: string;
};

export type QuestionInsert = {
  id?: string;
  quiz_id: string;
  title: string;
  time_limit: number;
  order_index: number;
  question_type: string;
  points_multiplier: number;
  media_url?: string;
  answer_format: string;
};

export type AnswerInsert = {
  id?: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  color?: string;
  order_index: number;
  media_url?: string;
};
