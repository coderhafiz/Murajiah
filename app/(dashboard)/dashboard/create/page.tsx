import { Suspense } from "react";
import CreateQuizFormWrapper, { CreateQuizFormLoading } from "@/components/dashboard/CreateQuizFormWrapper";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CreateQuizPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-purple-500" />
          Create New Quiz
        </h1>
        <p className="text-muted-foreground">
          Let AI help you generate questions or start from scratch.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[400px]">
        <Suspense fallback={<CreateQuizFormLoading />}>
          <CreateQuizFormWrapper />
        </Suspense>
      </div>
    </div>
  );
}
