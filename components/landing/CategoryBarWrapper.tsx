import { getPopularTags } from "@/app/actions/search";
import { CategoryBar } from "@/components/landing/CategoryBar";

export default async function CategoryBarWrapper() {
  const tags = await getPopularTags();
  return <CategoryBar tags={tags || []} />;
}
