import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Play, Edit, User, HelpCircle, Lock } from "lucide-react";

export default async function QuizPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Get Current User (if any)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Fetch Quiz Details (Separate fetch to isolate RLS issues)
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single();

  if (quizError || !quiz) {
    console.error("Error fetching quiz:", quizError);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Quiz Not Found</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            This quiz might be private or deleted.
            {quizError && (
              <span className="block text-xs mt-2 text-red-400 font-mono">
                {quizError.message}
              </span>
            )}
          </p>
          <Link href="/">
            <Button variant="outline">Browse Quizzes</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Fetch Questions (Graceful fail if RLS blocks)
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", id)
    .order("order_index", { ascending: true });

  if (questionsError) {
    console.warn("Error fetching questions (likely RLS):", questionsError);
  } else if (questions && questions.length > 0) {
    console.log("First question structure:", questions[0]);
  }

  // Combine data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const quizWithQuestions = { ...quiz, questions: questions || [] };

  const isOwner = user?.id === quiz.creator_id;
  const questionCount = questions?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header / Nav */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="container max-w-5xl mx-auto h-16 flex items-center px-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Library
            </Button>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {!user && (
              <Link href={`/login?next=/quiz/${id}`}>
                <Button variant="outline" size="sm">
                  Log in
                </Button>
              </Link>
            )}
            {user && (
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Cover Image */}
          <div className="md:col-span-1 space-y-6">
            <div className="aspect-[4/3] relative rounded-2xl overflow-hidden shadow-lg bg-muted border border-border">
              {quiz.cover_image ? (
                <Image
                  src={quiz.cover_image}
                  alt={quiz.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10">
                  <span className="text-6xl">🎲</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-4 rounded-xl border text-center">
                <HelpCircle className="w-5 h-5 mx-auto mb-2 text-primary" />
                <div className="font-bold text-lg">{questionCount}</div>
                <div className="text-xs text-muted-foreground uppercase font-bold">
                  Questions
                </div>
              </div>
              <div className="bg-card p-4 rounded-xl border text-center">
                <User className="w-5 h-5 mx-auto mb-2 text-primary" />
                <div className="font-bold text-lg truncate px-1">
                  {quiz.creator_id === user?.id ? "You" : "Author"}
                </div>
                <div className="text-xs text-muted-foreground uppercase font-bold">
                  Creator
                </div>
              </div>
            </div>
          </div>

          {/* Right: Details & Actions */}
          <div className="md:col-span-2 space-y-8">
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-4">
                {quiz.title}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {quiz.description || "No description provided."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
              {/* Play / Host Button */}
              {user ? (
                <form
                  action="/api/game/create"
                  method="POST"
                  className="flex-1"
                >
                  <input type="hidden" name="quizId" value={quiz.id} />
                  <Button
                    size="lg"
                    className="w-full text-lg font-bold gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all h-14"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Host Game
                  </Button>
                </form>
              ) : (
                <Link href={`/login?next=/quiz/${id}`} className="flex-1">
                  <Button
                    size="lg"
                    className="w-full text-lg font-bold gap-2 shadow-lg h-14"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Log in to Host
                  </Button>
                </Link>
              )}

              {/* Edit Button (Owner Only) */}
              {isOwner && (
                <Link href={`/dashboard/quiz/${quiz.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full text-lg font-bold gap-2 h-14"
                  >
                    <Edit className="w-5 h-5" />
                    Edit Quiz
                  </Button>
                </Link>
              )}
            </div>

            {/* Questions Preview (Optional - just a list) */}
            <div className="pt-8">
              <h3 className="text-xl font-bold mb-4">
                Questions Preview ({Math.min(questionCount, 5)} shown)
              </h3>
              <div className="space-y-3">
                {questions?.slice(0, 5).map((q: any, i: number) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border bg-card/50 flex gap-4 items-center group hover:bg-card transition-colors"
                  >
                    <span className="font-bold text-muted-foreground w-6 shrink-0">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {q.title || q.question_text || "Untitled Question"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
                          {q.question_type?.replace("_", " ") || "Quiz"}
                        </span>
                        {/* Add icon if media exists (we can check q.media_url if selected in future, for now just type) */}
                      </div>
                    </div>
                  </div>
                ))}
                {questionCount > 5 && (
                  <p className="text-center text-muted-foreground text-sm py-2">
                    + {questionCount - 5} more questions...
                  </p>
                )}
                {questionCount === 0 && (
                  <p className="text-muted-foreground italic">
                    No questions yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
