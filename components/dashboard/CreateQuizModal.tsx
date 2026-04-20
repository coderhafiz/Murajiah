"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AIQuestionGenerator } from "./AIQuestionGenerator";

export interface CreateQuizFormProps {
  isPremium?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateQuizForm({
  isPremium = false,
  onSuccess,
  onCancel,
}: CreateQuizFormProps) {
  const router = useRouter();

  return (
    <AIQuestionGenerator
      isPremium={isPremium}
      onSuccess={(_questions, quizId) => {
        if (onSuccess) onSuccess();
        if (quizId) router.push(`/dashboard/quiz/${quizId}`);
      }}
      onManualEntry={() => {
        if (onCancel) onCancel();
        router.push("/dashboard/create");
      }}
      showCreateFromScratch={true}
    />
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CreateQuizModal({
  children,
  isPremium = false,
}: {
  children: React.ReactNode;
  isPremium?: boolean;
}) {
  const [open, setOpen] = useState(false);

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

        <CreateQuizForm
          isPremium={isPremium}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
