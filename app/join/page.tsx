import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function JoinPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f2f2f2] p-4 bg-[url('https://assets-cdn.kahoot.it/builder/v2/assets/background_3.090a78.png')] bg-cover bg-center">
      {/* Background overlay/fallback if image fails */}
      <div className="absolute inset-0 bg-primary/10 pointer-events-none" />

      <div className="z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-block transition-transform hover:scale-105"
          >
            <h1 className="text-5xl font-black text-primary tracking-tight drop-shadow-sm">
              Murajiah
            </h1>
          </Link>
          <p className="text-xl font-medium text-gray-600">Enter PIN to Join</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardWithForm />
        </Card>

        <div className="text-center text-sm font-semibold text-gray-500">
          <p>Want to create your own quiz?</p>
          <Link
            href="/dashboard"
            className="text-primary hover:underline mt-1 inline-block"
          >
            Login as Host
          </Link>
        </div>
      </div>
    </div>
  );
}

function CardWithForm() {
  return (
    <div className="space-y-4 p-6">
      <form action="/play/join" className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Game PIN"
            className="text-center text-2xl font-bold h-14 tracking-widest placeholder:tracking-normal placeholder:font-normal"
            name="pin"
            required
            pattern="[0-9]*"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
          />
        </div>
        <Button className="w-full text-xl" size="lg" type="submit">
          Enter
        </Button>
      </form>
    </div>
  );
}
