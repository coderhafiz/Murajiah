"use client";

import { useState, useMemo } from "react";
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
  Square,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toggleFavorite, deleteQuizzes } from "@/app/actions/quiz";
import { toast } from "sonner"; // Assuming sonner is used, if not I'll use standard alert or just console for now since I don't see toast import. Actually I'll use standard confirm.

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  created_at: string;
  creator_id: string;
  status: string; // 'draft' | 'published'
  is_favorite?: boolean;
};

export default function QuizLibrary({
  quizzes,
  currentUserId,
}: {
  quizzes: Quiz[];
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

  const toggleAll = () => {
    if (selectedQuizIds.size === filteredQuizzes.length) {
      setSelectedQuizIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedQuizIds(new Set(filteredQuizzes.map((q) => q.id)));
      setIsSelectionMode(true);
    }
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedQuizIds);
    const result = await deleteQuizzes(ids);
    if (result.success) {
      setSelectedQuizIds(new Set());
      setIsSelectionMode(false);
    } else {
      alert("Failed to delete quizzes");
    }
  };

  const handleBulkDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      let matchesFilter = true;
      if (filter === "favorites") {
        matchesFilter = !!quiz.is_favorite;
      } else if (filter === "shared") {
        matchesFilter = quiz.creator_id !== currentUserId;
      } else if (filter !== "all") {
        matchesFilter = quiz.status === filter;
      }

      const matchesSearch =
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (quiz.description &&
          quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [quizzes, filter, searchQuery, currentUserId]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: quizzes.length,
      draft: quizzes.filter((q) => q.status === "draft").length,
      published: quizzes.filter((q) => q.status === "published" || !q.status)
        .length, // Assume published if null? safely
      favorites: quizzes.filter((q) => q.is_favorite).length,
      shared: quizzes.filter((q) => q.creator_id !== currentUserId).length,
    };
  }, [quizzes, currentUserId]);

  const tabs = [
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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          My Library
        </h1>
        <div className="flex gap-2">
          {selectedQuizIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDeleteClick}
              className="gap-2 shadow-sm font-bold animate-in fade-in slide-in-from-right-4"
            >
              <Trash2 className="w-4 h-4" /> Delete ({selectedQuizIds.size})
            </Button>
          )}
          <CreateQuizModal>
            <Button className="gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105 font-bold">
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
        <div className="flex bg-muted/50 p-1 rounded-lg self-start md:self-auto w-full md:w-auto overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap",
                filter === tab.id
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
              )}
            >
              {filter === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary rounded-md shadow-md"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
              <span
                className={cn(
                  "relative z-10 text-xs px-1.5 py-0.5 rounded-full",
                  filter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
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
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border/50 focus:border-primary/50 transition-all"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
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
              onClick={() => setViewMode("list")}
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
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" // Mobile 2 cols
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
                      "overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-card border-border/50 group flex h-full",
                      viewMode === "grid"
                        ? "flex-col"
                        : "flex-row min-h-[5rem] h-auto items-stretch",
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

                      {/* Favorite Button (Hidden if selecting) */}
                      {!isSelectionMode && (
                        <button
                          onClick={(e) => {
                            e.preventDefault(); // Add preventDefault
                            handleToggleFavorite(
                              e,
                              quiz.id,
                              !!quiz.is_favorite,
                            );
                          }}
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

                      {/* Image Hover Zoom Effect */}
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

                      {/* Overlay Gradient on Hover */}
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
                        {new Date(quiz.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div onClick={(e) => e.preventDefault()}>
                        <QuizActions quizId={quiz.id} />
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
            <Link href="/dashboard/create">
              <Button variant="default" className="font-bold shadow-md">
                Create Quiz
              </Button>
            </Link>
          )}
          {searchQuery && (
            <Button variant="ghost" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
