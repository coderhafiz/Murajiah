import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // 1. Check Authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/share/${token}`);
  }

  // 2. Validate Token
  const { data: shareLink, error: linkError } = await supabase
    .from("share_links")
    .select("*")
    .eq("token", token)
    .single();

  if (linkError || !shareLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center shadow-lg border-0">
          <CardHeader>
            <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
              <span className="text-2xl">🚫</span>
            </div>
            <CardTitle className="text-xl text-red-600">
              Invalid or Expired Link
            </CardTitle>
            <CardDescription>
              This invitation link is no longer valid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Add to Collaborators
  // Upsert to avoid error if already added
  const { error: collabError } = await supabase
    .from("quiz_collaborators")
    .upsert(
      {
        quiz_id: shareLink.quiz_id,
        user_id: user.id,
        role: shareLink.role,
      },
      { onConflict: "quiz_id,user_id" },
    );

  if (collabError) {
    console.error("Failed to join quiz:", collabError);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl">Something went wrong</CardTitle>
            <CardDescription>
              We couldn&apos;t add you to the quiz. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button variant="outline">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Redirect to Quiz
  redirect(`/dashboard/quiz/${shareLink.quiz_id}`);
}
