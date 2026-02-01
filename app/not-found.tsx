import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4 text-center">
      <FileQuestion className="w-24 h-24 text-gray-300 mb-6" />
      <h2 className="text-4xl font-black text-gray-800 dark:text-white mb-4">
        Page Not Found
      </h2>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-sm">
        Could not find the requested resource. It might have been moved or
        deleted.
      </p>
      <Link href="/dashboard">
        <Button size="lg" className="text-lg px-8">
          Return Home
        </Button>
      </Link>
    </div>
  );
}
