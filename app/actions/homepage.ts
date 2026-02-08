"use server";

import { createClient } from "@/utils/supabase/server";
import { isOwner } from "@/utils/supabase/role";
import { revalidatePath } from "next/cache";

export async function getHomepageSections() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getHomepageContent() {
  const supabase = await createClient();

  const QUIZ_SELECT = `
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
  `;

  // 1. Fetch Basic Sections & Tags
  const [recentRes, popularRes, tagsRes] = await Promise.all([
    supabase
      .from("quizzes")
      .select(QUIZ_SELECT)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("quizzes")
      .select(QUIZ_SELECT)
      .eq("visibility", "public")
      .order("play_count", { ascending: false })
      .limit(10),
    supabase.from("quiz_tags").select("tag"),
  ]);

  const sections = [];

  // Add Recent
  if (recentRes.data?.length) {
    sections.push({
      id: "recent",
      title: "Recently Published",
      description: " Fresh off the press",
      quizzes: mapQuizzes(recentRes.data),
    });
  }

  // Add Popular
  if (popularRes.data?.length) {
    sections.push({
      id: "popular",
      title: "Popular Quizzes",
      description: "Trending among the community",
      quizzes: mapQuizzes(popularRes.data),
    });
  }

  // Process Tags
  if (tagsRes.data) {
    const counts: Record<string, number> = {};
    tagsRes.data.forEach((r) => {
      counts[r.tag] = (counts[r.tag] || 0) + 1;
    });

    const validTags = Object.entries(counts)
      .filter(([_, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1]) // highest count first
      .slice(0, 5) // Top 5 tags
      .map(([tag]) => tag);

    if (validTags.length > 0) {
      // Fetch quizzes for these tags in parallel
      const tagSections = await Promise.all(
        validTags.map(async (tag) => {
          // Use RPC for tag filtering as it handles the join nicely
          const { data } = await supabase.rpc("search_quizzes", {
            search_query: null,
            filter_tag: tag,
            limit_count: 10,
          });

          if (!data?.length) return null;

          return {
            id: `tag-${tag}`,
            title: `#${tag}`,
            description: `Top quizzes in ${tag}`,
            quizzes: mapQuizzes(data),
          };
        }),
      );

      tagSections.forEach((sec) => {
        if (sec) sections.push(sec);
      });
    }
  }

  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuizzes(data: any[]) {
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
    author_name: q.profiles?.full_name || q.author_name, // Handle RPC vs Select
    author_avatar: q.profiles?.avatar_url || q.author_avatar,
  }));
}

export async function createSection(data: {
  title: string;
  section_type: "trending" | "recent" | "featured";
  description?: string;
  order_index?: number;
}) {
  if (!(await isOwner())) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase.from("homepage_sections").insert(data);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/account/admin/homepage");
}

export async function updateSection(
  id: string,
  updates: {
    title?: string;
    description?: string;
    is_visible?: boolean;
    order_index?: number;
  },
) {
  if (!(await isOwner())) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("homepage_sections")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/account/admin/homepage");
}

export async function deleteSection(id: string) {
  if (!(await isOwner())) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("homepage_sections")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/account/admin/homepage");
}

export async function reorderSections(orderedIds: string[]) {
  if (!(await isOwner())) throw new Error("Unauthorized");

  const supabase = await createClient();
  // Supabase doesn't support batch updates well in one query unless using RPC or multiple calls.
  // Multiple calls are fine for small functionality.

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("homepage_sections")
      .update({ order_index: index })
      .eq("id", id),
  );

  await Promise.all(updates);

  revalidatePath("/");
  revalidatePath("/account/admin/homepage");
}
