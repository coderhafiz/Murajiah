import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4 overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[100px] opacity-30 animate-pulse delay-500" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[100px] opacity-30 animate-pulse delay-5000" />
      </div>

      <div className="z-10 text-center space-y-12 max-w-4xl">
        <div className="space-y-6">
          <h1 className="text-7xl md:text-8xl font-black tracking-tighter drop-shadow-lg">
            Murajiah
          </h1>
          <p className="text-2xl md:text-3xl font-medium text-purple-200">
            The Interactive Quiz Platform for Everyone
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          <Link href="/join">
            <Button
              size="lg"
              className="text-2xl px-12 py-8 bg-white text-purple-900 hover:bg-gray-100 hover:scale-105 transition-all shadow-xl font-black uppercase tracking-widest"
            >
              Enter Game PIN
            </Button>
          </Link>

          <div className="text-purple-300 font-bold uppercase tracking-widest text-sm">
            OR
          </div>

          <Link href="/dashboard">
            <Button
              variant="outline"
              size="lg"
              className="text-2xl px-12 py-8 border-2 border-white text-white bg-transparent hover:bg-white/10 hover:text-white transition-all font-bold"
            >
              Create Quiz
            </Button>
          </Link>
        </div>

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <FeatureCard
            title="Create"
            desc="Build engaging quizzes in minutes with our simple editor."
            icon="✏️"
          />
          <FeatureCard
            title="Host"
            desc="Launch live games and watch players join in real-time."
            icon="🎮"
          />
          <FeatureCard
            title="Play"
            desc="Compete with others on any device. Fast, fun, and free."
            icon="🏆"
          />
        </div>
      </div>

      <footer className="absolute bottom-4 text-center text-purple-400 text-sm">
        &copy; {new Date().getFullYear()} Murajiah App
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/10 hover:bg-white/20 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-purple-200">{desc}</p>
    </div>
  );
}
