"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { clearAllReports } from "@/app/actions/reports";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import LoadingModal from "@/components/ui/LoadingModal";

export function ClearReportsButton() {
  const [isClearing, setIsClearing] = useState(false);
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const confirmClear = () => {
    setModalOpen(true);
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const result = await clearAllReports();
      toast.success(
        `Successfully cleared ${result.count} reports and history.`,
      );
      router.refresh();
    } catch (error) {
      console.error("Failed to clear reports:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to clear reports",
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={confirmClear}
        disabled={isClearing}
        className="gap-2"
      >
        {isClearing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
        Clear History
      </Button>

      <ConfirmationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Clear All Reports?"
        description="Are you sure you want to clear all completion reports? This action cannot be undone."
        confirmText="Clear All"
        variant="destructive"
        onConfirm={handleClear}
      />

      <LoadingModal open={isClearing} message="Clearing all reports..." />
    </>
  );
}
