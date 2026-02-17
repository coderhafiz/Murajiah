import { getAssignmentByToken, startAttempt } from "@/app/actions/assignments";
import AsyncQuizPlayer from "@/components/assignments/AsyncQuizPlayer";
import { notFound, redirect } from "next/navigation";

export default async function AssignmentPlayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // 1. Get Assignment
  const { success, assignment, error } = await getAssignmentByToken(token);

  if (!success || !assignment) {
    if (error === "This assignment has expired.") {
      // Could redirect to landing page to show expiration nicely
      // OR just show not found/error here.
      // The landing page handles expiration UI, so maybe redirect there?
      // But if they are here, they might have bypassed landing.
      // Let's redirect to landing so they see the nice error.
      redirect(`/assign/${token}`);
    }
    return notFound();
  }

  // 2. Start Attempt
  const attemptResult = await startAttempt(assignment.id);

  if (!attemptResult.success) {
    // If error (e.g. max attempts reached), redirect to landing with error?
    // Or show error page.
    // For now, let's redirect to landing.
    console.error("Failed to start attempt:", attemptResult.error);
    // Ideally we would pass an error query param
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Unavailable</h1>
          <p className="text-muted-foreground">
            {attemptResult.error || "Could not start assignment."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AsyncQuizPlayer assignment={assignment} attempt={attemptResult.attempt} />
  );
}
