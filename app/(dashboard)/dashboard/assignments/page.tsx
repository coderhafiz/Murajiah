import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, ArrowRight, Clock } from "lucide-react";

import DeleteAssignmentButton from "@/components/assignments/DeleteAssignmentButton";

export default async function AssignmentsDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Please log in to view assignments.</div>;
  }

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(
      `
      *,
      quiz:quizzes (
        title,
        cover_image
      ),
      assignment_attempts (id)
    `,
    )
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Error fetching assignments:",
      JSON.stringify(error, null, 2),
    );
    return <div>Failed to load assignments. Error: {error.message}</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">My Assignments</h1>
        <Link href="/dashboard">
          <Button>Create New</Button>
        </Link>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed">
          <h2 className="text-xl font-bold mb-2">No assignments yet</h2>
          <p className="text-muted-foreground mb-6">
            Assign a quiz to students to track their progress.
          </p>
          <Link href="/dashboard">
            <Button>Go to Library</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/dashboard/assignments/${assignment.id}`}
              className="block group"
            >
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1 pr-2">
                    <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                      {assignment.title}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      Quiz: {assignment.quiz?.title}
                    </div>
                  </div>
                  <DeleteAssignmentButton id={assignment.id} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>
                        {assignment.assignment_attempts?.length || 0} attempts
                      </span>
                    </div>
                    {assignment.deadline && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(assignment.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 flex items-center text-primary text-sm font-bold">
                    View Analytics <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
