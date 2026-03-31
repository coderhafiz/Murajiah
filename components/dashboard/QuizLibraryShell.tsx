"use client";

import { useState, ReactNode, useTransition, useOptimistic } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CreateQuizModal from "@/components/dashboard/CreateQuizModal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  CheckSquare,
  MoreVertical,
  Folder as FolderIcon,
  Trash2,
  Layers,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { deleteQuizzes } from "@/app/actions/quiz";
import { moveQuizzesToFolder, moveQuizToFolder } from "@/app/actions/folders";
import { QuizLibraryProvider, useQuizLibrary } from "./QuizLibraryContext";

interface QuizLibraryShellProps {
  children: ReactNode;
  foldersSidebar: ReactNode;
  isPremium?: boolean;
  folders: { id: string; name: string; is_hidden?: boolean }[];
  counts: {
    all: number;
    favorites: number;
    shared: number;
    published: number;
    draft: number;
  };
}

function QuizLibraryShellContent({
  children,
  foldersSidebar,
  isPremium,
  folders,
  counts,
}: QuizLibraryShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const {
    selectedQuizIds,
    setSelectedQuizIds,
    isSelectionMode,
    setIsSelectionMode,
    isMoveModalOpen,
    setIsMoveModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    quizToMove,
    setQuizToMove,
    viewMode,
    setViewMode,
  } = useQuizLibrary();

  // URL Params State
  const urlFilter = searchParams.get("filter") || "all";
  const urlSearchQuery = searchParams.get("q") || "";
  const selectedFolderId = searchParams.get("folder");

  // Optimistic State for immediate visual feedback
  const [optimisticParams, setOptimisticParams] = useOptimistic(
    { filter: urlFilter, q: urlSearchQuery },
    (state, newParams: { filter?: string; q?: string }) => ({
      ...state,
      ...newParams,
    })
  );

  const filter = optimisticParams.filter;
  const searchQuery = optimisticParams.q;

  const [targetFolderId, setTargetFolderId] = useState<string>("unorganized");
  const [moving, setMoving] = useState(false);

  const updateParams = (updates: Record<string, string | null>) => {
    // 1. Immediately update optimistic UI state
    startTransition(() => {
      setOptimisticParams(updates as { filter?: string; q?: string });
      
      // 2. Perform the actual navigation
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedQuizIds);
    const result = await deleteQuizzes(ids);
    if (result.success) {
      setSelectedQuizIds(new Set());
      setIsSelectionMode(false);
      toast.success("Quizzes deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete quizzes");
    }
    setIsDeleteModalOpen(false);
  };

  const handleMoveQuiz = async () => {
    const folderId = targetFolderId === "unorganized" ? null : targetFolderId;
    try {
      setMoving(true);
      if (quizToMove) {
        await moveQuizToFolder(quizToMove, folderId);
        toast.success("Quiz moved");
      } else if (selectedQuizIds.size > 0) {
        await moveQuizzesToFolder(Array.from(selectedQuizIds), folderId);
        toast.success(`${selectedQuizIds.size} quizzes moved`);
        setIsSelectionMode(false);
        setSelectedQuizIds(new Set());
      }
      setIsMoveModalOpen(false);
      setQuizToMove(null);
      router.refresh();
    } catch {
      toast.error("Failed to move quiz(zes)");
    } finally {
      setMoving(false);
    }
  };

  const tabs: { id: string; label: string; count: number }[] = [
    { id: "all", label: "All Quizzes", count: counts.all },
    { id: "favorites", label: "Favorites", count: counts.favorites },
    { id: "shared", label: "Shared", count: counts.shared },
    { id: "published", label: "Published", count: counts.published },
    { id: "draft", label: "Drafts", count: counts.draft },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-start relative min-h-[calc(100vh-70px)]">
      {/* Sidebar Area (Folders) */}
      <div className="w-full lg:w-64 shrink-0 lg:sticky lg:top-[70px] lg:h-[calc(100vh-70px)] lg:overflow-y-auto lg:pb-10 no-scrollbar border-r border-border/50 bg-card/30">
        {foldersSidebar}
      </div>

      {/* Main Content Area (Quizzes) */}
      <div className="flex-1 w-full min-w-0 p-4 md:p-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {selectedFolderId
              ? folders.find((f) => f.id === selectedFolderId)?.name || "Folder"
              : "My Library"}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {selectedQuizIds.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="shadow-sm">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      setQuizToMove(null);
                      setIsMoveModalOpen(true);
                    }}
                    className="cursor-pointer gap-2 font-medium"
                  >
                    <FolderIcon className="w-4 h-4" />
                    Move ({selectedQuizIds.size})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="cursor-pointer gap-2 font-medium text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete ({selectedQuizIds.size})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <CreateQuizModal isPremium={isPremium}>
              <Button
                size="sm"
                className="flex items-center shadow-lg shadow-purple-500/20 font-bold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5 mr-1" /> Create New
              </Button>
            </CreateQuizModal>
          </div>
        </div>

        <div className="sticky top-[70px] z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pt-2 pb-2 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-2 rounded-xl border border-border/50 shadow-sm">
            <div className="flex bg-muted/50 p-1 rounded-lg self-start md:self-auto w-full md:w-auto overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => updateParams({ filter: tab.id })}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary rounded-md shadow-md"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                    {isActive && isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin relative z-10" />
                    ) : (
                      <span className={cn(
                          "relative z-10 text-xs px-1.5 py-0.5 rounded-full",
                          isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button
                variant={isSelectionMode ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={cn(isSelectionMode && "bg-primary/10 text-primary")}
              >
                <CheckSquare className="w-4 h-4" />
              </Button>

              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search quizzes..."
                  defaultValue={searchQuery}
                  onChange={(e) => updateParams({ q: e.target.value || null })}
                  className="pl-9 bg-background border-border/50"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-md transition-all relative",
                    viewMode === "grid" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md transition-all relative",
                    viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {children}

        <ConfirmationModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          title="Delete Quizzes?"
          description={`Are you sure you want to delete ${selectedQuizIds.size} selected quizzes?`}
          confirmText="Delete"
          variant="destructive"
          onConfirm={confirmBulkDelete}
        />

        <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{quizToMove ? "Move Quiz" : `Move ${selectedQuizIds.size} Quizzes`}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] mt-4 pr-4">
              <RadioGroup value={targetFolderId} onValueChange={setTargetFolderId} className="gap-2">
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="unorganized" id="r-unorganized" />
                  <Label htmlFor="r-unorganized" className="flex items-center gap-2 cursor-pointer w-full">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Unorganized</span>
                  </Label>
                </div>
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value={folder.id} id={`r-${folder.id}`} />
                    <Label htmlFor={`r-${folder.id}`} className="flex items-center gap-2 cursor-pointer w-full">
                      <FolderIcon className="w-4 h-4 text-primary" />
                      <span className="font-medium">{folder.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMoveModalOpen(false)}>Cancel</Button>
              <Button onClick={handleMoveQuiz} disabled={moving}>{moving ? "Moving..." : "Move"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function QuizLibraryShell(props: QuizLibraryShellProps) {
  return (
    <QuizLibraryProvider>
      <QuizLibraryShellContent {...props} />
    </QuizLibraryProvider>
  );
}
