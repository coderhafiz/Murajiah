import { getAdminNotifications } from "@/app/actions/notifications";
import { NotificationCreator } from "@/components/admin/NotificationCreator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default async function AdminNotificationsPage() {
  const notifications = await getAdminNotifications();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Global Notifications</h1>
      </div>
      <p className="text-muted-foreground">
        Send system-wide announcements to all users.
      </p>

      <NotificationCreator />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">History</h2>
        {notifications.map((n) => (
          <Card key={n.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {n.title}
                    <Badge
                      variant={
                        n.type === "info"
                          ? "secondary"
                          : n.type === "warning"
                            ? "destructive"
                            : "default"
                      }
                    >
                      {n.type}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{n.message}</p>
            </CardContent>
          </Card>
        ))}
        {notifications.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            No notifications sent yet.
          </div>
        )}
      </div>
    </div>
  );
}
