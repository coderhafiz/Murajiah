import { InterceptedCreateQuizModal } from "@/components/dashboard/InterceptedCreateQuizModal";
import { getUserAccessContext } from "@/lib/access";

export default async function InterceptedCreateQuizPage() {
  const { isPremium } = await getUserAccessContext();

  return <InterceptedCreateQuizModal isPremium={isPremium} />;
}
