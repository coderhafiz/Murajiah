"use client";

import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("@/components/landing/Hero3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] md:h-[400px] flex items-center justify-center text-muted-foreground animate-pulse">
      Loading 3D...
    </div>
  ),
});

export default function ThreeDWrapper() {
  return <Hero3D />;
}
