"use client";

import Image from "next/image";
import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("@/components/landing/Hero3D"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[280px] md:h-[400px] lg:h-[600px] flex items-center justify-center overflow-visible">
      <div className="absolute inset-0 bg-radial-gradient from-orange-500/10 to-transparent blur-3xl opacity-50" />
      <div className="relative w-[115%] h-[115%] top-[13%]">
        <Image
          src="/heroImage_loading.png"
          alt="Loading Murajiah 3D Model..."
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain opacity-100 transition-opacity duration-1000"
          priority
        />
      </div>
    </div>
  ),
});

export default function ThreeDWrapper() {
  return <Hero3D />;
}
