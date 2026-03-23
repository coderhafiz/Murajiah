import { Skeleton } from "@/components/ui/skeleton";

export function FolderSidebarSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <Skeleton className="h-8 w-3/4 mb-4" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function QuizGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="space-y-3 p-1">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function TabCountsSkeleton() {
  return <Skeleton className="h-4 w-4 rounded-full ml-1 inline-block" />;
}
