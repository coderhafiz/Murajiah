import FolderSidebar from "@/components/dashboard/FolderSidebar";
import { getFolders } from "@/app/actions/folders";

// No props needed as FolderSidebar reads from URL directly

export default async function FolderSidebarWrapper() {
  const folders = await getFolders();

  return (
    <FolderSidebar
      folders={folders}
      className="w-full"
    />
  );
}
