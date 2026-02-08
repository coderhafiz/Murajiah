import { getAdminQuizzes } from "@/app/actions/admin";
import { ContentManager } from "@/components/admin/ContentManager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Number(page) || 1;
  const { data: quizzes, count, error } = await getAdminQuizzes(q, currentPage);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Moderation</h1>
        <div className="text-sm text-muted-foreground">
          Total Quizzes: {count}
        </div>
      </div>

      <form className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search quizzes..."
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <ContentManager quizzes={quizzes} />

      <div className="flex justify-center gap-2 mt-4">
        {currentPage > 1 && (
          <Link href={`?q=${q || ""}&page=${currentPage - 1}`}>
            <Button variant="outline">Previous</Button>
          </Link>
        )}
        <Button variant="outline" disabled>
          Page {currentPage}
        </Button>
        {quizzes.length === 20 && (
          <Link href={`?q=${q || ""}&page=${currentPage + 1}`}>
            <Button variant="outline">Next</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
