"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Loader2, FileText, Sparkles, Plus, Upload, Lock } from "lucide-react";
import { toast } from "sonner";

export default function CreateQuizModal({
  children,
  isPremium = false,
}: {
  children: React.ReactNode;
  isPremium?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"topic" | "file">("file");
  const [questionCount, setQuestionCount] = useState<number | string>(20);
  const [questionLanguage, setQuestionLanguage] = useState<
    "original" | "english"
  >("original");
  const [answerLanguage, setAnswerLanguage] = useState<"original" | "english">(
    "original",
  );
  const [aiProvider, setAiProvider] = useState<"google" | "openai">("google");
  const [questionPreference, setQuestionPreference] = useState<string>("mixed");
  const [answerPreference, setAnswerPreference] = useState<string>("mixed");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      let quizId;
      const finalCount = parseInt(questionCount.toString()) || 20;

      const fetchWithHandling = async (url: string, options: RequestInit) => {
        const res = await fetch(url, options);
        const contentType = res.headers.get("content-type");

        if (!res.ok) {
          if (contentType && contentType.includes("text/html")) {
            // Vercel/Server timeout or error
            throw new Error(
              "The request timed out or experienced a server error (Vercel). Try reducing the question count or using a faster model like Gemini."
            );
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }

        if (contentType && contentType.includes("text/html")) {
          throw new Error(
            "Received an unexpected HTML response from the server. This usually means a connection timeout."
          );
        }

        return res.json();
      };

      if (mode === "topic") {
        if (!topic.trim()) {
          toast.error("Please enter a topic");
          setLoading(false);
          return;
        }

        const data = await fetchWithHandling("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "topic",
            topic,
            questionCount: finalCount,
            questionLanguage,
            answerLanguage,
            aiProvider,
            questionPreference,
            answerPreference,
          }),
        });
        quizId = data.quizId;
      } else if (mode === "file") {
        if (!file) {
          toast.error("Please upload a file");
          setLoading(false);
          return;
        }

        const fileExt = file.name.split(".").pop()?.toLowerCase();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mode", "file");
        formData.append("questionCount", questionCount.toString());
        formData.append("questionLanguage", questionLanguage);
        formData.append("answerLanguage", answerLanguage);
        formData.append("aiProvider", aiProvider);
        formData.append("questionPreference", questionPreference);
        formData.append("answerPreference", answerPreference);

        const isImage = ["jpg", "jpeg", "png", "webp"].includes(fileExt || "");
        const endpoint = isImage
          ? "/api/ai/generate/vision"
          : "/api/ai/generate";

        const data = await fetchWithHandling(endpoint, {
          method: "POST",
          body: formData,
        });
        quizId = data.quizId;
      }

      toast.success("Quiz generated successfully!");
      setOpen(false);
      router.push(`/dashboard/quiz/${quizId}`);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("AI Generation Error:", err);
      
      // Handle the common "Unexpected token <" or HTML responses contextually
      const message = err.message || "";
      if (message.includes("Unexpected token") || message.includes("JSON")) {
        toast.error("The server timed out or returned an invalid response. Try again with fewer questions.");
      } else {
        toast.error(message || "Something went wrong");
      }
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Create New Quiz
          </DialogTitle>
          <DialogDescription className="text-xs">
            Let AI help you generate questions or start from scratch.
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

          <TabsContent value="file" className="space-y-3 mt-2">
            {!isPremium ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/30 relative overflow-hidden">
                <Lock className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-bold text-lg mb-2">Premium Feature</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Upload PDF, Word, Excel, PowerPoint, or Images to
                  automatically generate a quiz using AI.
                </p>
                <Link href="/pricing" onClick={() => setOpen(false)}>
                  <Button className="font-bold bg-linear-to-r from-purple-600 to-indigo-600">
                    Upgrade to Premium
                  </Button>
                </Link>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors bg-muted/5"
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
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="font-bold text-base">Click to Upload</p>
                    <p className="text-xs text-muted-foreground mb-1">
                      PDF, Word, Excel, PowerPoint, Images
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      Max 10MB
                    </p>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="topic" className="space-y-3 mt-2">
            {!isPremium ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/30 relative overflow-hidden">
                <Lock className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-bold text-lg mb-2">Premium Feature</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Enter any topic and have AI instantly generate a complete set
                  of questions and answers.
                </p>
                <Link href="/pricing" onClick={() => setOpen(false)}>
                  <Button className="font-bold bg-linear-to-r from-purple-600 to-indigo-600">
                    Upgrade to Premium
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Topic or Subject</Label>
                <Input
                  placeholder="e.g. Photosynthesis, Ancient Rome..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-10 text-base"
                />
                <p className="text-[10px] text-muted-foreground">
                  We&apos;ll generate questions based on this topic.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Question Count Input */}
        <div className="mt-4 space-y-2">
          <Label>Number of Questions</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={questionCount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                setQuestionCount("");
              } else {
                const parsed = parseInt(val);
                if (!isNaN(parsed)) setQuestionCount(parsed);
              }
            }}
            className="h-10"
          />
          <p className="text-[10px] text-muted-foreground">
            Choose between 1 and 50 questions.
          </p>
        </div>

        {/* Language Options */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Question Language</Label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={questionLanguage}
              onChange={(e) =>
                setQuestionLanguage(e.target.value as "original" | "english")
              }
            >
              <option value="original">Same as Input (Auto)</option>
              <option value="english">English</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Answer Language</Label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={answerLanguage}
              onChange={(e) =>
                setAnswerLanguage(e.target.value as "original" | "english")
              }
            >
              <option value="original">Same as Input (Auto)</option>
              <option value="english">English</option>
            </select>
          </div>
        </div>

        {/* Question & Answer Type Preference */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Question Type</Label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={questionPreference}
              onChange={(e) => setQuestionPreference(e.target.value)}
            >
              <option value="mixed">Mixed Types (AI Choice)</option>
              <option value="quiz">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="type_answer">Type Answer (Fill-in)</option>
              <option value="puzzle">Puzzle (Order)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Answer Format</Label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={answerPreference}
              onChange={(e) => setAnswerPreference(e.target.value)}
            >
              <option value="mixed">Mixed Format</option>
              <option value="choice">Selection (A, B, C, D)</option>
              <option value="text">Text Entry</option>
            </select>
          </div>
        </div>

        {/* AI Provider */}
        <div className="mt-4 space-y-2">
          <Label>AI Model</Label>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={aiProvider}
            onChange={(e) =>
              setAiProvider(e.target.value as "google" | "openai")
            }
          >
            <option value="google">Google Gemini 2.0 Flash</option>
            <option value="openai">OpenAI GPT-4o</option>
          </select>
          <p className="text-[10px] text-muted-foreground">
            Gemini is typically faster for large documents.
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            className="w-full font-bold h-10 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-transform active:scale-95"
            onClick={handleGenerate}
            disabled={
              loading ||
              !isPremium ||
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
            className="w-full h-10 transition-transform active:scale-95"
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
