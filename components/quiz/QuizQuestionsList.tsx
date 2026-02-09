"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  title: string;
  question_text?: string;
  question_type: string;
  order_index: number;
}

interface QuizQuestionsListProps {
  questions: Question[];
}

export default function QuizQuestionsList({
  questions,
}: QuizQuestionsListProps) {
  const [showAll, setShowAll] = useState(false);
  const displayedQuestions = showAll ? questions : questions.slice(0, 5);
  const remainingCount = questions.length - 5;

  if (questions.length === 0) {
    return <p className="text-muted-foreground italic">No questions yet.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold mb-4">
        Questions Preview ({displayedQuestions.length} shown)
      </h3>

      <div className="space-y-3">
        {displayedQuestions.map((q, i) => (
          <div
            key={q.id}
            className="p-4 rounded-xl border bg-card/50 flex gap-4 items-center group hover:bg-card transition-colors"
          >
            <span className="font-bold text-muted-foreground w-6 shrink-0">
              {q.order_index + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {q.title || q.question_text || "Untitled Question"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
                  {q.question_type?.replace("_", " ") || "Quiz"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {questions.length > 5 && (
        <Button
          variant="ghost"
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          {showAll ? (
            <span className="flex items-center gap-2">
              <ChevronUp className="w-4 h-4" /> Show Less
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ChevronDown className="w-4 h-4" /> + {remainingCount} more
              questions
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
