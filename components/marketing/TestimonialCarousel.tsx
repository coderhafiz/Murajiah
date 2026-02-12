"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { type Comment } from "@/app/actions/comments";
import Autoplay from "embla-carousel-autoplay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Quote } from "lucide-react";

export function TestimonialCarousel({ comments }: { comments: Comment[] }) {
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No testimonials yet. Be the first to share your experience!
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <Carousel
        opts={{
          align: "center",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {comments.map((comment) => (
            <CarouselItem
              key={comment.id}
              className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3"
            >
              <div className="p-1 h-full">
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur-xs hover:border-primary/20 transition-colors">
                  <CardContent className="flex flex-col h-full p-6">
                    <Quote className="w-8 h-8 text-primary/20 mb-4" />
                    <p className="text-muted-foreground text-sm italic mb-6 grow line-clamp-4">
                      "{comment.content}"
                    </p>
                    <div className="flex items-center gap-3 mt-auto">
                      <Avatar className="w-8 h-8 border border-border">
                        <AvatarImage
                          src={comment.profiles?.avatar_url || ""}
                          alt={comment.profiles?.full_name || "User"}
                        />
                        <AvatarFallback>
                          {(comment.profiles?.full_name || "User")
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {comment.profiles?.full_name || "Anonymous User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Murajiah User
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="hidden md:block">
          <CarouselPrevious />
          <CarouselNext />
        </div>
      </Carousel>
    </div>
  );
}
