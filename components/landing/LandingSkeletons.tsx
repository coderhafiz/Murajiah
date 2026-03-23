import { Skeleton } from "@/components/ui/skeleton";

export function NavbarAuthSkeleton() {
  return (
    <div className="hidden sm:flex items-center gap-3">
      <Skeleton className="h-9 w-20 rounded-md" />
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
  );
}

export function HeroAuthButtonsSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 md:gap-4 pt-2 md:pt-4">
      <Skeleton className="h-12 md:h-14 w-40 rounded-full" />
      <Skeleton className="h-12 md:h-14 w-48 rounded-full" />
    </div>
  );
}

export function TestimonialsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}
