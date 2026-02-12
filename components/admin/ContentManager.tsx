"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { softDeleteQuiz, restoreQuiz } from "@/app/actions/admin";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Undo } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

interface Quiz {
  id: string;
  title: string;
  created_at: string;
  deleted_at: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface ContentManagerProps {
  quizzes: any[]; // Using any for initial prop but mapping to Quiz in usage
}

export function ContentManager({ quizzes }: ContentManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to soft delete this quiz?")) return;
    try {
      setLoading(id);
      await softDeleteQuiz(id);
      toast.success("Quiz deleted");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setLoading(id);
      await restoreQuiz(id);
      toast.success("Quiz restored");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const columns: ColumnDef<Quiz>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const quiz = row.original;
        const isDeleted = !!quiz.deleted_at;
        return (
          <span
            className={`font-medium ${isDeleted ? "text-muted-foreground" : ""}`}
          >
            {quiz.title}
          </span>
        );
      },
    },
    {
      header: "Author",
      cell: ({ row }) => {
        const quiz = row.original;
        return (
          <div className="flex flex-col">
            <span>{quiz.profiles?.full_name || "Unknown"}</span>
            <span className="text-xs text-muted-foreground">
              {quiz.profiles?.email}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) =>
        formatDistanceToNow(new Date(row.original.created_at), {
          addSuffix: true,
        }),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isDeleted = !!row.original.deleted_at;
        return isDeleted ? (
          <Badge variant="destructive">Deleted</Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-green-600 border-green-200 bg-green-50"
          >
            Active
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const quiz = row.original;
        const isDeleted = !!quiz.deleted_at;
        const isLoading = loading === quiz.id;

        return (
          <div className="flex justify-end">
            {isDeleted ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRestore(quiz.id)}
                disabled={isLoading}
              >
                <Undo className="w-4 h-4 mr-2" /> Restore
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDelete(quiz.id)}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={quizzes} />;
}
