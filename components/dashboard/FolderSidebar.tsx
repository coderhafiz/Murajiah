"use client";

import { useState, useEffect, useOptimistic, startTransition } from "react";
import {
  Folder,
  createFolder,
  updateFolder,
  deleteFolder,
  toggleFolderVisibility,
} from "@/app/actions/folders";
import { cn } from "@/lib/utils";
import {
  Folder as FolderIcon,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface FolderSidebarProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  className?: string;
}

export default function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  className,
}: FolderSidebarProps) {
  const [iscreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Optimistic UI State with Hook
  const [hiddenFolderIds, setHiddenFolderIds] = useState<Set<string>>(
    () => new Set(folders.filter((f) => f.is_hidden).map((f) => f.id)),
  );

  // Sync with props if they change (e.g. initial load or external update)
  useEffect(() => {
    setHiddenFolderIds(
      new Set(folders.filter((f) => f.is_hidden).map((f) => f.id)),
    );
  }, [folders]);

  const [optimisticHiddenIds, toggleOptimistic] = useOptimistic(
    hiddenFolderIds,
    (state, folderId: string) => {
      const next = new Set(state);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    },
  );

  const handleToggleVisibility = async (
    folderId: string,
    currentHidden: boolean,
  ) => {
    startTransition(() => {
      toggleOptimistic(folderId);
    });

    try {
      await toggleFolderVisibility(folderId, !currentHidden);
    } catch {
      toast.error("Failed to toggle visibility");
      // Optimistic state automatically reverts when transition ends or we get new server state
    }
  };

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;
    try {
      setLoading(true);
      await createFolder(newFolderName);
      toast.success("Folder created");
      setIsCreateModalOpen(false);
      setNewFolderName("");
    } catch {
      toast.error("Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!folderToRename || !newFolderName.trim()) return;
    try {
      setLoading(true);
      await updateFolder(folderToRename.id, newFolderName);
      toast.success("Folder renamed");
      setIsRenameModalOpen(false);
      setFolderToRename(null);
      setNewFolderName("");
    } catch {
      toast.error("Failed to rename folder");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this folder? Quizzes will be moved to 'Unorganized'."))
      return;
    try {
      await deleteFolder(id);
      toast.success("Folder deleted");
      if (selectedFolderId === id) onSelectFolder(null); // Reset selection
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const openRenameModal = (folder: Folder) => {
    setFolderToRename(folder);
    setNewFolderName(folder.name);
    setIsRenameModalOpen(true);
  };

  return (
    <div
      className={cn("w-full md:w-64 flex flex-col gap-2 shrink-0", className)}
    >
      <div
        className="flex items-center justify-between px-2 mb-2 cursor-pointer lg:cursor-default"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Folders
          </h2>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground lg:hidden transition-transform",
              isMobileOpen && "rotate-180",
            )}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setIsCreateModalOpen(true);
          }}
          title="New Folder"
        >
          <FolderPlus className="w-4 h-4" />
        </Button>
      </div>

      <nav
        className={cn(
          "space-y-1 transition-all duration-200 overflow-hidden",
          // Mobile: controlled by isMobileOpen
          isMobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
          // Desktop: always visible (overrides mobile styles)
          "lg:max-h-none lg:opacity-100 lg:block",
        )}
      >
        {/* All Quizzes Button */}
        <button
          onClick={() => onSelectFolder(null)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            selectedFolderId === null
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Layers className="w-4 h-4" />
          All Quizzes
        </button>

        {/* Unorganized Button */}
        <button
          onClick={() => onSelectFolder("unorganized")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            selectedFolderId === "unorganized"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <FolderIcon className="w-4 h-4 opacity-50" />
          Unorganized
        </button>

        {/* Folder List */}
        {folders.map((folder) => {
          const isHidden = optimisticHiddenIds.has(folder.id);
          return (
            <div
              key={folder.id}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer",
                selectedFolderId === folder.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => onSelectFolder(folder.id)}
            >
              <div className="flex items-center gap-3 truncate">
                <FolderIcon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    selectedFolderId === folder.id && "fill-current",
                  )}
                />
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    isHidden &&
                      "opacity-50 line-through decoration-muted-foreground/50",
                  )}
                >
                  {folder.name}
                </span>
              </div>

              <div className="flex items-center gap-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground hidden lg:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVisibility(folder.id, isHidden);
                  }}
                  title={
                    isHidden ? "Show in All Quizzes" : "Hide from All Quizzes"
                  }
                >
                  {isHidden ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </Button>

                {/* Folder Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVisibility(folder.id, isHidden);
                      }}
                    >
                      {isHidden ? (
                        <>
                          <Eye className="w-4 h-4 mr-2" /> Show
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" /> Hide
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openRenameModal(folder);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(folder.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Create Folder Modal */}
      <Dialog open={iscreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Modal */}
      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={loading}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
