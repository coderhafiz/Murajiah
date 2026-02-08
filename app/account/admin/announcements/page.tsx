import { getAnnouncements } from "@/app/actions/announcements";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAnnouncementsPage() {
  const announcements = await getAnnouncements();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Announcements</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementManager initialAnnouncements={announcements} />
        </CardContent>
      </Card>
    </div>
  );
}
