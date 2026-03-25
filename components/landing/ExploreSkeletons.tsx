import { Skeleton } from "@/components/ui/skeleton";

export function CategoryBarSkeleton() {
  return (
    <div className="hidden md:block py-4 border-b border-border bg-background">
      <div className="container mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuizGridSkeleton({ variant = "standard" }: { variant?: "standard" | "poster" }) {
  const count = variant === "poster" ? 6 : 8;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4 border-border">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 md:gap-6">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="w-[45%] shrink-0 md:w-auto">
            {variant === "poster" ? (
              <Skeleton className="aspect-3/4 w-full rounded-2xl" />
            ) : (
              <div className="space-y-3">
                <Skeleton className="aspect-video w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExploreNavbarAuthSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-10 w-10 rounded-full hidden sm:block" />
      <Skeleton className="h-10 w-24 rounded-md hidden sm:block" />
    </div>
  );
}
