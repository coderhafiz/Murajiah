"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "@/app/actions/quiz";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface QuizLikeButtonProps {
  quizId: string;
  initialLikes: number;
  initialIsLiked: boolean;
}

export default function QuizLikeButton({
  quizId,
  initialLikes,
  initialIsLiked,
}: QuizLikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (isLoading) return;

    // Optimistic update
    const previousLikes = likes;
    const previousIsLiked = isLiked;

    setIsLiked(!previousIsLiked);
    setLikes(previousIsLiked ? previousLikes - 1 : previousLikes + 1);

    try {
      await toggleLike(quizId);
    } catch (error) {
      // Revert if failed
      console.error("Failed to toggle like", error);
      setIsLiked(previousIsLiked);
      setLikes(previousLikes);
    }
  };

  return (
    <div
      className={cn(
        "bg-card p-4 rounded-xl border text-center cursor-pointer transition-all hover:scale-105 active:scale-95 group",
        isLiked
          ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900"
          : "hover:border-primary/50",
      )}
      onClick={handleToggle}
    >
      <Heart
        className={cn(
          "w-5 h-5 mx-auto mb-2 transition-colors",
          isLiked
            ? "fill-red-500 text-red-500"
            : "text-primary group-hover:scale-110",
        )}
      />
      <div
        className={cn(
          "font-bold text-lg",
          isLiked && "text-red-600 dark:text-red-400",
        )}
      >
        {likes}
      </div>
      <div
        className={cn(
          "text-xs text-muted-foreground uppercase font-bold",
          isLiked && "text-red-600/70 dark:text-red-400/70",
        )}
      >
        Likes
      </div>
    </div>
  );
}
