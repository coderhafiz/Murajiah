import FolderSidebar from "@/components/dashboard/FolderSidebar";
import { getFolders } from "@/app/actions/folders";

interface FolderSidebarWrapperProps {
  selectedFolderId: string | null;
}

export default async function FolderSidebarWrapper({
  selectedFolderId,
}: FolderSidebarWrapperProps) {
  const folders = await getFolders();

  return (
    <FolderSidebar
      folders={folders}
      selectedFolderId={selectedFolderId}
      className="w-full"
    />
  );
}
