import { Skeleton } from "@/components/ui/skeleton";
import { User, ArrowLeft } from "lucide-react";

export default function AccountSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-muted" />
            <div className="h-8 w-48 bg-muted rounded-md" />
          </div>
        </div>
        <div className="p-6 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-muted" />
            <div className="space-y-2 flex flex-col items-center">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded-md" />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
              <div className="h-10 w-full sm:w-32 bg-muted rounded-md" />
              <div className="h-10 w-full sm:w-32 bg-muted rounded-md" />
            </div>
          </div>

          <div className="border-t border-border pt-6 mt-6">
            <div className="h-16 w-full bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
