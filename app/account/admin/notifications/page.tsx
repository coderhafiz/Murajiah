import { getAdminNotifications } from "@/app/actions/notifications";
import { NotificationCreator } from "@/components/admin/NotificationCreator";

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

      <NotificationCreator initialNotifications={notifications} />
    </div>
  );
}
