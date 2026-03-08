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
import { updateUserRole, toggleManualAccess } from "@/app/actions/admin";
import { toast } from "sonner";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  subscription_status?: string | null;
  manual_access_granted?: boolean | null;
}

export function UserList({ users }: { users: User[] }) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdating(userId);
      await updateUserRole(userId, newRole);
      toast.success("Role updated successfully");
      window.location.reload(); // Refresh to reflect changes if needed
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred");
      }
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleAccess = async (email: string, currentGrant: boolean) => {
    try {
      setUpdating(email);
      const res = await toggleManualAccess(email, !currentGrant);
      if (res.success) {
        toast.success(`Access ${!currentGrant ? "granted" : "revoked"} successfully`);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to update access");
      }
    } catch {
      toast.error("An unexpected error occurred");
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
      accessorKey: "subscription_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.subscription_status;
        const manualAccess = row.original.manual_access_granted;
        
        const isPro = status === "active" || manualAccess === true;

        if (isPro) {
          return (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700 truncate max-w-[80px] sm:max-w-none">
              {manualAccess ? "Pro (Manual)" : "Pro"}
            </Badge>
          );
        }

        return (
          <Badge variant="outline" className="text-muted-foreground truncate max-w-[80px] sm:max-w-none">
            Free
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-4">Actions</div>,
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
          <div className="flex justify-end pr-4 gap-2">
            <Select
              defaultValue={user.role}
              onValueChange={(val) => handleRoleChange(user.id, val)}
              disabled={updating === user.id || updating === user.email}
            >
              <SelectTrigger className="w-[110px] h-8 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleToggleAccess(user.email, !!user.manual_access_granted)}
              disabled={updating === user.id || updating === user.email}
              title={user.manual_access_granted ? "Revoke Pro Access" : "Grant Pro Access"}
            >
              {updating === user.email ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : user.manual_access_granted ? (
                <ShieldAlert className="h-4 w-4 text-destructive" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={users} />;
}
