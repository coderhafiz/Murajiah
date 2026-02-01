"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Sparkles, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function CreateQuizModal({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"topic" | "file">("file");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // const supabase = createClient(); // Unused

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      let quizId;

      if (mode === "topic") {
        if (!topic.trim()) {
          toast.error("Please enter a topic");
          setLoading(false);
          return;
        }

        // TODO: Call AI generation API for Topic
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode: "topic", topic }),
        });

        if (!res.ok) throw new Error("Generation failed");
        const data = await res.json();
        quizId = data.quizId;
      } else if (mode === "file") {
        if (!file) {
          toast.error("Please upload a file");
          setLoading(false);
          return;
        }

        // 1. Prepare Upload
        const fileExt = file.name.split(".").pop()?.toLowerCase();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("mode", "file");

        // Determine Endpoint based on file type
        const isImage = ["jpg", "jpeg", "png", "webp"].includes(fileExt || "");
        const endpoint = isImage
          ? "/api/ai/generate/vision"
          : "/api/ai/generate";

        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Generation failed");
        }
        const data = await res.json();
        quizId = data.quizId;
      }

      toast.success("Quiz generated successfully!");
      setOpen(false);
      router.push(`/dashboard/quiz/${quizId}`);
    } catch (error: unknown) {
      const err = error as Error;
      console.error(err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleBlank = () => {
    setOpen(false);
    router.push("/dashboard/create");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Create New Quiz
          </DialogTitle>
          <DialogDescription>
            Choose how you want to start. Let AI help you or start from scratch.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="file"
          value={mode}
          onValueChange={(v) => setMode(v as "topic" | "file")}
          className="w-full mt-4"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="file" className="font-bold">
              Upload File
            </TabsTrigger>
            <TabsTrigger value="topic" className="font-bold">
              Enter Topic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-12 h-12 text-primary" />
                  <p className="font-bold text-lg">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="font-bold text-lg">Click to Upload</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    PDF, Word, Excel, PowerPoint, Images (JPG, PNG)
                  </p>
                  <p className="text-xs text-muted-foreground/70">Max 10MB</p>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="topic" className="space-y-4">
            <div className="space-y-2">
              <Label>Topic or Subject</Label>
              <Input
                placeholder="e.g. Photosynthesis, Ancient Rome, Javascript Basics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-12 text-lg"
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll generate questions based on this topic.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full font-bold text-base bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
            onClick={handleGenerate}
            disabled={
              loading ||
              (mode === "file" && !file) ||
              (mode === "topic" && !topic)
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generating Questions...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate with AI
              </>
            )}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleBlank}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create from Scratch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
