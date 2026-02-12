"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitComment } from "@/app/actions/comments";
import { toast } from "sonner";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function CommentForm({ user }: { user: any }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return toast.error("Please login to share your experience");
    }
    if (!content.trim()) return toast.error("Please enter a comment");

    try {
      setLoading(true);
      await submitComment(content);
      toast.success("Thank you! Your comment has been submitted for review.");
      setContent("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto border-border/50 bg-card/50 backdrop-blur-xs">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquarePlus className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Share Your Experience</h3>
        </div>

        {!user ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-muted-foreground">
              Sign in to tell us what you think about Murajiah.
            </p>
            <Button onClick={() => router.push("/login")}>
              Sign In to Comment
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment" className="sr-only">
                Your Comment
              </Label>
              <Textarea
                id="comment"
                placeholder="How has Murajiah helped you? What features do you love?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{content.length}/500</span>
                <span>Submissions are moderated.</span>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
