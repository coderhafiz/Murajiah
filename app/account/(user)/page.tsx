import { Suspense } from "react";
import AccountFormWrapper from "@/components/account/AccountFormWrapper";
import AccountSkeleton from "@/components/account/AccountSkeleton";

export default function AccountPage() {
  return (
    <div className="container mx-auto py-10 px-4 min-h-screen">
      <Suspense fallback={<AccountSkeleton />}>
        <AccountFormWrapper />
      </Suspense>
    </div>
  );
}
