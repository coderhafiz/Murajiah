import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <FileQuestion className="w-24 h-24 text-primary/20 mb-6" />
      <h2 className="text-4xl font-black text-foreground mb-4">
        Page Not Found
      </h2>
      <p className="text-xl text-muted-foreground mb-8 max-w-sm">
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
