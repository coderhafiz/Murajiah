import { CommentManager } from "@/components/admin/CommentManager";
import { adminGetComments } from "@/app/actions/comments";
import { hasModerationRights } from "@/utils/supabase/role";
import { redirect } from "next/navigation";

export default async function CommentsAdminPage() {
  if (!(await hasModerationRights())) {
    redirect("/");
  }

  const comments = await adminGetComments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Comments & Testimonials
        </h1>
        <p className="text-muted-foreground">
          Approve user reviews to display them on the homepage.
        </p>
      </div>
      <CommentManager initialComments={comments} />
    </div>
  );
}
