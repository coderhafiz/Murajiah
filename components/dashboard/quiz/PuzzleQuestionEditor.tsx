"use client";

import { useRef } from "react";
import { Reorder } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Define local types based on what QuizEditor uses
type Answer = {
  id?: string;
  text: string;
  is_correct: boolean;
  color?: string;
  order_index?: number;
  media_url?: string;
};

interface PuzzleQuestionEditorProps {
  answers: Answer[];
  qIndex: number;
  onUpdate: (newAnswers: Answer[]) => void;
  onUpdateText: (aIndex: number, text: string) => void;
}

export default function PuzzleQuestionEditor({
  answers,
  qIndex,
  onUpdate,
  onUpdateText,
}: PuzzleQuestionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = {
    red: "bg-game-red",
    blue: "bg-game-blue",
    yellow: "bg-game-yellow",
    green: "bg-game-green",
  };

  return (
    <div className="col-span-2">
      <p className="text-sm font-bold text-gray-500 mb-4">
        Arrange the steps in the correct order on the canvas:
      </p>
      <div className="flex gap-2 items-start">
        <div
          ref={containerRef}
          className="flex-1 bg-gray-100 p-6 rounded-xl border-2 border-dashed border-gray-300 min-h-[200px] relative overflow-hidden shadow-inner flex flex-col h-auto transition-all"
        >
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          ></div>

          <Reorder.Group
            axis="y"
            values={answers}
            onReorder={(newOrder) => {
              const reorderedAnswers = newOrder.map((a, index) => ({
                ...a,
                order_index: index,
              }));
              onUpdate(reorderedAnswers);
            }}
            className="flex flex-wrap gap-3 relative z-10"
          >
            {answers.map((a, aIndex) => (
              <Reorder.Item
                key={a.id || `temp-${aIndex}`}
                value={a}
                dragConstraints={containerRef}
                dragElastic={0}
                dragMomentum={false}
                className="inline-flex"
              >
                <div className="flex flex-col items-center gap-1 group">
                  <span className="text-[10px] font-black text-gray-400 uppercase leading-none">
                    Step {aIndex + 1}
                  </span>
                  <div
                    className={cn(
                      "flex items-center gap-2 bg-white border-2 p-1.5 pl-3 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border-gray-200",
                    )}
                  >
                    <Input
                      value={a.text}
                      onChange={(e) => onUpdateText(aIndex, e.target.value)}
                      placeholder="Word/Phrase"
                      onPointerDown={(e) => e.stopPropagation()}
                      className="border-none focus:ring-0 bg-transparent p-0 h-auto w-32 font-bold text-gray-700"
                    />
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[10px]",
                        colors[a.color as keyof typeof colors] || "bg-gray-400",
                      )}
                    >
                      {aIndex + 1}
                    </div>
                    <button
                      onClick={() => {
                        const newAnswers = [...answers];
                        newAnswers.splice(aIndex, 1);
                        const reIndexed = newAnswers.map((ans, idx) => ({
                          ...ans,
                          order_index: idx,
                        }));
                        onUpdate(reIndexed);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onUpdate([])}
          title="Clear All Steps"
          className="shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const currentAnswers = [...answers];
          const nextColor = ["red", "blue", "yellow", "green"][
            currentAnswers.length % 4
          ];
          currentAnswers.push({
            text: "",
            is_correct: true,
            color: nextColor,
            order_index: currentAnswers.length,
          });
          onUpdate(currentAnswers);
        }}
        className="mt-4 w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" /> Add Step
      </Button>
    </div>
  );
}
