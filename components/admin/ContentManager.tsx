"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { softDeleteQuiz, restoreQuiz } from "@/app/actions/admin";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Undo } from "lucide-react";

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
  quizzes: any[];
}

export function ContentManager({ quizzes }: ContentManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to soft delete this quiz?")) return;
    try {
      setLoading(id);
      await softDeleteQuiz(id);
      toast.success("Quiz deleted");
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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quizzes.map((quiz) => (
            <TableRow
              key={quiz.id}
              className={quiz.deleted_at ? "bg-muted/50" : ""}
            >
              <TableCell className="font-medium">{quiz.title}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{quiz.profiles?.full_name || "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">
                    {quiz.profiles?.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(quiz.created_at), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell>
                {quiz.deleted_at ? (
                  <Badge variant="destructive">Deleted</Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-200 bg-green-50"
                  >
                    Active
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {quiz.deleted_at ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(quiz.id)}
                    disabled={loading === quiz.id}
                  >
                    <Undo className="w-4 h-4 mr-2" /> Restore
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(quiz.id)}
                    disabled={loading === quiz.id}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
