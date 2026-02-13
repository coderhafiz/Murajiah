"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Heart, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { toggleLike } from "@/app/actions/quiz";

export interface QuizCardProps {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  authorName: string;
  authorAvatar: string | null;
  playCount: number;
  likeCount: number;
  isLiked?: boolean;
  hideDescription?: boolean;
  variant?: "default" | "poster";
  customHref?: string;
}

export function QuizCard({
  id,
  title,
  description,
  coverImage,
  authorName,
  authorAvatar,
  playCount,
  likeCount,
  isLiked = false,
  hideDescription = false,
  variant = "default",
  customHref,
}: QuizCardProps) {
  const isPoster = variant === "poster";
  const aspectRatioClass = isPoster ? "aspect-square" : "aspect-video";

  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likeCount);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic update
    const previousLiked = liked;
    const previousLikes = likes;

    setLiked(!previousLiked);
    setLikes(previousLiked ? previousLikes - 1 : previousLikes + 1);

    try {
      await toggleLike(id);
    } catch (error) {
      // Revert on error
      console.error("Failed to toggle like:", error);
      setLiked(previousLiked);
      setLikes(previousLikes);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Link
        href={customHref || `/quiz/${id}`}
        prefetch={false}
        className="h-full block"
      >
        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] h-full">
          {/* Cover Image */}
          <div
            className={`relative w-full overflow-hidden bg-muted ${aspectRatioClass}`}
          >
            {coverImage ? (
              <Image
                src={coverImage}
                alt={title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/5">
                <BookOpen className="h-12 w-12 text-primary/20" />
              </div>
            )}

            {/* Overlay Stats (Only for default) */}
            {!isPoster && (
              <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-4 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex items-center gap-4 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    <Play className="h-4 w-4 fill-current" />
                    {playCount}
                  </div>
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1 hover:text-red-400 transition-colors ${liked ? "text-red-500" : "text-white"}`}
                  >
                    <Heart
                      className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : "fill-transparent text-current"}`}
                    />
                    {likes}
                  </button>
                </div>
              </div>
            )}

            {/* Poster Variant Like Button (Always visible on hover or if liked?) 
                Actually, let's keep it in the footer for poster variant as per original design 
            */}
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col p-3 md:p-4 w-full">
            <h3
              className={`font-bold group-hover:text-primary transition-colors text-foreground ${
                hideDescription || isPoster
                  ? "text-sm line-clamp-2 md:text-base leading-tight mb-1"
                  : "text-lg line-clamp-1"
              }`}
            >
              {title}
            </h3>
            {!hideDescription && !isPoster && (
              <p className="line-clamp-2 text-sm text-muted-foreground mt-1 mb-4 flex-1">
                {description}
              </p>
            )}

            {/* Author / Footer */}
            <div className="mt-auto pt-2 border-t border-border/50">
              {isPoster ? (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[60%] hover:text-foreground transition-colors">
                    {authorName}
                  </span>
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1 font-medium transition-colors hover:scale-110 active:scale-95 ${liked ? "text-red-500" : "text-primary/80 hover:text-red-400"}`}
                  >
                    <Heart
                      className={`h-3 w-3 ${liked ? "fill-current" : ""}`}
                    />
                    {likes}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={authorAvatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {authorName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {authorName}
                    </span>
                  </div>
                  {/* Mobile/Default variant like button in footer? 
                         Original code didn't have it in footer for default variant, only in overlay.
                         But overlay is hidden on mobile often.
                         Let's add it to footer for default variant too if needed, or stick to overlay.
                         The user said "quiz cards in the home page", which are mostly poster or default.
                         Let's checking lines 71-84 again. It fades in on group-hover. 
                         This might be hard to click on mobile.
                         Let's ADD it to the footer for default variant as well OR make it always visible?
                         For now, I'll update the overlay one first as requested.
                         And maybe add it to the footer for better UX?
                         Actually, let's stick to the overlay for text-white context, but make the button functional.
                      */}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
