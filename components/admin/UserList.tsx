"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/app/actions/admin";
import { toast } from "sonner";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function UserList({ users }: { users: User[] }) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdating(userId);
      await updateUserRole(userId, newRole);
      toast.success("Role updated successfully");
      window.location.reload(); // Refresh to reflect changes if needed
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "full_name",
      header: "User",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || ""} />
              <AvatarFallback>{user.full_name?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{user.full_name || "Unknown"}</span>
              <span className="text-xs text-muted-foreground sm:hidden">
                {user.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="hidden sm:inline">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return (
          <Badge
            variant={
              role === "owner"
                ? "destructive"
                : role === "admin"
                  ? "default"
                  : "secondary"
            }
          >
            {role}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;

        // Prevent editing the Owner's role and remove "Owner" option for others
        if (user.role === "owner") {
          return (
            <div className="flex justify-end pr-4">
              <span className="text-muted-foreground text-sm font-medium">
                Owner
              </span>
            </div>
          );
        }

        return (
          <div className="flex justify-end">
            <Select
              defaultValue={user.role}
              onValueChange={(val) => handleRoleChange(user.id, val)}
              disabled={updating === user.id}
            >
              <SelectTrigger className="w-[110px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={users} />;
}
