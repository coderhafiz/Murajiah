"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { updateUserRole } from "@/app/actions/admin";
import { toast } from "sonner";
import { useState } from "react";

interface UserListProps {
  users: any[]; // Using any for speed, ideally type this properly
}

export function UserList({ users }: UserListProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdating(userId);
      await updateUserRole(userId, newRole);
      toast.success("Role updated successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.full_name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {user.full_name || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground sm:hidden">
                    {user.email}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {user.email}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      user.role === "owner"
                        ? "destructive"
                        : user.role === "admin"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {user.role}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Select
                  defaultValue={user.role}
                  onValueChange={(val) => handleRoleChange(user.id, val)}
                  disabled={updating === user.id}
                >
                  <SelectTrigger className="w-[110px] ml-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
