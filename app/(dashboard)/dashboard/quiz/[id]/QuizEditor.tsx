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
} from "lucide-react";
import { cn } from "@/lib/utils";
import AudioRecorder from "@/components/ui/AudioRecorder";
import QuizSettingsDialog from "@/components/dashboard/QuizSettingsDialog";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Reorder } from "framer-motion";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import PuzzleQuestionEditor from "@/components/dashboard/quiz/PuzzleQuestionEditor";

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
}: {
  quiz: {
    id: string;
    title: string;
    description?: string | null;
    cover_image?: string | null;
  };
  initialQuestions: Question[];
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
  }>({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description || null,
    cover_image: quiz.cover_image || null,
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);
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

  // Settings visibility for 3-column layout
  const [settingsExpanded, setSettingsExpanded] = useState<
    Record<number, boolean>
  >({});

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

  const toggleSettings = (index: number) => {
    setSettingsExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

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
    const file = e.target.files[0];

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${quiz.id}/q_${index}_${Date.now()}.${fileExt}`;

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

      // Update quiz status
      const { error: quizError } = await supabase
        .from("quizzes")
        .update({ status })
        .eq("id", quiz.id);

      if (quizError) throw quizError;

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
        "space-y-8 mx-auto pb-20 transition-all duration-300",
        layoutColumns === 1 ? "max-w-4xl" : "max-w-[1600px] px-4",
      )}
    >
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleExit} title="Exit">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          {quizData.cover_image && (
            <Image
              src={quizData.cover_image}
              alt="Cover"
              width={64}
              height={64}
              className="object-cover rounded-lg"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-500">
              {quizData.title}
            </h1>
            <p className="text-sm text-gray-700">
              {questions.length} Questions
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1 mr-2 border">
            <Button
              variant={layoutColumns === 1 ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8",
                layoutColumns === 1 && "bg-white shadow-sm",
              )}
              onClick={() => setLayoutColumns(1)}
              title="Single Column"
            >
              <RectangleVertical className="w-4 h-4 text-gray-500" />
            </Button>
            <Button
              variant={layoutColumns === 2 ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8",
                layoutColumns === 2 && "bg-white shadow-sm",
              )}
              onClick={() => setLayoutColumns(2)}
              title="Two Columns"
            >
              <Columns2 className="w-4 h-4 text-gray-500" />
            </Button>
            <Button
              variant={layoutColumns === 3 ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8",
                layoutColumns === 3 && "bg-white shadow-sm",
              )}
              onClick={() => setLayoutColumns(3)}
              title="Three Columns"
            >
              <LayoutGrid className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={handleShuffleQuestions}
            title="Shuffle Questions"
          >
            <Shuffle className="w-4 h-4 mr-2" /> Shuffle Qs
          </Button>
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Quiz"}
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
          "grid gap-6",
          layoutColumns === 1 && "grid-cols-1",
          layoutColumns === 2 && "grid-cols-1 md:grid-cols-2",
          layoutColumns === 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {questions.map((q, qIndex) => (
          <Card key={q.id || qIndex} className="bg-gray-50 border-2">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex-1 space-y-4">
                <div
                  className={cn(
                    "flex gap-4",
                    layoutColumns === 3 ? "flex-col" : "flex-row",
                  )}
                >
                  {layoutColumns === 3 ? (
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-lg text-gray-500">
                        Q{qIndex + 1}
                      </span>
                      <div className="flex gap-1 items-start">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSettings(qIndex)}
                          className={cn(
                            "text-muted-foreground hover:text-foreground",
                            settingsExpanded[qIndex] &&
                              "bg-accent text-primary",
                          )}
                          title="Toggle Settings"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShuffleAnswers(qIndex)}
                          className="text-gray-500 hover:text-purple-600"
                          title="Shuffle Answers"
                        >
                          <Shuffle className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span className="font-bold text-lg pt-2 text-gray-500">
                      Q{qIndex + 1}
                    </span>
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
                        className="font-semibold bg-white text-gray-700 resize-none overflow-hidden min-h-[80px] border-none shadow-none focus-visible:ring-0 pl-0"
                        placeholder="Add a text prompt (optional)..."
                        rows={1}
                      />
                    </div>
                  ) : (
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
                      className={cn(
                        "text-lg font-semibold bg-white text-gray-700 resize-none overflow-hidden min-h-[80px] py-2 border-none shadow-none focus-visible:ring-0 pl-0",
                        layoutColumns === 3 && "w-full",
                      )}
                      placeholder="Question text..."
                      rows={1}
                    />
                  )}
                </div>

                {/* Question Image (Non-Voice) */}

                {(layoutColumns !== 3 || settingsExpanded[qIndex]) && (
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-gray-700">
                        Type:
                      </label>
                      <select
                        className="bg-white border-2 border-gray-300 rounded-md px-2 py-1 text-gray-900 font-medium"
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

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-gray-700">
                        Time limit:
                      </label>
                      <div className="flex items-center">
                        <select
                          value={q.time_limit}
                          onChange={(e) =>
                            updateQuestion(
                              qIndex,
                              "time_limit",
                              parseInt(e.target.value) || 20,
                            )
                          }
                          className="h-9 w-40 rounded-md border-2 border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-gray-900 font-medium"
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
                          title="Apply time to all questions"
                          onClick={() => applyTimeLimitToAll(q.time_limit)}
                          className="h-9 w-9 ml-1 text-gray-400 hover:text-blue-600"
                        >
                          <Layers className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-gray-700">
                        Points:
                      </label>
                      <select
                        className="bg-white border-2 border-gray-300 rounded-md px-2 py-1 text-gray-900 font-medium"
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

                    {q.question_type === "voice" && (
                      <div className="flex items-center gap-2 flex-1">
                        <label className="text-sm font-bold text-gray-700">
                          Answer Format:
                        </label>
                        <div className="flex bg-white rounded-md border overflow-hidden">
                          <button
                            className={cn(
                              "px-3 py-1 text-sm font-medium transition-colors",
                              q.answer_format === "choice" || !q.answer_format
                                ? "bg-blue-100 text-blue-700"
                                : "hover:bg-gray-50",
                            )}
                            onClick={() =>
                              updateQuestion(qIndex, "answer_format", "choice")
                            }
                          >
                            Choices
                          </button>
                          <div className="w-px bg-gray-200"></div>
                          <button
                            className={cn(
                              "px-3 py-1 text-sm font-medium transition-colors",
                              q.answer_format === "text"
                                ? "bg-blue-100 text-blue-700"
                                : "hover:bg-gray-50",
                            )}
                            onClick={() =>
                              updateQuestion(qIndex, "answer_format", "text")
                            }
                          >
                            Text Input
                          </button>
                          <div className="w-px bg-gray-200"></div>
                          <button
                            className={cn(
                              "px-3 py-1 text-sm font-medium transition-colors",
                              q.answer_format === "audio"
                                ? "bg-blue-100 text-blue-700"
                                : "hover:bg-gray-50",
                            )}
                            onClick={() =>
                              updateQuestion(qIndex, "answer_format", "audio")
                            }
                          >
                            Audio Answers
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {layoutColumns !== 3 && (
                <div className="flex gap-1 items-start">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSettings(qIndex)}
                    className={cn(
                      "text-gray-500",
                      settingsExpanded[qIndex] && "bg-gray-100 text-blue-600",
                    )}
                    title="Toggle Settings"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
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
                </div>
              )}
            </CardHeader>
            {q.question_type !== "voice" && (
              <div className="w-full h-48 bg-gray-100 relative group border-y border-gray-100 mb-4">
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
                      onClick={() => updateQuestion(qIndex, "media_url", "")}
                      title="Remove Image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors relative">
                    <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500 font-medium">
                      Add Image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleQuestionImageUpload(qIndex, e)}
                    />
                  </div>
                )}
              </div>
            )}
            <CardContent>
              <div
                className={cn(
                  "grid gap-4",
                  layoutColumns === 3 ? "grid-cols-1" : "grid-cols-2",
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
                    <Input
                      value={q.answers[0]?.text || ""}
                      onChange={(e) =>
                        updateAnswer(qIndex, 0, "text", e.target.value)
                      }
                      placeholder="Type the correct answer here..."
                      className="border-green-500 ring-1 ring-green-500"
                    />
                  </div>
                ) : q.question_type === "voice" &&
                  q.answer_format === "audio" ? (
                  q.answers.map((a, aIndex) => (
                    <div key={aIndex} className="flex gap-2 relative">
                      <div
                        className={cn(
                          "p-2 rounded-lg flex items-center justify-center text-white shrink-0 w-10 h-auto",
                          colors[a.color as keyof typeof colors] ||
                            "bg-gray-400",
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
                  ))
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
                  q.answers.map((a, aIndex) => (
                    <div key={aIndex} className="flex gap-2 relative">
                      <div
                        className={cn(
                          "p-2 rounded-lg flex items-center justify-center text-white shrink-0 w-10",
                          colors[a.color as keyof typeof colors] ||
                            "bg-gray-400",
                        )}
                      >
                        {q.question_type === "puzzle" && (
                          <span className="font-bold">{aIndex + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 relative">
                        <Input
                          value={a.text}
                          onChange={(e) =>
                            updateAnswer(qIndex, aIndex, "text", e.target.value)
                          }
                          placeholder={`Answer ${aIndex + 1}`}
                          className={cn(
                            "pr-10 border-2",
                            a.is_correct
                              ? "border-green-500 ring-1 ring-green-500"
                              : "",
                          )}
                        />
                        {/* Correct Toggle - Hide for Polls */}
                        {q.question_type !== "poll" &&
                          q.question_type !== "puzzle" && (
                            <button
                              onClick={() => toggleCorrect(qIndex, aIndex)}
                              className={cn(
                                "absolute right-2 top-2.5 w-7 h-7 rounded-full flex items-center justify-center border transition-all",
                                a.is_correct
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-gray-400 text-gray-400 hover:border-gray-500",
                              )}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
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
