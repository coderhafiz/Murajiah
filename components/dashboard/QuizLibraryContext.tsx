"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface QuizLibraryContextType {
  selectedQuizIds: Set<string>;
  setSelectedQuizIds: (ids: Set<string>) => void;
  isSelectionMode: boolean;
  setIsSelectionMode: (mode: boolean) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  
  // Modal Triggers
  isMoveModalOpen: boolean;
  setIsMoveModalOpen: (open: boolean) => void;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (open: boolean) => void;
  quizToMove: string | null;
  setQuizToMove: (id: string | null) => void;

  openMoveModal: (quizId?: string) => void;
  openDeleteModal: () => void;
}

const QuizLibraryContext = createContext<QuizLibraryContextType | undefined>(undefined);

export function QuizLibraryProvider({ children }: { children: ReactNode }) {
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quizToMove, setQuizToMove] = useState<string | null>(null);

  const openMoveModal = (quizId?: string) => {
    setQuizToMove(quizId || null);
    setIsMoveModalOpen(true);
  };

  const openDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  return (
    <QuizLibraryContext.Provider
      value={{
        selectedQuizIds,
        setSelectedQuizIds,
        isSelectionMode,
        setIsSelectionMode,
        viewMode,
        setViewMode,
        isMoveModalOpen,
        setIsMoveModalOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        quizToMove,
        setQuizToMove,
        openMoveModal,
        openDeleteModal,
      }}
    >
      {children}
    </QuizLibraryContext.Provider>
  );
}

export function useQuizLibrary() {
  const context = useContext(QuizLibraryContext);
  if (context === undefined) {
    throw new Error("useQuizLibrary must be used within a QuizLibraryProvider");
  }
  return context;
}
