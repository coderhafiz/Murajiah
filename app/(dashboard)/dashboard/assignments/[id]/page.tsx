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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/assignments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black">{assignment.title}</h1>
          <p className="text-muted-foreground text-sm">
            Created on {new Date(assignment.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <CopyButton value={shareLink} label="Copy Link" />

          {/* Export Button (Placeholder for now) */}
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{avgScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {totalAttempts > 0
                ? Math.round((completedAttempts.length / totalAttempts) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard
          </CardTitle>
          <CardDescription>Ranking based on score.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                leaderboard.map((attempt, index) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-bold">#{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {attempt.user?.full_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {attempt.user?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {attempt.score}
                    </TableCell>
                    <TableCell>
                      {new Date(
                        attempt.completed_at || attempt.started_at,
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {attempt.is_completed ? (
                        <Badge
                          variant="default"
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">In Progress</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* settings info */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Deadline</span>
            <span className="font-medium">
              {assignment.deadline
                ? new Date(assignment.deadline).toLocaleString()
                : "None"}
            </span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Attempts Allowed</span>
            <span className="font-medium">
              {assignment.settings?.attempts_allowed || 1}
            </span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Time Limit</span>
            <span className="font-medium">
              {assignment.settings?.time_per_question
                ? assignment.settings.time_per_question + "s"
                : "None"}
            </span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Access Link</span>
            <code className="bg-muted px-2 py-1 rounded text-xs select-all text-primary">
              {shareLink}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
