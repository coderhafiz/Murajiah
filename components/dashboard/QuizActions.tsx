"use client";

import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Play,
  Eye,
  Edit,
  Copy,
  Trash2,
  Loader2,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { duplicateQuiz, deleteQuiz } from "@/app/actions/quiz";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Import Link
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import LoadingModal from "@/components/ui/LoadingModal";
import ShareModal from "@/components/share/ShareModal";

export function QuizActions({ quizId }: { quizId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [confirmModal, setConfirmModal] = useState<{
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

  const handleStart = () => {
    formRef.current?.requestSubmit();
  };

  const confirmDuplicate = () => {
    setConfirmModal({
      open: true,
      title: "Duplicate Quiz",
      description: "Are you sure you want to duplicate this quiz?",
      confirmText: "Duplicate",
      onConfirm: handleDuplicate,
    });
  };

  const handleDuplicate = async () => {
    setLoading(true);
    const result = await duplicateQuiz(quizId);
    setLoading(false);

    if (result.success) {
      router.refresh();
    } else {
      alert("Failed to duplicate quiz");
    }
  };

  const confirmDelete = () => {
    setConfirmModal({
      open: true,
      title: "Delete Quiz",
      description:
        "Are you sure you want to delete this quiz? This action cannot be undone.",
      variant: "destructive",
      confirmText: "Delete",
      onConfirm: handleDelete,
    });
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteQuiz(quizId);
    setLoading(false);

    if (result.success) {
      router.refresh();
    } else {
      alert("Failed to delete quiz: " + (result.error || "Unknown error"));
    }
  };

  const handlePreview = async () => {
    const formData = new FormData();
    formData.append("quizId", quizId);
    formData.append("isPreview", "true");

    const res = await fetch("/api/game/create", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const url = res.url;
      window.open(url, "_blank");
    } else {
      alert("Failed to start preview");
    }
  };

  return (
    <>
      {/* Hidden form for starting the game */}
      <form
        ref={formRef}
        action="/api/game/create"
        method="POST"
        className="hidden"
        target="_blank"
      >
        <input type="hidden" name="quizId" value={quizId} />
      </form>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full"
            onClick={(e) => e.preventDefault()}
          >
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={5}
          className="w-48 p-1 bg-popover/95 text-popover-foreground backdrop-blur-sm border-border/50 shadow-xl rounded-xl z-50"
          // @ts-expect-error - Radix UI type mismatch for onOpenAutoFocus
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
        >
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleStart} className="cursor-pointer">
            <Play className="mr-2 h-4 w-4" />
            Start Game
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePreview} className="cursor-pointer">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </DropdownMenuItem>
          <ShareModal
            quizId={quizId}
            trigger={
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer"
              >
                <Users className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
            }
          />
          <DropdownMenuItem asChild>
            <Link
              href={`/dashboard/quiz/${quizId}`}
              className="w-full cursor-pointer flex items-center"
              prefetch={false}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={confirmDuplicate}
            disabled={loading}
            className="cursor-pointer"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={confirmDelete}
            disabled={loading}
            className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmationModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        onConfirm={confirmModal.onConfirm}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />

      <LoadingModal open={loading} message="Processing..." />
    </>
  );
}
