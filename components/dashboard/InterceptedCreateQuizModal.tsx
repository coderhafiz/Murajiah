"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateQuizForm } from "@/components/dashboard/CreateQuizModal";
import { Sparkles } from "lucide-react";

export function InterceptedCreateQuizModal({ isPremium }: { isPremium: boolean }) {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
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
          onSuccess={handleClose}
          onCancel={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
