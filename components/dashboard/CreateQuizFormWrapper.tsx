import { getUserAccessContext } from "@/lib/access";
import { CreateQuizForm } from "./CreateQuizModal";
import { Loader2 } from "lucide-react";

export default async function CreateQuizFormWrapper() {
  const { isPremium } = await getUserAccessContext();

  return <CreateQuizForm isPremium={isPremium} />;
}

export function CreateQuizFormLoading() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground font-medium text-sm">
        Checking your account access...
      </p>
    </div>
  );
}
