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
}: QuizCardProps) {
  return (
    <Link href={`/dashboard/quiz/${id}`} prefetch={false}>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 h-full">
        {/* Cover Image */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
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

          {/* Overlay Stats */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white opacity-0 transition-opacity group-hover:opacity-100">
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
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4 w-full">
          <h3 className="line-clamp-1 text-lg font-bold group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground mt-1 mb-4 flex-1">
            {description}
          </p>

          {/* Author */}
          <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
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
        </div>
      </div>
    </Link>
  );
}
