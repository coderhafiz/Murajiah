"use client";

import { useState, useMemo, useEffect } from "react";
import CreateQuizModal from "@/components/dashboard/CreateQuizModal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuizActions } from "@/components/dashboard/QuizActions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Star,
  Trash2,
  CheckSquare,
  Folder as FolderIcon,
  Layers,
  PanelLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toggleFavorite, deleteQuizzes } from "@/app/actions/quiz";
import FolderSidebar from "@/components/dashboard/FolderSidebar";
import {
  Folder,
  moveQuizToFolder,
  moveQuizzesToFolder,
} from "@/app/actions/folders";
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

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  created_at: string;
  creator_id: string;
  status: string; // 'draft' | 'published'
  is_favorite?: boolean;
  folder_id?: string | null;
};

export default function QuizLibrary({
  quizzes,
  folders,
  currentUserId,
}: {
  quizzes: Quiz[];
  folders: Folder[];
  currentUserId: string;
}) {
  const [filter, setFilter] = useState<
    "all" | "draft" | "published" | "favorites" | "shared"
  >("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Folder State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Move Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [quizToMove, setQuizToMove] = useState<string | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>("unorganized");
  const [moving, setMoving] = useState(false);

  // Load view preference on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("quizViewMode");
    if (savedMode === "grid" || savedMode === "list") {
      setTimeout(() => setViewMode(savedMode), 0);
    }
  }, []);

  const handleViewChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("quizViewMode", mode);
  };

  const toggleSelection = (id: string) => {
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

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedQuizIds);
    const result = await deleteQuizzes(ids);
    if (result.success) {
      setSelectedQuizIds(new Set());
      setIsSelectionMode(false);
      toast.success("Quizzes deleted");
    } else {
      toast.error("Failed to delete quizzes");
    }
  };

  const handleBulkDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const openMoveModal = (quizId?: string) => {
    if (quizId) {
      const quiz = quizzes.find((q) => q.id === quizId);
      setQuizToMove(quizId);
      setTargetFolderId(quiz?.folder_id || "unorganized");
    } else {
      setQuizToMove(null); // Bulk mode
      setTargetFolderId("unorganized"); // Default or maybe keep previous?
    }
    setIsMoveModalOpen(true);
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
      setQuizToMove(null); // Reset
    } catch {
      toast.error("Failed to move quiz(zes)");
    } finally {
      setMoving(false);
    }
  };

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      // 1. Folder Filter
      if (selectedFolderId === "unorganized") {
        if (quiz.folder_id) return false;
      } else if (selectedFolderId !== null) {
        if (quiz.folder_id !== selectedFolderId) return false;
      }

      // 2. Tab Filter
      let matchesFilter = true;
      if (filter === "favorites") {
        matchesFilter = !!quiz.is_favorite;
      } else if (filter === "shared") {
        matchesFilter = quiz.creator_id !== currentUserId;
      } else if (filter !== "all") {
        matchesFilter = quiz.status === filter;
      }

      // 3. Search Filter
      const matchesSearch =
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (quiz.description &&
          quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [quizzes, filter, searchQuery, currentUserId, selectedFolderId]);

  // Counts
  const counts = useMemo(() => {
    // Filter by folder first (optional? usually tabs filter strictly, but let's say tabs filter within folder)
    // Actually, usually filters are ANDed.
    // So counts should reflect the CURRENT folder view? Or global counts?
    // Let's make counts reflect GLOBAL counts for simplicity, or filtered?
    // Usually tabs are top-level. Folders are orthogonal?
    // Let's say Folders are the PRIMARY organization.
    // So if I select "Biology Folder", "Published" tab shows published quizzes IN biology folder.

    const quizzesInFolder =
      selectedFolderId === null
        ? quizzes
        : selectedFolderId === "unorganized"
          ? quizzes.filter((q) => !q.folder_id)
          : quizzes.filter((q) => q.folder_id === selectedFolderId);

    return {
      all: quizzesInFolder.length,
      draft: quizzesInFolder.filter((q) => q.status === "draft").length,
      published: quizzesInFolder.filter(
        (q) => q.status === "published" || !q.status,
      ).length,
      favorites: quizzesInFolder.filter((q) => q.is_favorite).length,
      shared: quizzesInFolder.filter((q) => q.creator_id !== currentUserId)
        .length,
    };
  }, [quizzes, currentUserId, selectedFolderId]);

  const tabs: {
    id: "all" | "draft" | "published" | "favorites" | "shared";
    label: string;
    count: number;
  }[] = [
    { id: "all", label: "All Quizzes", count: counts.all },
    { id: "favorites", label: "Favorites", count: counts.favorites },
    { id: "shared", label: "Shared", count: counts.shared },
    { id: "published", label: "Published", count: counts.published },
    { id: "draft", label: "Drafts", count: counts.draft },
  ];

  const handleToggleFavorite = async (
    e: React.MouseEvent,
    quizId: string,
    currentStatus: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleFavorite(quizId, !currentStatus);
    } catch (error) {
      console.error("Failed to toggle favorite", error);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start relative">
      {/* Sidebar with Sticky & Collapse logic */}
      <div
        className={cn(
          "shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          isSidebarOpen ? "w-full lg:w-64 opacity-100" : "w-0 opacity-0 lg:w-0",
          // Sticky on Desktop
          "lg:sticky lg:top-[85px] lg:h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-2 lg:block",
        )}
      >
        <FolderSidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          className="w-full"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 w-full min-w-0">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex shrink-0 text-muted-foreground hover:text-foreground"
              title={isSidebarOpen ? "Hide Sidebar" : "Show Folders"}
            >
              <PanelLeft
                className={cn(
                  "w-5 h-5 transition-transform",
                  !isSidebarOpen && "rotate-180",
                )}
              />
            </Button>

            <h1 className="text-3xl font-black text-foreground tracking-tight">
              {selectedFolderId === null
                ? "All Quizzes"
                : selectedFolderId === "unorganized"
                  ? "Unorganized Quizzes"
                  : folders.find((f) => f.id === selectedFolderId)?.name ||
                    "Folder"}
            </h1>
          </div>
          <div className="flex gap-2">
            {selectedQuizIds.size > 0 && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => openMoveModal()}
                  className="gap-2 shadow-sm font-bold animate-in fade-in slide-in-from-right-8"
                >
                  <FolderIcon className="w-4 h-4" /> Move (
                  {selectedQuizIds.size})
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDeleteClick}
                  className="gap-2 shadow-sm font-bold animate-in fade-in slide-in-from-right-4"
                >
                  <Trash2 className="w-4 h-4" /> Delete ({selectedQuizIds.size})
                </Button>
              </>
            )}
            <CreateQuizModal>
              <Button className="gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 font-bold">
                <Plus className="w-5 h-5" /> Create New
              </Button>
            </CreateQuizModal>
          </div>
        </div>

        <ConfirmationModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          title="Delete Quizzes?"
          description={`Are you sure you want to delete ${selectedQuizIds.size} selected quizzes? This action cannot be undone.`}
          confirmText="Delete"
          variant="destructive"
          onConfirm={confirmBulkDelete}
        />

        {/* Filters Bar */}
        <div className="sticky top-[73px] z-40 flex flex-col md:flex-row gap-4 justify-between items-center bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-2 rounded-xl border border-border/50 shadow-sm mb-6 transition-all">
          {/* Tabs */}
          <div className="flex bg-muted/50 p-1 rounded-lg self-start md:self-auto w-full md:w-auto overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
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
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  <span
                    className={cn(
                      "relative z-10 text-xs px-1.5 py-0.5 rounded-full",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Bulk Select Toggle */}
            <Button
              variant={isSelectionMode ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={cn(
                "shrink-0",
                isSelectionMode &&
                  "bg-primary/10 text-primary hover:bg-primary/20",
              )}
              title="Select Multiple"
            >
              <CheckSquare className="w-4 h-4" />
            </Button>

            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border/50 focus:border-primary/50 transition-all text-sm"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 shrink-0">
              <button
                onClick={() => handleViewChange("grid")}
                className={cn(
                  "p-2 rounded-md transition-all",
                  viewMode === "grid"
                    ? "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewChange("list")}
                className={cn(
                  "p-2 rounded-md transition-all",
                  viewMode === "list"
                    ? "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Grid/List Container */}
        {filteredQuizzes.length > 0 ? (
          <motion.div
            layout
            className={cn(
              "gap-6",
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" // Adjusted grid
                : "flex flex-col",
            )}
          >
            <AnimatePresence mode="popLayout">
              {filteredQuizzes.map((quiz) => (
                <motion.div
                  layout
                  key={quiz.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={cn(viewMode === "list" && "w-full")}
                >
                  <Link
                    href={`/dashboard/quiz/${quiz.id}`}
                    className="block h-full group"
                  >
                    <Card
                      className={cn(
                        "overflow-hidden hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 bg-card border-border/50 group flex h-full",
                        viewMode === "grid"
                          ? "flex-col"
                          : "flex-row min-h-20 h-auto items-stretch",
                      )}
                    >
                      <div
                        className={cn(
                          "bg-muted relative overflow-hidden shrink-0",
                          viewMode === "grid"
                            ? "h-32 w-full"
                            : "w-24 sm:w-32 md:w-48 self-stretch",
                        )}
                      >
                        {/* Selection Checkbox */}
                        {(isSelectionMode || selectedQuizIds.has(quiz.id)) && (
                          <div
                            className="absolute top-2 left-2 z-30"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSelection(quiz.id);
                            }}
                          >
                            <div
                              className={cn(
                                "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer",
                                selectedQuizIds.has(quiz.id)
                                  ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                  : "bg-background/80 border-muted-foreground/50 hover:bg-background",
                              )}
                            >
                              {selectedQuizIds.has(quiz.id) && (
                                <CheckSquare className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Favorite Button */}
                        {!isSelectionMode && (
                          <button
                            onClick={(e) =>
                              handleToggleFavorite(
                                e,
                                quiz.id,
                                !!quiz.is_favorite,
                              )
                            }
                            className={cn(
                              "absolute top-2 left-2 z-20 p-1.5 rounded-full backdrop-blur-md transition-all shadow-sm group/star ring-1 ring-white/10",
                              quiz.is_favorite
                                ? "bg-yellow-400 text-yellow-900 border-yellow-500 hover:bg-yellow-300"
                                : "bg-black/30 text-white/70 hover:bg-white/20 hover:text-white border-transparent",
                            )}
                          >
                            <Star
                              className={cn(
                                "w-4 h-4",
                                quiz.is_favorite && "fill-yellow-900",
                              )}
                            />
                          </button>
                        )}

                        {/* Status Badge */}
                        {quiz.status === "draft" && (
                          <div className="absolute top-2 right-2 bg-yellow-400/90 backdrop-blur-sm text-yellow-900 px-2 py-0.5 rounded-md text-[10px] font-black uppercase shadow-sm z-10 border border-yellow-300/50">
                            Draft
                          </div>
                        )}

                        {/* Image */}
                        <div className="w-full h-full transition-transform duration-500 group-hover:scale-110">
                          {quiz.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={quiz.cover_image}
                              alt={quiz.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white/50 text-4xl font-black">
                              <div className="w-full h-full opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                      </div>

                      <CardHeader
                        className={cn(
                          "p-3 md:p-4 flex-1 min-w-0 flex flex-col justify-center",
                          viewMode === "list" && "py-2",
                        )}
                      >
                        <CardTitle
                          className={cn(
                            "text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors",
                            viewMode === "grid"
                              ? "line-clamp-1"
                              : "line-clamp-2 md:line-clamp-none",
                          )}
                        >
                          {quiz.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-sm text-muted-foreground mt-1">
                          {quiz.description || "No description"}
                        </CardDescription>
                      </CardHeader>

                      <CardContent
                        className={cn(
                          "p-2 sm:p-3 flex justify-between items-center border-border/50 bg-muted/10",
                          viewMode === "grid"
                            ? "border-t mt-auto w-full"
                            : "border-l flex-col justify-center gap-2 w-[40px] sm:w-[50px] bg-transparent shrink-0 px-1",
                        )}
                      >
                        <div className="text-xs font-semibold text-muted-foreground/70">
                          {new Date(quiz.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </div>
                        <div onClick={(e) => e.preventDefault()}>
                          <QuizActions
                            quizId={quiz.id}
                            onMove={() => openMoveModal(quiz.id)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
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
                  className="font-bold shadow-md transition-transform active:scale-95"
                >
                  Create Quiz
                </Button>
              </CreateQuizModal>
            )}
            {searchQuery && (
              <Button variant="ghost" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Move Quiz Modal */}
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quizToMove
                ? "Move Quiz to Folder"
                : `Move ${selectedQuizIds.size} Quizzes to Folder`}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] mt-4 pr-4">
            <RadioGroup
              value={targetFolderId}
              onValueChange={setTargetFolderId}
              className="gap-2"
            >
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="unorganized" id="r-unorganized" />
                <Label
                  htmlFor="r-unorganized"
                  className="flex items-center gap-2 cursor-pointer w-full"
                >
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Unorganized</span>
                </Label>
              </div>

              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <RadioGroupItem value={folder.id} id={`r-${folder.id}`} />
                  <Label
                    htmlFor={`r-${folder.id}`}
                    className="flex items-center gap-2 cursor-pointer w-full"
                  >
                    <FolderIcon className="w-4 h-4 text-primary" />
                    <span className="font-medium">{folder.name}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMoveQuiz} disabled={moving}>
              {moving ? "Moving..." : "Move Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
