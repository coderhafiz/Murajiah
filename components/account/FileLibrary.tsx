"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type SourceDocument = {
  id: string;
  name: string;
  file_type: string;
  created_at: string;
  file_size?: number;
};

export default function FileLibrary({ userId }: { userId: string }) {
  const [files, setFiles] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const supabase = createClient();

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("source_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [userId]);

  const handleDeleteClick = (file: SourceDocument) => {
    setFileToDelete({ id: file.id, name: file.name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      // 1. Delete from DB
      const { error: dbError } = await supabase
        .from("source_documents")
        .delete()
        .eq("id", fileToDelete.id);
      if (dbError) throw dbError;

      toast.success("File deleted");
      setFiles(files.filter((f) => f.id !== fileToDelete.id));
    } catch (error) {
      toast.error("Failed to delete file");
    } finally {
      setFileToDelete(null);
    }
  };

  const getIcon = (type: string) => {
    if (type === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
    if (type === "docx") return <FileText className="w-4 h-4 text-blue-500" />;
    if (type === "xlsx")
      return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    if (type === "pptx")
      return <Presentation className="w-4 h-4 text-orange-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  if (loading)
    return (
      <div className="text-center py-4 text-muted-foreground">
        Loading files...
      </div>
    );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Reference Files</h3>
      {files.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No files uploaded yet. Upload files when creating a new quiz.
        </p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>{getIcon(file.file_type)}</TableCell>
                  <TableCell className="font-medium">{file.name}</TableCell>
                  <TableCell className="uppercase text-xs text-muted-foreground">
                    {file.file_type}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(file.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(file)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Reference File?"
        description={`Are you sure you want to delete "${fileToDelete?.name}"? This will limit your ability to regenerate questions from this source.`}
        confirmText="Delete File"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
