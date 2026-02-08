"use client";

import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface LoadingModalProps {
  open: boolean;
  message?: string;
}

export default function LoadingModal({
  open,
  message = "Loading...",
}: LoadingModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px] flex flex-col items-center justify-center min-h-[200px] border-none shadow-none bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">Loading</DialogTitle>
        <div className="bg-white/90 dark:bg-gray-900/90 p-8 rounded-2xl flex flex-col items-center shadow-2xl backdrop-blur-sm">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 text-center">
            {message}
          </h2>
        </div>
      </DialogContent>
    </Dialog>
  );
}
