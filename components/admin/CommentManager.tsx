"use client";

import { useState } from "react";
import {
  adminGetComments,
  adminApproveComment,
  adminDeleteComment,
  type Comment,
} from "@/app/actions/comments";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Check, X, Trash, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function CommentManager({
  initialComments,
}: {
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);

  const handleApprove = async (id: string, isApproved: boolean) => {
    try {
      await adminApproveComment(id, isApproved);
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_approved: isApproved } : c)),
      );
      toast.success(isApproved ? "Comment approved" : "Comment unapproved");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await adminDeleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast.success("Comment deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const columns: ColumnDef<Comment>[] = [
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const profile = row.original.profiles;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                {profile?.full_name?.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {profile?.full_name || "Unknown"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "content",
      header: "Comment",
      cell: ({ row }) => (
        <div className="max-w-md truncate" title={row.getValue("content")}>
          {row.getValue("content")}
        </div>
      ),
    },
    {
      accessorKey: "is_approved",
      header: "Status",
      cell: ({ row }) => {
        const approved = row.getValue("is_approved");
        return approved ? (
          <Badge className="bg-green-500">Approved</Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-orange-500 border-orange-500"
          >
            Pending
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const comment = row.original;
        return (
          <div className="flex items-center gap-2">
            {comment.is_approved ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApprove(comment.id, false)}
                title="Unapprove"
              >
                <X className="w-4 h-4 text-orange-500" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApprove(comment.id, true)}
                title="Approve"
              >
                <Check className="w-4 h-4 text-green-500" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(comment.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={comments} />
    </div>
  );
}
