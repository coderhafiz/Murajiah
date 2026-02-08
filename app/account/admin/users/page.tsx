import { getUsers } from "@/app/actions/admin";
import Link from "next/link";
import { UserList } from "@/components/admin/UserList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Number(page) || 1;
  const { data: users, count, error } = await getUsers(q, currentPage);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="text-sm text-muted-foreground">
          Total Users: {count}
        </div>
      </div>

      {/* Search Bar - Client Component or Simple Form */}
      <form className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by email or name..."
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <UserList users={users} />

      {/* Pagination (Simple for now) */}
      <div className="flex justify-center gap-2 mt-4">
        {currentPage > 1 && (
          <Link href={`?q=${q || ""}&page=${currentPage - 1}`}>
            <Button variant="outline">Previous</Button>
          </Link>
        )}
        <Button variant="outline" disabled>
          Page {currentPage}
        </Button>
        {users.length === 20 && (
          <Link href={`?q=${q || ""}&page=${currentPage + 1}`}>
            <Button variant="outline">Next</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
