import { Suspense } from "react";
import { InterceptedCreateQuizModal } from "@/components/dashboard/InterceptedCreateQuizModal";
import CreateQuizFormWrapper, { CreateQuizFormLoading } from "@/components/dashboard/CreateQuizFormWrapper";

export const dynamic = "force-dynamic";

export default async function InterceptedCreateQuizPage() {
  return (
    <InterceptedCreateQuizModal>
      <Suspense fallback={<CreateQuizFormLoading />}>
        <CreateQuizFormWrapper />
      </Suspense>
    </InterceptedCreateQuizModal>
  );
}
