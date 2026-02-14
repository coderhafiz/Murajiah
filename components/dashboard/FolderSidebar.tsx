"use client";

import { useState } from "react";
import {
  Folder,
  createFolder,
  updateFolder,
  deleteFolder,
} from "@/app/actions/folders";
import { cn } from "@/lib/utils";
import {
  Folder as FolderIcon,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
  Layers,
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
      <div className="flex items-center justify-between px-2 mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Folders
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsCreateModalOpen(true)}
          title="New Folder"
        >
          <FolderPlus className="w-4 h-4" />
        </Button>
      </div>

      <nav className="space-y-1">
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

        {/* Unorganized Button (Optional, but useful logic could be filter where folder_id is null) */}
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
        {folders.map((folder) => (
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
              <span className="truncate text-sm font-medium">
                {folder.name}
              </span>
            </div>

            {/* Folder Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
        ))}
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
