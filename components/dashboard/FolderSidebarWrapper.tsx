import FolderSidebar from "@/components/dashboard/FolderSidebar";
import { getFolders } from "@/app/actions/folders";
import { FadeIn } from "@/components/dashboard/FadeIn";

// No props needed as FolderSidebar reads from URL directly

export default async function FolderSidebarWrapper() {
  const folders = await getFolders();

  return (
    <FadeIn>
      <FolderSidebar
        folders={folders}
        className="w-full"
      />
    </FadeIn>
  );
}
