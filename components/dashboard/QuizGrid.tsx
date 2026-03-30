"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateQuizModal from "@/components/dashboard/CreateQuizModal";
import { QuizCard } from "./QuizCard";
import { useQuizLibrary } from "./QuizLibraryContext";
import { toggleFavorite } from "@/app/actions/quiz";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  created_at: string;
  creator_id: string;
  status: string;
  is_favorite?: boolean;
  folder_id?: string | null;
};

interface QuizGridProps {
  quizzes: Quiz[];
  searchQuery: string;
  filter: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export function QuizGrid({
  quizzes,
  searchQuery,
  filter,
}: QuizGridProps) {
  const router = useRouter();
  const {
    selectedQuizIds,
    setSelectedQuizIds,
    isSelectionMode,
    setIsSelectionMode,
    openMoveModal,
    viewMode,
  } = useQuizLibrary();

  const handleToggleSelection = (id: string) => {
    const newSelected = new Set(selectedQuizIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuizIds(newSelected);
    if (newSelected.size > 0 && !isSelectionMode) setIsSelectionMode(true);
    if (newSelected.size === 0 && isSelectionMode) setIsSelectionMode(false);
  };

  const handleToggleFavorite = async (
    e: React.MouseEvent,
    quizId: string,
    currentStatus: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await toggleFavorite(quizId, !currentStatus);
      router.refresh(); // Update server component data
    } catch (error) {
      console.error("Failed to toggle favorite", error);
      toast.error("Failed to update favorite status");
    }
  };

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-24 bg-card/50 rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center">
        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <Filter className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {searchQuery ? "No matches found" : "No quizzes here"}
        </h2>
        <p className="text-muted-foreground mt-2 mb-6 max-w-sm">
          {searchQuery
            ? "Try adjusting your search terms or filters."
            : filter === "draft"
              ? "You don't have any drafts yet."
              : filter === "shared"
                ? "No shared quizzes found."
                : filter === "favorites"
                  ? "No favorites yet. Star some quizzes to see them here!"
                  : "Create your first quiz to get started!"}
        </p>
        {!searchQuery && filter === "all" && (
          <CreateQuizModal>
            <Button
              variant="default"
              className="font-bold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Quiz
            </Button>
          </CreateQuizModal>
        )}
      </div>
    );
  }

  return (
    <motion.div
      layout
      variants={container}
      initial="hidden"
      animate="show"
      className={cn(
        "gap-6",
        viewMode === "grid"
          ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          : "flex flex-col",
      )}
    >
      <AnimatePresence mode="popLayout">
        {quizzes.map((quiz) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            viewMode={viewMode}
            isSelectionMode={isSelectionMode}
            isSelected={selectedQuizIds.has(quiz.id)}
            onToggleSelection={handleToggleSelection}
            onToggleFavorite={handleToggleFavorite}
            onMove={() => openMoveModal(quiz.id)}
          />
        ))}
      </AnimatePresence>

    </motion.div>
  );
}
