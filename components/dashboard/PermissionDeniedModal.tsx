"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface PermissionDeniedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PermissionDeniedModal({
  open,
  onOpenChange,
}: PermissionDeniedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-500" />
          </div>
          <DialogTitle className="text-xl text-center">
            Permission Denied
          </DialogTitle>
          <DialogDescription className="text-center">
            You do not have permission to edit this quiz. You are currently
            viewing it as a <strong>Collaborator (Viewer)</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground text-center px-4">
          <p>
            To make changes, please ask the quiz owner to upgrade your role to{" "}
            <strong>Editor</strong>.
          </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
