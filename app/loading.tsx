import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-purple-600">
      <Loader2 className="w-16 h-16 animate-spin mb-4" />
      <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
        Loading Murajiah...
      </h2>
    </div>
  );
}
