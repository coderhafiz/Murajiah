"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGlobalNotification,
  updateGlobalNotification,
  deleteGlobalNotification,
} from "@/app/actions/notifications";
import { toast } from "sonner";
import {
  Send,
  Edit,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  created_at: string;
}

interface NotificationCreatorProps {
  initialNotifications?: Notification[];
}

export function NotificationCreator({
  initialNotifications = [],
}: NotificationCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success">("info");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await updateGlobalNotification(editingId, { title, message, type });
        toast.success("Notification updated!");
      } else {
        await createGlobalNotification({ title, message, type });
        toast.success("Notification sent!");
      }
      resetForm();
      // Optional: window.location.reload() if server action revalidatePath isn't fully client-side immediate
      // But usually router.refresh() or just waiting for next navigation is enough with server actions + revalidatePath
      // However, initialNotifications prop needs a refresh to update.
      // Server Actions revalidatePath updates the current route's data, so props should update if this is a client component inside a server page?
      // Yes. But let's add a small delay or trust React.
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setType("info");
    setEditingId(null);
  };

  const handleEdit = (notification: Notification) => {
    setTitle(notification.title);
    setMessage(notification.message);
    setType(notification.type);
    setEditingId(notification.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    try {
      setLoading(true);
      await deleteGlobalNotification(id);
      toast.success("Notification deleted");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<Notification>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="font-semibold">{row.getValue("title")}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        let variant: "default" | "secondary" | "destructive" | "outline" =
          "default";
        let Icon = Info;

        if (type === "info") {
          variant = "secondary";
          Icon = Info;
        } else if (type === "warning") {
          variant = "destructive";
          Icon = AlertCircle;
        } else if (type === "success") {
          variant = "default"; // or custom success style
          Icon = CheckCircle;
        }

        return (
          <Badge variant={variant} className="flex w-fit items-center gap-1">
            <Icon className="w-3 h-3" />
            <span className="capitalize">{type}</span>
          </Badge>
        );
      },
    },
    {
      accessorKey: "message",
      header: "Message",
      cell: ({ row }) => (
        <span
          className="line-clamp-2 text-muted-foreground text-sm"
          title={row.getValue("message")}
        >
          {row.getValue("message")}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Sent",
      cell: ({ row }) =>
        formatDistanceToNow(new Date(row.original.created_at), {
          addSuffix: true,
        }),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row.original)}
            disabled={loading}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleDelete(row.original.id)}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <Card
        className={`transition-colors ${
          editingId
            ? "border-primary border-2 bg-primary/5"
            : "bg-muted/50 border-dashed"
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">
              {editingId ? "Edit Notification" : "New Notification"}
            </h3>
            {editingId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-2" /> Cancel Edit
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-2">
                <Input
                  placeholder="Notification Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="font-bold"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Select
                  value={type}
                  onValueChange={(v) =>
                    setType(v as "info" | "warning" | "success")
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info (Blue)</SelectItem>
                    <SelectItem value="warning">Warning (Red)</SelectItem>
                    <SelectItem value="success">Success (Green)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              placeholder="Message content..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              disabled={loading}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  "Processing..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {editingId ? "Update Notification" : "Send Notification"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">History</h2>
        <DataTable columns={columns} data={initialNotifications} />
      </div>
    </div>
  );
}
