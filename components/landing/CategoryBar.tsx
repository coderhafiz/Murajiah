"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
// Mock icons map or generic
import { Hash } from "lucide-react";

interface CategoryBarProps {
  tags: string[];
}

export function CategoryBar({ tags }: CategoryBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTag = searchParams.get("tag");

  const handleTagClick = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentTag === tag) {
      params.delete("tag"); // Toggle off
    } else {
      params.set("tag", tag);
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full border-b bg-background/95 backdrop-blur border-border relative z-30 shadow-sm">
      <div className="container mx-auto max-w-[1400px] py-3">
        <div className="w-full overflow-x-auto pb-1 no-scrollbar">
          <div className="flex w-max space-x-3 p-1">
            <Button
              variant={!currentTag ? "default" : "outline"}
              size="sm"
              onClick={() => handleTagClick("")}
              className={cn(
                "rounded-full font-bold px-6 h-9 transition-all",
                !currentTag
                  ? "shadow-md"
                  : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground shadow-sm",
              )}
            >
              All
            </Button>
            {tags.map((tag) => (
              <Button
                key={tag}
                variant={currentTag === tag ? "default" : "outline"}
                size="sm"
                onClick={() => handleTagClick(tag)}
                className={cn(
                  "rounded-full font-bold px-6 h-9 transition-all",
                  currentTag === tag
                    ? "shadow-md scale-105"
                    : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md",
                )}
              >
                <Hash className="mr-2 h-3.5 w-3.5 opacity-50" />
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
