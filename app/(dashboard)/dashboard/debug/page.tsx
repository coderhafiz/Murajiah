import { createClient } from "@/utils/supabase/server";

export default async function DebugPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-10">
        No User Found. Auth Error: {authError?.message}
      </div>
    );
  }

  // Check 1: Own quizzes (explicit filter)
  const ownRes = await supabase
    .from("quizzes")
    .select("*")
    .eq("creator_id", user.id);

  // Check 2: All visible quizzes (implicit RLS)
  const allRes = await supabase
    .from("quizzes")
    .select("id, title, creator_id, visibility");

  // Check 3: Creation time (to see if data is old or new)
  const firstQuiz = ownRes.data?.[0];

  return (
    <div className="p-8 space-y-6 bg-white min-h-screen text-slate-800">
      <h1 className="text-3xl font-black text-red-600">Dashboard Debugger</h1>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">1. Authentication</h2>
        <div className="bg-slate-100 p-4 rounded-md font-mono text-sm">
          <p>User ID: {user.id}</p>
          <p>Email: {user.email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">
          2. Your Quizzes (Filtered by creator_id)
        </h2>
        <p>Query: .eq(&quot;creator_id&quot;, user.id)</p>
        <div className="bg-slate-100 p-4 rounded-md font-mono text-sm max-h-64 overflow-auto">
          <p>Count: {ownRes.data?.length ?? 0}</p>
          <p>Error: {JSON.stringify(ownRes.error)}</p>
          <pre>{JSON.stringify(ownRes.data, null, 2)}</pre>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">
          3. All Visible Quizzes (RLS Check)
        </h2>
        <p>Query: .select(&quot;*&quot;) (No filters)</p>
        <div className="bg-slate-100 p-4 rounded-md font-mono text-sm max-h-64 overflow-auto">
          <p>Count: {allRes.data?.length ?? 0}</p>
          <pre>{JSON.stringify(allRes.data, null, 2)}</pre>
        </div>
      </div>

      {/* New Check */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold">4. Tags Check</h2>
        <p>Query: .from(&quot;quiz_tags&quot;).select(&quot;*&quot;)</p>
        <div className="bg-slate-100 p-4 rounded-md font-mono text-sm max-h-64 overflow-auto">
          <DebugTags />
        </div>
      </div>
    </div>
  );
}

async function DebugTags() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_tags")
    .select("*")
    .limit(10);
  if (error) return <div>Error: {error.message}</div>;
  return (
    <div>
      <p>Count: {data.length} (showing top 10)</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
