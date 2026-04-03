import { Skeleton } from "@/components/ui/skeleton";

export default function SessionsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-10 w-48" /> {/* Title */}
      
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
