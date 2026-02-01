"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md text-center">
        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
          Something went wrong!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We encountered an unexpected error. Usually reloading the page helps.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => reset()} className="w-full text-lg py-6">
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/dashboard")}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
