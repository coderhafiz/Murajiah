"use server";

import { createClient } from "@/utils/supabase/server";

export type QuizResult = {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  creator_id: string;
  play_count: number;
  like_count: number;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
};

export async function searchQuizzes(
  query: string,
  tag: string | null = null,
  lang: string | null = null,
  page: number = 1,
): Promise<{ data: QuizResult[]; error: string | null }> {
  const supabase = await createClient();
  const limit = 20;
  const offset = (page - 1) * limit;

  // Utilize the RPC function we created for efficient search
  const { data, error } = await supabase.rpc("search_quizzes", {
    search_query: query || null,
    filter_tag: tag || null,
    filter_lang: lang || null,
    limit_count: limit,
    offset_count: offset,
  });

  if (error) {
    console.error("Search error:", error);
    return { data: [], error: error.message };
  }

  return { data: data as QuizResult[], error: null };
}

export async function getTrendingQuizzes(): Promise<QuizResult[]> {
  const supabase = await createClient();

  // Simple query for trending: public, order by play_count desc, limit 10
  // Join with profiles for author info manually since we don't have a view for this specific non-search case,
  // OR we can just reuse the generic search RPC with empty query logic if flexible?
  // Let's do a direct join query for better control or just use the RPC with empty search and sort by play_count.
  // The RPC sorts by play_count secondarily. A dedicated query is safer for "Trending".

  const { data, error } = await supabase
    .from("quizzes")
    .select(
      `
      id,
      title,
      description,
      cover_image,
      creator_id,
      play_count,
      like_count,
      created_at,
      profiles:creator_id (
        full_name,
        avatar_url
      )
    `,
    )
    .eq("visibility", "public")
    .order("play_count", { ascending: false })
    .limit(4);

  if (error) {
    console.error("Trending fetch error FULL:", JSON.stringify(error, null, 2));
    return [];
  }

  // Normalize data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((q: any) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    cover_image: q.cover_image,
    creator_id: q.creator_id,
    play_count: q.play_count,
    like_count: q.like_count,
    created_at: q.created_at,
    author_name: q.profiles?.full_name,
    author_avatar: q.profiles?.avatar_url,
  }));
}

export async function getPopularTags(): Promise<string[]> {
  const supabase = await createClient();

  // Get most used tags. Complex group by?
  // Or just fetch distinct tags for now.
  // Supabase distinct:
  const { data, error } = await supabase.from("quiz_tags").select("tag");
  // .limit(50) // If we had thousands, we'd need a different strategy (counters or separate tags table)
  if (error) return [];

  // Client-side unique/count (fine for small scale)
  const counts: Record<string, number> = {};
  data.forEach((row) => {
    counts[row.tag] = (counts[row.tag] || 0) + 1;
  });

  // Sort by frequency
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15) // Top 15 tags
    .map(([tag]) => tag);
}
