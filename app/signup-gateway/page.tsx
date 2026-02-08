import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, User, LogIn, ArrowRight } from "lucide-react";

export default async function SignupGatewayPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectUrl = next || "/dashboard";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Join Murajiah</h1>
          <p className="text-muted-foreground text-lg">
            Create an account to save your progress, track results, and build
            your library.
          </p>
        </div>

        <div className="grid gap-4">
          <Link href={`/login?next=${encodeURIComponent(redirectUrl)}`}>
            <Button size="lg" className="w-full text-lg font-bold h-14 gap-2">
              <LogIn className="w-5 h-5" />
              Sign Up / Log In
            </Button>
          </Link>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Link href={redirectUrl}>
            <Button
              variant="outline"
              size="lg"
              className="w-full text-lg h-14 gap-2 border-2"
            >
              <User className="w-5 h-5" />
              Continue as Guest
              <ArrowRight className="w-4 h-4 ml-auto opacity-50" />
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Guest accounts cannot save created quizzes or view history after the
          session ends.
        </p>
      </div>
    </div>
  );
}
