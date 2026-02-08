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
import { createGlobalNotification } from "@/app/actions/notifications";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function NotificationCreator() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success">("info");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      await createGlobalNotification({ title, message, type });
      setTitle("");
      setMessage("");
      toast.success("Notification sent!");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Input
                placeholder="Notification Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-bold"
              />
            </div>
            <div className="space-y-2">
              <Select value={type} onValueChange={(v: any) => setType(v)}>
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
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              <Send className="w-4 h-4 mr-2" />
              {loading ? "Sending..." : "Send Notification"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
