"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from "@/app/actions/notifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  created_at: string;
  is_read: boolean;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await getUserNotifications();
      setNotifications(data as Notification[]);
    } catch {
      console.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optional: Poll every minute or listen to realtime
    // const interval = setInterval(fetchNotifications, 60000);
    // return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    await markAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllAsRead();
    toast.success("All marked as read");
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-background animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span
              className="text-xs font-normal text-blue-500 cursor-pointer hover:underline"
              onClick={(e) => {
                e.preventDefault();
                handleMarkAllRead();
              }}
            >
              Mark all read
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No recent notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-3 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer relative",
                  !notification.is_read && "bg-muted/30",
                )}
                onClick={() =>
                  !notification.is_read && handleMarkRead(notification.id)
                }
              >
                {!notification.is_read && (
                  <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
                )}
                <div className="flex justify-between items-start mb-1">
                  <h4
                    className={cn(
                      "text-sm font-semibold",
                      notification.type === "warning"
                        ? "text-red-500"
                        : notification.type === "success"
                          ? "text-green-500"
                          : "",
                    )}
                  >
                    {notification.title}
                  </h4>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
