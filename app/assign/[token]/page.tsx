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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background p-0 sm:p-4">
          <Card className="max-w-md w-full border-red-200 dark:border-red-900 border-x-0 sm:border-x rounded-none sm:rounded-xl">
            <CardHeader className="text-center px-4 md:px-6 pt-8 md:pt-6">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl md:text-2xl leading-tight">
                Assignment Expired
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4 px-4 md:px-6 pb-8 md:pb-6">
              <p className="text-sm md:text-base text-muted-foreground">
                The deadline for this assignment has passed.
              </p>
              {assignment && (
                <div className="text-sm md:text-base font-medium">
                  {assignment.title}
                </div>
              )}
              <Link href="/">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-12 sm:h-auto"
                >
                  Go to Home
                </Button>
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
      <Card className="max-w-2xl w-full shadow-lg border-x-0 sm:border-x rounded-none sm:rounded-xl">
        <CardHeader className="text-center space-y-3 pb-6 border-b px-4 md:px-6">
          <div className="mx-auto w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black leading-tight">
              {assignment.title}
            </h1>
            {assignment.description && (
              <p className="text-sm md:text-base text-muted-foreground mt-2 px-2">
                {assignment.description}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 md:pt-8 space-y-6 md:space-y-8 px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 text-center">
            <div className="space-y-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg md:bg-transparent md:p-0">
              <div className="text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-wider">
                Questions
              </div>
              <div className="text-xl md:text-2xl font-bold">
                {questionCount}
              </div>
            </div>
            <div className="space-y-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg md:bg-transparent md:p-0">
              <div className="text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-wider">
                Time Limit
              </div>
              <div className="text-xl md:text-2xl font-bold">
                {settings?.time_per_question
                  ? `${settings.time_per_question}s/q`
                  : "None"}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1 space-y-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg md:bg-transparent md:p-0">
              <div className="text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-wider">
                Deadline
              </div>
              <div className="text-base md:text-lg font-bold flex items-center justify-center gap-2">
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

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 md:p-5 rounded-xl flex gap-3 text-sm text-blue-800 dark:text-blue-300">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-semibold text-base">Instructions:</p>
              <ul className="list-disc list-outside ml-4 mt-1 space-y-1.5 opacity-90">
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

          <div className="flex flex-col gap-3 pt-4">
            <Link href={`/assign/${token}/play`} className="w-full">
              <Button
                size="lg"
                className="w-full text-lg h-14 md:h-12 rounded-xl"
              >
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
