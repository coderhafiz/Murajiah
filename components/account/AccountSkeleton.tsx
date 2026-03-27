import { Skeleton } from "@/components/ui/skeleton";


export default function AccountSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-md" />
            <Skeleton className="h-8 w-48 rounded-md" />
          </div>
        </div>
        <div className="p-6 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="space-y-2 flex flex-col items-center">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
              <Skeleton className="h-10 w-full sm:w-32 rounded-md" />
              <Skeleton className="h-10 w-full sm:w-32 rounded-md" />
            </div>
          </div>

          <div className="border-t border-border pt-6 mt-6">
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
