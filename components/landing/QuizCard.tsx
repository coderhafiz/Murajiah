"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface QuizCardProps {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  authorName: string;
  authorAvatar: string | null;
  playCount: number;
  likeCount: number;
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
  hideDescription = false,
  variant = "default",
  customHref,
}: QuizCardProps) {
  const isPoster = variant === "poster";
  const aspectRatioClass = isPoster ? "aspect-square" : "aspect-video";

  return (
    <Link href={customHref || `/quiz/${id}`} prefetch={false}>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 h-full">
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
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <span className="text-4xl">🎲</span>
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
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4 fill-current" />
                  {likeCount}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3 md:p-4 w-full">
          <h3
            className={`font-bold group-hover:text-primary transition-colors ${
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
                <div className="flex items-center gap-1 text-primary/80 font-medium">
                  <Heart className="h-3 w-3 fill-current" />
                  {likeCount}
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
