import { getAssignmentByToken } from "@/app/actions/assignments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AssignmentLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { success, assignment, error, expired } =
    await getAssignmentByToken(token);

  if (!success || !assignment) {
    if (expired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background p-4">
          <Card className="max-w-md w-full border-red-200 dark:border-red-900">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">Assignment Expired</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                The deadline for this assignment has passed.
              </p>
              {assignment && (
                <div className="text-sm font-medium">{assignment.title}</div>
              )}
              <Link href="/">
                <Button variant="outline">Go to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }
    return notFound();
  }

  const { quiz, settings, deadline } = assignment;
  const questionCount = quiz.questions.length; // Assuming backend returns questions count or we fetch it?
  // Wait, getAssignmentByToken returns quiz with questions.
  // We need to make sure we don't expose answers in the landing page payload if strict.
  // Actually getAssignmentByToken acts as the gatekeeper.

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardHeader className="text-center space-y-4 pb-8 border-b">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">
              {assignment.title}
            </h1>
            {assignment.description && (
              <p className="text-muted-foreground mt-2">
                {assignment.description}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground uppercase font-bold tracking-wider">
                Questions
              </div>
              <div className="text-2xl font-bold">{questionCount}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground uppercase font-bold tracking-wider">
                Time Limit
              </div>
              <div className="text-2xl font-bold">
                {settings?.time_per_question
                  ? `${settings.time_per_question}s / q`
                  : "None"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground uppercase font-bold tracking-wider">
                Deadline
              </div>
              <div className="text-lg font-bold flex items-center justify-center gap-2">
                {deadline ? (
                  <>
                    <CalendarIcon className="w-4 h-4" />
                    {new Date(deadline).toLocaleDateString()}
                  </>
                ) : (
                  "No Deadline"
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-300">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Instructions:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 opacity-90">
                <li>Complete all questions to submit.</li>
                {settings?.attempts_allowed && (
                  <li>
                    You have <strong>{settings.attempts_allowed}</strong>{" "}
                    attempts allowed.
                  </li>
                )}
                <li>Once you start, do not close the browser.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link href={`/assign/${token}/play`} className="w-full">
              <Button size="lg" className="w-full text-lg h-12">
                Start Assignment
              </Button>
            </Link>
            <p className="text-xs text-center text-muted-foreground">
              By starting, you agree to the assignment terms.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
