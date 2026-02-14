"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client"; // Use browser client
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Re-added for auto-expanding input
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Save,
  Check,
  Mic,
  Upload,
  StopCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Layers,
  RectangleVertical,
  Columns2,
  LayoutGrid,
  MoreVertical,
  Shuffle,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AudioRecorder from "@/components/ui/AudioRecorder";
import QuizSettingsDialog from "@/components/dashboard/QuizSettingsDialog";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// ... (waiting for view to apply precise edits)
// Actually I can apply without view if I use unique context.
// Reorder import:
// import { Reorder } from "framer-motion"; -> remove
// permission destructuring:
// permission = "owner", -> remove
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import PuzzleQuestionEditor from "@/components/dashboard/quiz/PuzzleQuestionEditor";
import {
  notifyQuizPublished,
  notifyOwnerOfUserPublish,
} from "@/app/actions/quiz-events";

// Types
type Answer = {
  id?: string;
  text: string;
  is_correct: boolean;
  color?: string;
  order_index?: number;
  media_url?: string;
};

type QuestionType =
  | "quiz"
  | "true_false"
  | "type_answer"
  | "puzzle"
  | "voice"
  | "poll";

type Question = {
  id?: string;
  title: string;
  time_limit: number;
  answers: Answer[];
  question_type: QuestionType;
  media_url?: string;
  answer_format?: "choice" | "text" | "audio";
  points_multiplier?: number;
};

export default function QuizEditor({
  quiz,
  initialQuestions,
  permission,
  initialVisibility,
  initialTags,
}: {
  quiz: {
    id: string;
    title: string;
    description?: string | null;
    cover_image?: string | null;
    status?: string | null;
  };
  // ... props
  initialQuestions: Question[];
  permission?: "owner" | "editor" | "viewer" | null;
  initialVisibility: "public" | "private";
  initialTags: string[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  // Quiz metadata state
  const [quizData, setQuizData] = useState<{
    id: string;
    title: string;
    description: string | null;
    cover_image: string | null;
    visibility: "public" | "private";
    tags: string[];
  }>({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description || null,
    cover_image: quiz.cover_image || null,
    visibility: initialVisibility,
    tags: initialTags,
  });

  // ...

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);

  const [uploadingQuestionIndex, setUploadingQuestionIndex] = useState<
    number | null
  >(null);
  const [saving, setSaving] = useState(false);

  // Audio Recording State
  const [recordingState, setRecordingState] = useState<{
    isRecording: boolean;
    questionIndex: number | null;
    mediaRecorder: MediaRecorder | null;
    audioBlob: Blob | null;
  }>({
    isRecording: false,
    questionIndex: null,
    mediaRecorder: null,
    audioBlob: null,
  });
  const [uploadingAudioIndex, setUploadingAudioIndex] = useState<number | null>(
    null,
  );
  const [collapsedAudio, setCollapsedAudio] = useState<Record<number, boolean>>(
    {},
  );
  // Layout state: 1, 2, or 3 columns
  const [layoutColumns, setLayoutColumns] = useState<1 | 2 | 3>(1);

  const [confirmationModal, setConfirmationModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "default" | "destructive";
    confirmText?: string;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const toggleAudioCollapse = (index: number) => {
    setCollapsedAudio((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const startRecording = async (index: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordingState((prev) => ({
          ...prev,
          audioBlob: blob,
          isRecording: false,
        }));
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Auto-upload after stop? Or let user preview?
        // Let's auto-upload for smooth UX
        handleAudioUpload(index, blob);
      };

      mediaRecorder.start();
      setRecordingState({
        isRecording: true,
        questionIndex: index,
        mediaRecorder,
        audioBlob: null,
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (recordingState.mediaRecorder && recordingState.isRecording) {
      recordingState.mediaRecorder.stop();
    }
  };

  const handleAudioUpload = async (index: number, fileOrBlob: File | Blob) => {
    try {
      setUploadingAudioIndex(index);
      const fileExt =
        fileOrBlob instanceof File ? fileOrBlob.name.split(".").pop() : "webm";
      const fileName = `${quiz.id}/${index}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("quiz_assets")
        .upload(fileName, fileOrBlob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("quiz_assets")
        .getPublicUrl(fileName);

      updateQuestion(index, "media_url", data.publicUrl);
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Unknown error";
      alert("Failed to upload audio: " + errorMessage);
    } finally {
      setUploadingAudioIndex(null);
      setRecordingState((prev) => ({
        ...prev,
        isRecording: false,
        mediaRecorder: null,
        questionIndex: null,
      }));
    }
  };

  const handleFileSelect = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      handleAudioUpload(index, e.target.files[0]);
    }
  };

  const handleQuestionImageUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || !e.target.files[0]) return;

    try {
      setUploadingQuestionIndex(index);
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${quizData.id}/q_${index}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("quiz_assets")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("quiz_assets")
        .getPublicUrl(fileName);

      updateQuestion(index, "media_url", data.publicUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setUploadingQuestionIndex(null);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        title: "New Question",
        time_limit: 20,
        points_multiplier: 1,
        question_type: "quiz",
        answer_format: "choice",
        answers: [
          { text: "", is_correct: false, color: "red" },
          { text: "", is_correct: false, color: "blue" },
          { text: "", is_correct: false, color: "yellow" },
          { text: "", is_correct: false, color: "green" },
        ],
      },
    ]);
  };

  const updateQuestion = <K extends keyof Question>(
    index: number,
    field: K,
    value: Question[K],
  ) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };

    // Handle Type Change logic
    if (field === "question_type") {
      const q = newQuestions[index];
      if (value === "true_false") {
        q.answers = [
          { text: "True", is_correct: true, color: "blue" },
          { text: "False", is_correct: false, color: "red" },
        ];
      } else if (value === "type_answer") {
        q.answers = [
          { text: "", is_correct: true, color: "red" }, // Only one needed really
        ];
      } else if (value === "quiz" || value === "poll" || value === "voice") {
        // Reset to 4 standard options if not already
        if (q.answers.length < 4) {
          q.answers = [
            { text: "", is_correct: false, color: "red" },
            { text: "", is_correct: false, color: "blue" },
            { text: "", is_correct: false, color: "yellow" },
            { text: "", is_correct: false, color: "green" },
          ];
        }
      } else if (value === "puzzle") {
        // Reset to 4 standard options for ordering
        q.answers = [
          { text: "", is_correct: true, order_index: 0, color: "red" },
          { text: "", is_correct: true, order_index: 1, color: "blue" },
          { text: "", is_correct: true, order_index: 2, color: "yellow" },
          { text: "", is_correct: true, order_index: 3, color: "green" },
        ];
      }
    }

    setQuestions(newQuestions);
  };

  const updateAnswer = <K extends keyof Answer>(
    qIndex: number,
    aIndex: number,
    field: K,
    value: Answer[K],
  ) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].answers[aIndex] = {
      ...newQuestions[qIndex].answers[aIndex],
      [field]: value,
    };
    setQuestions(newQuestions);
  };

  const toggleCorrect = (qIndex: number, aIndex: number) => {
    const newQuestions = [...questions];
    // Toggle boolean
    const current = newQuestions[qIndex].answers[aIndex].is_correct;
    newQuestions[qIndex].answers[aIndex].is_correct = !current;
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    const qToDelete = questions[index];
    if (qToDelete.id) {
      setDeletedQuestionIds([...deletedQuestionIds, qToDelete.id]);
    }
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const duplicateQuestion = (index: number) => {
    const qToDuplicate = questions[index];
    const newQuestion: Question = {
      ...qToDuplicate,
      id: undefined, // Let DB generate new ID
      title: `${qToDuplicate.title} (Copy)`,
      answers: qToDuplicate.answers.map((a) => ({ ...a, id: undefined })),
    };

    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, newQuestion);
    setQuestions(newQuestions);
  };

  const applyTimeLimitToAll = (time: number) => {
    const newQuestions = questions.map((q) => ({
      ...q,
      time_limit: time,
    }));
    setQuestions(newQuestions);
  };

  const handleShuffleQuestions = () => {
    setConfirmationModal({
      open: true,
      title: "Shuffle Questions?",
      description:
        "This will randomize the order of all questions. This action cannot be undone.",
      confirmText: "Shuffle",
      onConfirm: () => {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
      },
    });
  };

  const handleShuffleAnswers = (qIndex: number) => {
    const newQuestions = [...questions];
    const q = newQuestions[qIndex];
    q.answers = [...q.answers].sort(() => Math.random() - 0.5);
    setQuestions(newQuestions);
  };

  const addAnswer = (qIndex: number) => {
    const newQuestions = [...questions];
    const q = newQuestions[qIndex];
    const nextColor = ["red", "blue", "yellow", "green"][q.answers.length % 4];
    q.answers.push({
      text: "",
      is_correct: false,
      color: nextColor,
    });
    setQuestions(newQuestions);
  };

  const removeAnswer = (qIndex: number, aIndex: number) => {
    const newQuestions = [...questions];
    const q = newQuestions[qIndex];

    // Prevent removing if only 2 answers left (minimum)
    if (q.answers.length <= 2) return;

    q.answers.splice(aIndex, 1);
    setQuestions(newQuestions);
  };

  const handleExit = () => {
    setConfirmationModal({
      open: true,
      title: "Exit Editor?",
      description:
        "Unsaved changes may be lost. Are you sure you want to exit?",
      variant: "destructive",
      confirmText: "Exit",
      onConfirm: () => {
        router.push("/dashboard");
      },
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Determine status
      let status = "published";
      if (questions.length === 0) {
        status = "draft";
      } else {
        for (const q of questions) {
          if (q.question_type === "poll") {
            // Polls don't need a "correct" answer enabled
          } else {
            const hasCorrect = q.answers.some((a) => a.is_correct);
            if (!hasCorrect) {
              status = "draft";
              break;
            }
          }
        }
      }

      // Update quiz status
      const { error: quizError } = await supabase
        .from("quizzes")
        .update({ status })
        .eq("id", quiz.id);

      if (quizError) throw quizError;

      // Notify if becoming published (TRANSITION: !published -> published)
      if (
        status === "published" &&
        quiz.status !== "published" && // Was not published before
        quizData.visibility === "public" // And is public
      ) {
        notifyQuizPublished(quiz.id).catch(console.error);
        notifyOwnerOfUserPublish(quiz.id).catch(console.error);
      }

      // 1. Delete removed questions
      if (deletedQuestionIds.length > 0) {
        // First, detach from any active games (foreign key constraint)
        await supabase
          .from("games")
          .update({ current_question_id: null })
          .in("current_question_id", deletedQuestionIds);

        // Then delete the questions
        const { error: deleteError } = await supabase
          .from("questions")
          .delete()
          .in("id", deletedQuestionIds);

        if (deleteError) {
          console.error("Delete error:", deleteError);
          // If we can't delete (e.g. strict FK elsewhere?), we should warn user but maybe proceed?
          // But throwing stops the whole save.
          throw deleteError;
        }
      }

      // 2. Upsert questions and answers
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // Prepare questions upsert
        const upsertPayload: {
          quiz_id: string;
          title: string;
          time_limit: number;
          order_index: number;
          question_type: string;
          media_url?: string;
          points_multiplier?: number;
          answer_format?: string;
          id?: string;
        } = {
          quiz_id: quiz.id,
          title: q.title,
          time_limit: q.time_limit,
          order_index: i,
          question_type: q.question_type,
          points_multiplier: q.points_multiplier || 1,
          media_url: q.media_url,
          answer_format: q.answer_format ?? "choice",
        };
        // Use ID only if it exists
        if (q.id) {
          upsertPayload.id = q.id;
        }

        const { data: qData, error: qError } = await supabase
          .from("questions")
          .upsert(upsertPayload)
          .select()
          .single();

        if (qError) throw qError;

        if (qData) {
          // Update local ID
          questions[i].id = qData.id;

          // Delete removed answers (if question existed)
          if (q.id) {
            const { data: dbAnswers } = await supabase
              .from("answers")
              .select("id")
              .eq("question_id", q.id);

            if (dbAnswers) {
              const currentAnswerIds = q.answers
                .map((a) => a.id)
                .filter(Boolean) as string[];
              const idsToDelete = dbAnswers
                .filter((dbA) => !currentAnswerIds.includes(dbA.id))
                .map((dbA) => dbA.id);

              if (idsToDelete.length > 0) {
                await supabase.from("answers").delete().in("id", idsToDelete);
              }
            }
          }

          // Upsert answers
          for (let j = 0; j < q.answers.length; j++) {
            const a = q.answers[j];
            const answerPayload: {
              question_id: string;
              text: string;
              is_correct: boolean;
              color?: string;
              order_index?: number;
              media_url?: string;
              id?: string;
            } = {
              question_id: qData.id,
              text: a.text,
              is_correct: a.is_correct,
              color: a.color,
              order_index: a.order_index || 0,
              media_url: a.media_url,
            };
            if (a.id) {
              answerPayload.id = a.id;
            }

            const { data: aData, error: aError } = await supabase
              .from("answers")
              .upsert(answerPayload)
              .select()
              .single();

            if (aError) throw aError;

            if (aData) {
              // Updated local answer ID to prevent duplicates if save runs again
              questions[i].answers[j].id = aData.id;
            }
          }
        }
      }

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      console.error("Failed to save quiz. Full error object:", error);

      let errorMessage = "Unknown error";
      let errorDetails = undefined;
      let errorHint = undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        if ("message" in error)
          errorMessage = (error as { message: string }).message;
        if ("details" in error)
          errorDetails = (error as { details: unknown }).details;
        if ("hint" in error) errorHint = (error as { hint: unknown }).hint;
      }

      console.error("Error message:", errorMessage);
      console.error("Error details:", errorDetails);
      console.error("Error hint:", errorHint);
      alert(`Failed to save quiz: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const TIME_PRESETS = [
    { value: 5, label: "5 seconds" },
    { value: 10, label: "10 seconds" },
    { value: 15, label: "15 seconds" },
    { value: 20, label: "20 seconds" },
    { value: 30, label: "30 seconds" },
    { value: 45, label: "45 seconds" },
    { value: 60, label: "1 minute" },
    { value: 90, label: "1 minute 30 seconds" },
    { value: 120, label: "2 minutes" },
    { value: 180, label: "3 minutes" },
    { value: 240, label: "4 minutes" },
  ];

  const colors = {
    red: "bg-game-red",
    blue: "bg-game-blue",
    yellow: "bg-game-yellow",
    green: "bg-game-green",
  };

  return (
    <div
      className={cn(
        "space-y-4 md:space-y-8 -mx-6 md:mx-auto pb-20 transition-all duration-300",
        layoutColumns === 1 ? "max-w-4xl" : "max-w-[1600px] px-4",
      )}
    >
      <div className="sticky top-[69px] z-40 flex flex-row justify-between items-center bg-white dark:bg-card p-2 md:p-4 rounded-xl shadow-md gap-2 md:gap-4 transition-all border border-border/50">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExit}
            title="Exit"
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </Button>
          {quizData.cover_image && (
            <Image
              src={quizData.cover_image}
              alt="Cover"
              width={40}
              height={40}
              className="object-cover rounded-lg hidden sm:block w-10 h-10"
            />
          )}
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg md:text-2xl font-black text-foreground truncate tracking-tight">
              {quizData.title}
            </h1>
            <p className="text-xs font-medium text-muted-foreground truncate">
              {questions.length} Questions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-muted rounded-md p-1 border dark:border-border">
            <Button
              variant={layoutColumns === 1 ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8",
                layoutColumns === 1 && "bg-white dark:bg-background shadow-sm",
              )}
              onClick={() => setLayoutColumns(1)}
              title="Single Column"
            >
              <RectangleVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </Button>
            <Button
              variant={layoutColumns === 2 ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8",
                layoutColumns === 2 && "bg-white dark:bg-background shadow-sm",
              )}
              onClick={() => setLayoutColumns(2)}
              title="Two Columns"
            >
              <Columns2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </Button>
            <Button
              variant={layoutColumns === 3 ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8",
                layoutColumns === 3 && "bg-white dark:bg-background shadow-sm",
              )}
              onClick={() => setLayoutColumns(3)}
              title="Three Columns"
            >
              <LayoutGrid className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Options"
                className="hover:bg-accent/50 dark:hover:bg-accent/20"
              >
                <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShuffleQuestions}>
                <Shuffle className="w-4 h-4 mr-2" /> Shuffle Questions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 h-9 px-3 md:px-4 md:h-10"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save Quiz</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </div>

      <QuizSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        quizId={quizData.id}
        initialTitle={quizData.title}
        initialDescription={quizData.description}
        initialCoverImage={quizData.cover_image}
        initialVisibility={quizData.visibility}
        initialTags={quizData.tags}
        onSave={(updates) => {
          setQuizData((prev) => ({ ...prev, ...updates }));
        }}
      />

      <ConfirmationModal
        open={confirmationModal.open}
        onOpenChange={(open) =>
          setConfirmationModal((prev) => ({ ...prev, open }))
        }
        title={confirmationModal.title}
        description={confirmationModal.description}
        onConfirm={confirmationModal.onConfirm}
        variant={confirmationModal.variant}
        confirmText={confirmationModal.confirmText}
      />

      <div
        className={cn(
          "grid gap-4 md:gap-6",
          layoutColumns === 1 && "grid-cols-1",
          layoutColumns === 2 && "grid-cols-1 md:grid-cols-2",
          layoutColumns === 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {questions.map((q, qIndex) => (
          <Card key={q.id || qIndex} className="bg-gray-50 border-2">
            <CardHeader className="flex flex-col gap-2 px-2 py-3 md:gap-4 md:px-4 md:py-6">
              {/* Top Row: Label & Actions */}
              <div className="flex justify-between items-center w-full">
                <span className="font-bold text-lg text-gray-700">
                  Q{qIndex + 1}
                </span>
                <div className="flex gap-1">
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-blue-600 transition-colors"
                        title="Question Settings"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 space-y-4" align="end">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">
                          Question Type
                        </label>
                        <select
                          className="w-full bg-background border rounded-md px-3 py-2 text-sm"
                          value={q.question_type}
                          onChange={(e) =>
                            updateQuestion(
                              qIndex,
                              "question_type",
                              e.target.value as QuestionType,
                            )
                          }
                        >
                          <option value="quiz">Quiz</option>
                          <option value="true_false">True / False</option>
                          <option value="type_answer">Type Answer</option>
                          <option value="voice">Voice</option>
                          <option value="puzzle">Puzzle (Order)</option>
                          <option value="poll">Poll</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-foreground">
                            Time
                          </label>
                          <div className="flex items-center gap-1">
                            <select
                              value={q.time_limit}
                              onChange={(e) =>
                                updateQuestion(
                                  qIndex,
                                  "time_limit",
                                  parseInt(e.target.value) || 20,
                                )
                              }
                              className="w-full bg-background border rounded-md px-2 py-2 text-sm"
                            >
                              {TIME_PRESETS.map((preset) => (
                                <option key={preset.value} value={preset.value}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              title="Apply to all"
                              onClick={() => applyTimeLimitToAll(q.time_limit)}
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <Layers className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-foreground">
                            Points
                          </label>
                          <select
                            className="w-full bg-background border rounded-md px-2 py-2 text-sm"
                            value={q.points_multiplier || 1}
                            onChange={(e) =>
                              updateQuestion(
                                qIndex,
                                "points_multiplier",
                                parseInt(e.target.value),
                              )
                            }
                          >
                            <option value={1}>Standard</option>
                            <option value={2}>Double</option>
                          </select>
                        </div>
                      </div>

                      {q.question_type === "voice" && (
                        <div className="space-y-2 pt-2 border-t">
                          <label className="text-sm font-bold text-foreground">
                            Answer Format
                          </label>
                          <div className="flex bg-muted/50 rounded-md border overflow-hidden p-1 gap-1">
                            <button
                              className={cn(
                                "flex-1 px-2 py-1.5 text-xs font-semibold rounded transition-colors",
                                q.answer_format === "choice" || !q.answer_format
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                              )}
                              onClick={() =>
                                updateQuestion(
                                  qIndex,
                                  "answer_format",
                                  "choice",
                                )
                              }
                            >
                              Choices
                            </button>
                            <button
                              className={cn(
                                "flex-1 px-2 py-1.5 text-xs font-semibold rounded transition-colors",
                                q.answer_format === "text"
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                              )}
                              onClick={() =>
                                updateQuestion(qIndex, "answer_format", "text")
                              }
                            >
                              Text
                            </button>
                            <button
                              className={cn(
                                "flex-1 px-2 py-1.5 text-xs font-semibold rounded transition-colors",
                                q.answer_format === "audio"
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                              )}
                              onClick={() =>
                                updateQuestion(qIndex, "answer_format", "audio")
                              }
                            >
                              Audio
                            </button>
                          </div>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => duplicateQuestion(qIndex)}
                    className="text-gray-500 hover:text-blue-600"
                    title="Duplicate Question"
                  >
                    <Copy className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteQuestion(qIndex)}
                    className="text-red-500"
                    title="Delete Question"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                  {layoutColumns === 3 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleShuffleAnswers(qIndex)}
                      className="text-gray-500 hover:text-purple-600"
                      title="Shuffle Answers"
                    >
                      <Shuffle className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-col gap-2 w-full">
                  {q.question_type !== "voice" && (
                    <div className="w-full h-48 bg-gray-100 relative group border border-gray-200 rounded-lg overflow-hidden">
                      {q.media_url ? (
                        <>
                          <Image
                            src={q.media_url}
                            alt="Question Media"
                            className="object-contain"
                            fill
                          />
                          <button
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              updateQuestion(qIndex, "media_url", "")
                            }
                            title="Remove Image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                          <div className="flex flex-col gap-3 items-center w-full">
                            {/* Upload Area */}
                            <div className="relative group w-full flex flex-col items-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors">
                              <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                              <span className="text-sm text-gray-500 font-medium">
                                Upload Image
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) =>
                                  handleQuestionImageUpload(qIndex, e)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* For Voice Questions, Audio Recorder IS the main input area */}
                  {q.question_type === "voice" ? (
                    <div className="flex-1 space-y-4">
                      {/* Audio Recorder Component */}
                      <div className="flex flex-col gap-2 border p-4 rounded-lg bg-gray-50 border-blue-200">
                        <div className="flex justify-between items-center mb-2">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => toggleAudioCollapse(qIndex)}
                          >
                            <label className="text-sm font-bold text-gray-700 cursor-pointer">
                              Voice Question Audio
                            </label>
                            {collapsedAudio[qIndex] ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            )}
                          </div>

                          {!collapsedAudio[qIndex] && q.media_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateQuestion(qIndex, "media_url", "")
                              }
                              className="text-red-500 hover:text-red-700 h-6 px-2"
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Remove
                            </Button>
                          )}
                        </div>

                        {!collapsedAudio[qIndex] && (
                          <>
                            {uploadingAudioIndex === qIndex ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                Uploading audio...
                              </div>
                            ) : q.media_url ? (
                              <div className="w-full">
                                <audio
                                  controls
                                  className="w-full h-8"
                                  src={q.media_url}
                                />
                              </div>
                            ) : (
                              <div className="flex gap-2 items-center">
                                {/* Recording Controls */}
                                {recordingState.isRecording &&
                                recordingState.questionIndex === qIndex ? (
                                  <Button
                                    onClick={stopRecording}
                                    variant="destructive"
                                    size="sm"
                                    className="animate-pulse gap-2"
                                  >
                                    <StopCircle className="w-4 h-4" /> Stop Rec
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => startRecording(qIndex)}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-red-200 hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Mic className="w-4 h-4" /> Record
                                  </Button>
                                )}

                                <span className="text-xs text-gray-400">
                                  or
                                </span>

                                {/* File Upload */}
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) =>
                                      handleFileSelect(qIndex, e)
                                    }
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                  >
                                    <Upload className="w-4 h-4" /> Upload File
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Prompt Input below Audio */}
                      <Textarea
                        value={q.title}
                        onChange={(e) => {
                          updateQuestion(qIndex, "title", e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                        className="font-semibold bg-white text-gray-700 resize-none min-h-[80px] border-none shadow-none focus-visible:ring-0 pl-0"
                        placeholder="Add a text prompt (optional)..."
                        rows={1}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 w-full">
                      <Textarea
                        value={q.title}
                        maxLength={120}
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 120);
                          updateQuestion(qIndex, "title", val);
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                        className={cn(
                          "text-xl md:text-2xl font-bold bg-white text-gray-900 resize-none min-h-[120px] py-2 border-none shadow-none focus-visible:ring-0 pl-0 leading-tight placeholder:text-gray-300",
                          layoutColumns === 3 && "w-full",
                        )}
                        placeholder="Question text..."
                        rows={1}
                      />
                      {q.title.length >= 120 && (
                        <p className="text-xs text-red-500 font-semibold animate-pulse">
                          Character limit reached (120/120)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Question Image (Non-Voice) */}
              </div>
            </CardHeader>

            <CardContent className="px-2 pt-0 md:px-4">
              <div
                className={cn(
                  "grid gap-2 transition-all",
                  layoutColumns === 3
                    ? "grid-cols-1"
                    : "grid-cols-1 sm:grid-cols-2", // Stack answers on very small screens
                )}
              >
                {q.question_type === "type_answer" ||
                (q.question_type === "voice" && q.answer_format === "text") ? (
                  <div
                    className={cn(
                      layoutColumns === 3 ? "col-span-1" : "col-span-2",
                    )}
                  >
                    <label className="text-sm font-bold text-gray-700 mb-1 block">
                      Accepted Answer
                    </label>
                    <Textarea
                      value={q.answers[0]?.text || ""}
                      maxLength={500} // Type answer allows more long form
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 500);
                        updateAnswer(qIndex, 0, "text", val);
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      placeholder="Type the correct answer here..."
                      className="border-green-500 ring-1 ring-green-500 min-h-[50px] resize-none overflow-hidden py-3 font-semibold"
                      rows={1}
                    />
                    {/* Usually Type Answer is long, but if we want a limit: */}
                    {/* {(q.answers[0]?.text || "").length >= 500 && <span className="text-xs text-red-500">Limit reached</span>} */}
                  </div>
                ) : q.question_type === "voice" &&
                  q.answer_format === "audio" ? (
                  q.answers.map((a, aIndex) => {
                    const colorKey =
                      a.color || ["red", "blue", "yellow", "green"][aIndex % 4];
                    const bgClass =
                      colors[colorKey as keyof typeof colors] || "bg-gray-400";
                    return (
                      <div key={aIndex} className="flex gap-2 relative">
                        <div
                          className={cn(
                            "p-2 rounded-lg flex items-center justify-center text-white shrink-0 w-10 h-auto",
                            bgClass,
                          )}
                        ></div>
                        <div className="flex-1 relative border rounded-lg p-2 bg-gray-50">
                          <AudioRecorder
                            mediaUrl={a.media_url}
                            storagePath={`${quiz.id}/${qIndex}_ans_${aIndex}`}
                            onUploadComplete={(url) =>
                              updateAnswer(qIndex, aIndex, "media_url", url)
                            }
                            onRemove={() =>
                              updateAnswer(qIndex, aIndex, "media_url", "")
                            }
                            label={`Answer ${aIndex + 1} Audio`}
                            compact={true}
                          />
                          <div className="mt-2">
                            <Input
                              value={a.text}
                              onChange={(e) =>
                                updateAnswer(
                                  qIndex,
                                  aIndex,
                                  "text",
                                  e.target.value,
                                )
                              }
                              placeholder={`Label for Answer ${aIndex + 1} (Optional)`}
                              className="bg-white text-sm"
                            />
                          </div>

                          <button
                            onClick={() => toggleCorrect(qIndex, aIndex)}
                            className={cn(
                              "absolute right-2 top-2 rounded-full p-1 border transition-all z-10 bg-white shadow-sm",
                              a.is_correct
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-gray-300 text-gray-300 hover:border-gray-400",
                            )}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : q.question_type === "puzzle" ? (
                  <PuzzleQuestionEditor
                    answers={q.answers}
                    qIndex={qIndex}
                    onUpdate={(newAnswers) => {
                      const newQuestions = [...questions];
                      newQuestions[qIndex].answers = newAnswers;
                      setQuestions(newQuestions);
                    }}
                    onUpdateText={(aIndex, text) =>
                      updateAnswer(qIndex, aIndex, "text", text)
                    }
                  />
                ) : (
                  q.answers.map((a, aIndex) => {
                    // 1. Determine Color (Fallback to index cycle if missing)
                    const colorKey =
                      a.color || ["red", "blue", "yellow", "green"][aIndex % 4];
                    const isColored = !!colors[colorKey as keyof typeof colors];
                    const bgClass =
                      colors[colorKey as keyof typeof colors] ||
                      "bg-gray-100 dark:bg-muted";

                    return (
                      <div key={aIndex} className="relative w-full">
                        <div className="relative">
                          <Textarea
                            value={a.text}
                            maxLength={50}
                            onChange={(e) => {
                              const val = e.target.value.slice(0, 50);
                              updateAnswer(qIndex, aIndex, "text", val);
                              e.target.style.height = "auto";
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = "auto";
                              target.style.height = `${target.scrollHeight}px`;
                            }}
                            placeholder={`Answer ${aIndex + 1}`}
                            className={cn(
                              "pr-24 min-h-[50px] resize-none overflow-hidden py-3 transition-colors font-semibold text-lg",
                              // Apply background color
                              bgClass,
                              // Apply text contrast
                              isColored
                                ? "text-white placeholder:text-white/70 border-none ring-0 focus-visible:ring-offest-0"
                                : "text-foreground border-2 border-border",
                              // Highlight if correct
                              a.is_correct
                                ? "ring-4 ring-green-400/50 z-10"
                                : "",
                            )}
                            rows={1}
                          />
                          {a.text.length >= 50 && (
                            <div className="absolute -bottom-5 right-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm z-20 font-bold">
                              Limit reached
                            </div>
                          )}
                          {/* Correct Toggle */}
                          {q.question_type !== "poll" &&
                            q.question_type !== "puzzle" && (
                              <button
                                onClick={() => toggleCorrect(qIndex, aIndex)}
                                className={cn(
                                  "absolute right-2 top-2.5 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shadow-sm z-20",
                                  a.is_correct
                                    ? "bg-white text-green-600 border-white scale-110"
                                    : isColored
                                      ? "border-white/30 text-white/30 hover:border-white hover:text-white bg-black/10 hover:bg-black/20"
                                      : "border-gray-300 text-gray-300 hover:border-gray-400 hover:text-gray-400 bg-gray-50",
                                )}
                                title={
                                  a.is_correct
                                    ? "Correct Answer"
                                    : "Mark as Correct"
                                }
                              >
                                <Check className="w-5 h-5" />
                              </button>
                            )}

                          {/* Remove Answer Button */}
                          {(q.question_type === "quiz" ||
                            q.question_type === "poll") &&
                            q.answers.length > 2 && (
                              <button
                                onClick={() => removeAnswer(qIndex, aIndex)}
                                className={cn(
                                  "absolute right-12 top-2.5 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-20",
                                  isColored
                                    ? "text-white/50 hover:text-white hover:bg-black/20"
                                    : "text-gray-400 hover:text-red-500 hover:bg-red-50",
                                )}
                                title="Remove Answer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Answer Button (Only for choice-based types that support dynamic answers) */}
              {(q.question_type === "quiz" || q.question_type === "poll") &&
                q.answers.length < 6 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addAnswer(qIndex)}
                      className="w-full border-dashed gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Answer Option
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={addQuestion}
        variant="outline"
        className="w-full py-8 border-dashed text-xl gap-2"
      >
        <Plus className="w-6 h-6" /> Add Question
      </Button>
      {/* Saving Overlay */}
      {saving && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-card p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200 border border-border/50">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-bold text-foreground">
              Saving Quiz...
            </h3>
            <p className="text-muted-foreground mt-2">
              Just a moment while we save your changes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
