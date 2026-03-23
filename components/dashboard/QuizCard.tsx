"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Star, CheckSquare } from "lucide-react";
import { motion } from "framer-motion";
import { QuizActions } from "@/components/dashboard/QuizActions";
import { cn } from "@/lib/utils";

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  created_at: string;
  creator_id: string;
  status: string;
  is_favorite?: boolean;
  folder_id?: string | null;
};

interface QuizCardProps {
  quiz: Quiz;
  viewMode: "grid" | "list";
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string, current: boolean) => void;
  onMove: () => void;
}

export function QuizCard({
  quiz,
  viewMode,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onToggleFavorite,
  onMove,
}: QuizCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(viewMode === "list" && "w-full")}
    >
      <Link href={`/dashboard/quiz/${quiz.id}`} className="block h-full group">
        <Card
          className={cn(
            "overflow-hidden hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 bg-card border-border/50 group flex h-full",
            viewMode === "grid" ? "flex-col" : "flex-row min-h-20 h-auto items-stretch",
          )}
        >
          <div
            className={cn(
              "bg-muted relative overflow-hidden shrink-0",
              viewMode === "grid" ? "h-32 w-full" : "w-24 sm:w-32 md:w-48 self-stretch",
            )}
          >
            {/* Selection Checkbox */}
            {(isSelectionMode || isSelected) && (
              <div
                className="absolute top-2 left-2 z-30"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSelection(quiz.id);
                }}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-background/80 border-muted-foreground/50 hover:bg-background",
                  )}
                >
                  {isSelected && <CheckSquare className="w-4 h-4" />}
                </div>
              </div>
            )}

            {/* Favorite Button */}
            {!isSelectionMode && (
              <button
                onClick={(e) => onToggleFavorite(e, quiz.id, !!quiz.is_favorite)}
                className={cn(
                  "absolute top-2 left-2 z-20 p-1.5 rounded-full backdrop-blur-md transition-all shadow-sm group/star ring-1 ring-white/10",
                  quiz.is_favorite
                    ? "bg-yellow-400 text-yellow-900 border-yellow-500 hover:bg-yellow-300"
                    : "bg-black/30 text-white/70 hover:bg-white/20 hover:text-white border-transparent",
                )}
              >
                <Star className={cn("w-4 h-4", quiz.is_favorite && "fill-yellow-900")} />
              </button>
            )}

            {/* Status Badge */}
            {quiz.status === "draft" && (
              <div className="absolute top-2 right-2 bg-yellow-400/90 backdrop-blur-sm text-yellow-900 px-2 py-0.5 rounded-md text-[10px] font-black uppercase shadow-sm z-10 border border-yellow-300/50">
                Draft
              </div>
            )}

            {/* Image */}
            <div className="w-full h-full transition-transform duration-500 group-hover:scale-110">
              {quiz.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={quiz.cover_image} alt={quiz.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white/50 text-4xl font-black">
                  <div className="w-full h-full opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </div>

          <CardHeader
            className={cn(
              "p-3 md:p-4 flex-1 min-w-0 flex flex-col justify-center",
              viewMode === "list" && "py-2",
            )}
          >
            <CardTitle
              className={cn(
                "text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors",
                viewMode === "grid" ? "line-clamp-1" : "line-clamp-2 md:line-clamp-none",
              )}
            >
              {quiz.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-sm text-muted-foreground mt-1">
              {quiz.description || "No description"}
            </CardDescription>
          </CardHeader>

          <CardContent
            className={cn(
              "p-2 sm:p-3 flex justify-between items-center border-border/50 bg-muted/10",
              viewMode === "grid"
                ? "border-t mt-auto w-full"
                : "border-l flex-col justify-center gap-2 w-[40px] sm:w-[50px] bg-transparent shrink-0 px-1",
            )}
          >
            <div className="text-xs font-semibold text-muted-foreground/70">
              {new Date(quiz.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div onClick={(e) => e.preventDefault()}>
              <QuizActions quizId={quiz.id} quizTitle={quiz.title} onMove={onMove} />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
