"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  FileText,
  Sparkles,
  Upload,
  Lock,
  Check,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Question } from "@/types/quiz";

export interface AIQuestionGeneratorProps {
  isPremium?: boolean;
  onSuccess: (questions: Question[], quizId?: string) => void;
  onCancel?: () => void;
  initialQuestionCount?: number;
  initialTopic?: string;
  initialMode?: "topic" | "file";
  submitLabel?: string;
  compact?: boolean;
  showCreateFromScratch?: boolean;
  onManualEntry?: () => void;
  fullTypeNames?: boolean;
}

export function AIQuestionGenerator({
  isPremium = false,
  onSuccess,
  initialQuestionCount = 20,
  initialTopic = "",
  initialMode = "file",
  submitLabel = "Generate with AI",
  compact = false,
  showCreateFromScratch = false,
  onManualEntry,
}: AIQuestionGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState(initialTopic);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"topic" | "file" | "extract">(initialMode);
  const [questionCount, setQuestionCount] = useState<number | string>(
    initialQuestionCount,
  );
  const [questionLanguage, setQuestionLanguage] = useState<
    "original" | "english"
  >("original");
  const [answerLanguage, setAnswerLanguage] = useState<"original" | "english">(
    "original",
  );
  const [aiProvider, setAiProvider] = useState<
    "google" | "openai" | "groq" | "openrouter_nemotron"
  >("openai");
  const [strictness, setStrictness] = useState<"strict" | "creative">("strict");
  const [questionPreference, setQuestionPreference] = useState<string[]>([
    "quiz",
    "true_false",
    "type_answer",
    "puzzle",
  ]);
  const [answerPreference, setAnswerPreference] = useState<string[]>([
    "choice",
    "text",
  ]);
  const [questionOrder] = useState<"sequential" | "mix">("mix");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerateAI = async () => {
    console.log("DEBUG: handleGenerateAI version 4");
    setLoading(true);
    try {
      const finalCount = parseInt(questionCount.toString()) || 1;

      let result;
      const isExtraction = mode === "extract";

      if (mode === "topic") {
        if (!topic.trim()) {
          toast.error("Please enter a topic");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "topic",
            topic,
            questionCount: finalCount,
            questionLanguage,
            answerLanguage,
            aiProvider,
            strictness,
            questionPreference: JSON.stringify(questionPreference),
            answerPreference: JSON.stringify(answerPreference),
            questionOrder,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }
        result = await res.json();
      } else {
        if (!file) {
          toast.error("Please upload a file");
          setLoading(false);
          return;
        }

        // Use a very distinct name to avoid any collision or closure issues
        const bodyFormData = new FormData();
        bodyFormData.append("file", file);
        bodyFormData.append("mode", isExtraction ? "extract" : "file");
        bodyFormData.append("isExtraction", isExtraction ? "true" : "false");
        bodyFormData.append("questionCount", questionCount.toString());
        bodyFormData.append("questionLanguage", questionLanguage);
        bodyFormData.append("answerLanguage", answerLanguage);
        bodyFormData.append("aiProvider", aiProvider);
        bodyFormData.append("strictness", strictness);
        bodyFormData.append(
          "questionPreference",
          JSON.stringify(questionPreference),
        );
        bodyFormData.append(
          "answerPreference",
          JSON.stringify(answerPreference),
        );
        bodyFormData.append("questionOrder", questionOrder);

        const fileExt = file.name.split(".").pop()?.toLowerCase();
        const isImage = ["jpg", "jpeg", "png", "webp"].includes(fileExt || "");
        const endpoint = isImage
          ? "/api/ai/generate/vision"
          : "/api/ai/generate";

        const res = await fetch(endpoint, {
          method: "POST",
          body: bodyFormData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }
        result = await res.json();
      }

      onSuccess(result.questions || [], result.quizId);
      toast.success("Content processed successfully!");
    } catch (error: unknown) {
      const err = error as Error;
      console.error("AI Generation Error:", err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <Tabs
        defaultValue={initialMode}
        value={mode}
        onValueChange={(v) => setMode(v as "topic" | "file" | "extract")}
        className="w-full"
      >
        <TabsList
          className={cn("grid w-full grid-cols-3", compact ? "mb-2" : "mb-4")}
        >
          <TabsTrigger
            value="file"
            className="font-bold text-[10px] sm:text-xs"
          >
            Upload File
          </TabsTrigger>
          <TabsTrigger
            value="topic"
            className="font-bold text-[10px] sm:text-xs"
          >
            Enter Topic
          </TabsTrigger>
          <TabsTrigger
            value="extract"
            className="font-bold text-[10px] sm:text-xs"
          >
            Extract Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-3 mt-2">
          {!isPremium ? (
            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/30 relative overflow-hidden">
              <Lock className="w-8 h-8 text-muted-foreground mb-4" />
              <h3 className="font-bold text-base mb-1">Premium Feature</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                Upload documents to automatically generate a quiz.
              </p>
              <Button
                size="sm"
                className="font-bold bg-linear-to-r from-purple-600 to-indigo-600"
              >
                Upgrade
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors bg-muted/5",
                compact ? "p-3" : "p-4",
              )}
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
                <div className="flex flex-col items-center gap-1">
                  <FileText className="w-8 h-8 text-primary" />
                  <p className="font-bold text-sm truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px]"
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
                  <Upload
                    className={cn(
                      "text-muted-foreground mb-1",
                      compact ? "w-6 h-6" : "w-8 h-8",
                    )}
                  />
                  <p className="font-bold text-sm">Click to Upload</p>
                  <p className="text-[10px] text-muted-foreground">
                    PDF, Word, Excel, PowerPoint, Images
                  </p>
                  <p className="text-[8px] text-muted-foreground">Max 10MB</p>
                </>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="topic" className="space-y-3 mt-2">
          {!isPremium ? (
            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/30 relative overflow-hidden">
              <Lock className="w-8 h-8 text-muted-foreground mb-4" />
              <h3 className="font-bold text-base mb-1">Premium Feature</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                Generate questions based on any topic.
              </p>
              <Button
                size="sm"
                className="font-bold bg-linear-to-r from-purple-600 to-indigo-600"
              >
                Upgrade
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Topic or Subject</Label>
              <Input
                placeholder="e.g. Photosynthesis, Ancient Rome..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="extract" className="space-y-3 mt-2">
          {!isPremium ? (
            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/30 relative overflow-hidden">
              <Lock className="w-8 h-8 text-muted-foreground mb-4" />
              <h3 className="font-bold text-base mb-1">Premium Feature</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                Literal extraction from documents and photos.
              </p>
              <Button
                size="sm"
                className="font-bold bg-linear-to-r from-purple-600 to-indigo-600"
              >
                Upgrade
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors bg-muted/5",
                compact ? "p-3" : "p-4",
              )}
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
                <div className="flex flex-col items-center gap-1">
                  <FileText className="w-8 h-8 text-primary" />
                  <p className="font-bold text-sm truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px]"
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
                  <Sparkles className="w-8 h-8 text-purple-500 mb-1" />
                  <p className="font-bold text-sm">Literal Extraction Mode</p>
                  <p className="text-[10px] text-muted-foreground px-4">
                    Upload a file or photo. We&apos;ll extract pre-existing
                    questions verbatim without changes.
                  </p>
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div
        className={cn(
          "space-y-4",
          mode === "extract" && "opacity-60 pointer-events-none",
        )}
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Number of Questions</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            className="h-9"
          />
          <p className="text-[10px] text-muted-foreground">
            {mode === "extract"
              ? "Automatic based on content."
              : "Choose between 1 and 50 questions."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Question Language</Label>
            <select
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              value={questionLanguage}
              onChange={(e) =>
                setQuestionLanguage(e.target.value as "original" | "english")
              }
            >
              <option value="original">Same as Input (Auto)</option>
              <option value="english">English</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Answer Language</Label>
            <select
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold">Question Types</Label>
            <button
              type="button"
              onClick={() => setQuestionPreference([])}
              className="text-[10px] font-black text-red-500 uppercase hover:underline"
            >
              Deselect All
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "quiz", label: "Multiple Choice" },
              { id: "true_false", label: "True / False" },
              { id: "type_answer", label: "Fill-In (Type)" },
              { id: "puzzle", label: "Puzzle (Order)" },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() =>
                  setQuestionPreference((prev) =>
                    prev.includes(type.id)
                      ? prev.filter((x) => x !== type.id)
                      : [...prev, type.id],
                  )
                }
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-bold transition-all",
                  questionPreference.includes(type.id)
                    ? "bg-accent border-primary ring-1 ring-primary/20"
                    : "bg-background border-border text-muted-foreground",
                )}
              >
                {type.label}
                {questionPreference.includes(type.id) && (
                  <Check className="w-2.5 h-2.5" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold">Answer Formats</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "choice", label: "Selections (A, B, C, D)" },
              { id: "text", label: "Direct Text Entry" },
            ].map((format) => (
              <button
                key={format.id}
                type="button"
                onClick={() =>
                  setAnswerPreference((prev) =>
                    prev.includes(format.id)
                      ? prev.filter((x) => x !== format.id)
                      : [...prev, format.id],
                  )
                }
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-bold transition-all",
                  answerPreference.includes(format.id)
                    ? "bg-accent border-primary ring-1 ring-primary/20"
                    : "bg-background border-border text-muted-foreground",
                )}
              >
                {format.label}
                {answerPreference.includes(format.id) && (
                  <Check className="w-2.5 h-2.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-bold">AI Model</Label>
        <select
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium"
          value={aiProvider}
          onChange={(e) =>
            setAiProvider(
              e.target.value as
                | "google"
                | "openai"
                | "groq"
                | "openrouter_nemotron",
            )
          }
        >
          <option value="openai">OpenAI GPT-4o (Premium)</option>
          <option value="groq">Groq Llama 3.3 (Fast)</option>
        </select>
      </div>

      <div
        className={cn(
          "space-y-1.5",
          mode === "extract" && "opacity-60 pointer-events-none",
        )}
      >
        <Label className="text-xs font-bold">Question Scope (Creativity)</Label>
        <select
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium"
          value={strictness}
          onChange={(e) =>
            setStrictness(e.target.value as "strict" | "creative")
          }
        >
          <option value="strict">
            Strict (Only explicitly taught information)
          </option>
          <option value="creative">
            Creative (Broaden context & knowledge)
          </option>
        </select>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button
          className="w-full font-bold h-10 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-transform active:scale-95"
          onClick={handleGenerateAI}
          disabled={
            loading ||
            !isPremium ||
            (mode === "file" && !file) ||
            (mode === "extract" && !file) ||
            (mode === "topic" && !topic)
          }
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...
            </>
          ) : (
            <>
              {mode === "extract" ? (
                <FileText className="w-4 h-4 mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {mode === "extract" ? "Extract Content" : submitLabel}
            </>
          )}
        </Button>

        {showCreateFromScratch && onManualEntry && (
          <>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold">
                <span className="bg-background px-2 text-muted-foreground tracking-widest">
                  OR
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs font-bold"
              onClick={onManualEntry}
            >
              <Plus className="w-3.5 h-3.5 mr-2" /> Create from Scratch
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
