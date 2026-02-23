import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Users,
  Trophy,
} from "lucide-react";
import CopyButton from "@/components/ui/CopyButton"; // Assuming we have one or I'll implement inline

interface Attempt {
  id: string;
  score: number;
  total_points: number;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
  user: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export default async function AssignmentAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  // Fetch Assignment + Attempts + Profiles
  const { data: assignment, error } = await supabase
    .from("assignments")
    .select(
      `
      *,
      quiz:quizzes (title),
      attempts:assignment_attempts (
        id,
        score,
        total_points,
        started_at,
        completed_at,
        is_completed,
        user:profiles (full_name, email, avatar_url)
      )
    `,
    )
    .eq("id", id)
    .eq("creator_id", user.id) // Ensure ownership
    .single();

  if (error || !assignment) {
    return notFound();
  }

  const attempts = (assignment.attempts || []) as Attempt[];
  const completedAttempts = attempts.filter((a) => a.is_completed);

  // Stats
  const totalAttempts = attempts.length;
  const avgScore =
    completedAttempts.length > 0
      ? Math.round(
          completedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) /
            completedAttempts.length,
        )
      : 0;

  // Sort for leaderboard
  const leaderboard = [...completedAttempts].sort(
    (a, b) => (b.score || 0) - (a.score || 0),
  );

  const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://murajiah.com"}/assign/${assignment.access_token}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/assignments">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black line-clamp-2">
              {assignment.title}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Created on {new Date(assignment.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="flex-1 sm:flex-none">
            <CopyButton value={shareLink} label="Copy Link" />
          </div>

          {/* Export Button (Placeholder for now) */}
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 px-4 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Attempts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-2xl sm:text-3xl font-black">
              {totalAttempts}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-2xl sm:text-3xl font-black">{avgScore}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-2xl sm:text-3xl font-black">
              {totalAttempts > 0
                ? Math.round((completedAttempts.length / totalAttempts) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard
          </CardTitle>
          <CardDescription>Ranking based on score.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-2 whitespace-nowrap">
                    Rank
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Student</TableHead>
                  <TableHead className="whitespace-nowrap">Score</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="pr-4 sm:pr-2 whitespace-nowrap">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground px-4 sm:px-2"
                    >
                      No submissions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaderboard.map((attempt, index) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-bold pl-4 sm:pl-2">
                        #{index + 1}
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <div className="flex flex-col">
                          <span className="font-medium whitespace-nowrap">
                            {attempt.user?.full_name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                            {attempt.user?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {attempt.score}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(
                          attempt.completed_at || attempt.started_at,
                        ).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="pr-4 sm:pr-2">
                        {attempt.is_completed ? (
                          <Badge
                            variant="default"
                            className="bg-green-500 hover:bg-green-600 whitespace-nowrap"
                          >
                            Completed
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="whitespace-nowrap"
                          >
                            In Progress
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* settings info */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Assignment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm px-4 sm:px-6">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row border-b py-3 sm:py-2 gap-1 sm:gap-0">
            <span className="text-muted-foreground">Deadline</span>
            <span className="font-medium text-right w-full sm:w-auto">
              {assignment.deadline
                ? new Date(assignment.deadline).toLocaleString()
                : "None"}
            </span>
          </div>
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row border-b py-3 sm:py-2 gap-1 sm:gap-0">
            <span className="text-muted-foreground">Attempts Allowed</span>
            <span className="font-medium text-right w-full sm:w-auto">
              {assignment.settings?.attempts_allowed || 1}
            </span>
          </div>
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row border-b py-3 sm:py-2 gap-1 sm:gap-0">
            <span className="text-muted-foreground">Time Limit</span>
            <span className="font-medium text-right w-full sm:w-auto">
              {assignment.settings?.time_per_question
                ? assignment.settings.time_per_question + "s"
                : "None"}
            </span>
          </div>
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row border-b py-3 sm:py-2 gap-2 sm:gap-0">
            <span className="text-muted-foreground">Access Link</span>
            <code className="bg-muted px-2 py-1 rounded text-xs select-all text-primary break-all max-w-[250px] sm:max-w-max text-right">
              {shareLink}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
