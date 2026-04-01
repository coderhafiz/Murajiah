"use client";

import { useRef, Suspense, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Canvas, useFrame, useThree, ThreeElements } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  ContactShadows,
  Float,
  Gltf,
  useGLTF,
} from "@react-three/drei";
import { KTX2Loader, DRACOLoader, GLTFLoader } from "three-stdlib";
import { Group, WebGLRenderer } from "three";
import { Hand } from "lucide-react";
import { motion } from "framer-motion";

// --- Loader Management ---

let ktx2Loader: KTX2Loader | null = null;
let dracoLoader: DRACOLoader | null = null;

function getKTX2Loader(gl: WebGLRenderer) {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("/basis/");
    ktx2Loader.detectSupport(gl);
  }
  return ktx2Loader;
}

function getDracoLoader() {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
    );
  }
  return dracoLoader;
}

function setupLoaders(loader: GLTFLoader, gl: WebGLRenderer) {
  loader.setKTX2Loader(getKTX2Loader(gl));
  loader.setDRACOLoader(getDracoLoader());
}

// --- Components ---

const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/3d-models`;

function PreloadModels() {
  const { gl } = useThree();

  // This effect ensures we register the preload with the correct GL context
  // immediately upon mounting inside the Canvas.
  useEffect(() => {
    useGLTF.preload(
      `${STORAGE_URL}/rubiks_compressed.glb`,
      undefined,
      undefined,
      (loader) => setupLoaders(loader as GLTFLoader, gl),
    );
  }, [gl]);

  return null;
}

// Refactored Model component using <Gltf> from drei.
// Accepts an optional onFirstPaint callback that fires after the WebGL
// renderer has drawn the model AND the browser has composited it to screen.
function ResponsiveModel({
  onFirstPaint,
  ...props
}: ThreeElements["group"] & { onFirstPaint?: () => void }) {
  const group = useRef<Group>(null);
  const { gl } = useThree();
  // Use a ref so the flag never causes a re-render inside the render loop.
  const hasNotified = useRef(false);

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.elapsedTime;
      group.current.rotation.z = -0.2 - (1 + Math.sin(t / 1.5)) / 20;
      group.current.rotation.x = Math.cos(t / 4) / 8 + 0.5;
      group.current.rotation.y = Math.sin(t / 4) / 8 - 0.5;
      group.current.position.y = (1 + Math.sin(t / 1.5)) / 10;
    }

    // First frame where the model group is mounted in the scene:
    // useFrame fires → R3F calls gl.render() → requestAnimationFrame fires
    // AFTER the browser composites the WebGL canvas onto the page.
    if (!hasNotified.current && group.current && onFirstPaint) {
      hasNotified.current = true;
      requestAnimationFrame(() => onFirstPaint());
    }
  });

  return (
    <group ref={group} {...props} dispose={null}>
      {/* 
        <Gltf> handles loading and primitive setup automatically. 
        Note: We pass setupLoaders as a callback via the extendLoader argument.
      */}
      <Gltf
        src={`${STORAGE_URL}/rubiks_compressed.glb`}
        scale={7}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extendLoader={(loader: any) => setupLoaders(loader, gl)}
      />
    </group>
  );
}

// ... existing Loader ...

function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
      <div className="relative w-[115%] h-[115%] top-[13%]">
        <Image
          src="/heroImage_loading.png"
          alt="Loading 3D Assets..."
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain opacity-100 placeholder-hero"
          priority
        />
      </div>
    </div>
  );
}



export default function Hero3D() {
  const [isLoaded, setIsLoaded] = useState(false);

  // Stable callback reference so ResponsiveModel's useFrame dep doesn't churn.
  const handleFirstPaint = useCallback(() => setIsLoaded(true), []);

  return (
    <div className="w-full h-[280px] md:h-[400px] lg:h-[600px] relative z-10 flex items-center justify-center">
      {/* Background Card - Moved outside Suspense and guarded by isLoaded for stable transition */}
      {isLoaded && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute translate-y-[35%] w-[80%] h-[60%] bg-linear-to-tr from-red-600 via-orange-500 to-amber-400 rounded-3xl shadow-[0_0_100px_-20px_rgba(249,115,22,0.8)] border-4 border-orange-500/30"
        />
      )}

      {/* Loader overlay — fades out once the model has painted its first frame */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: isLoaded ? 0 : 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <Loader />
      </motion.div>

      {/* Canvas wrapper — scales up and fades in after the first real paint */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={isLoaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <Suspense fallback={null}>
          <Canvas
            key={4}
            shadows
            performance={{ min: 0.5 }}
            dpr={
              typeof window !== "undefined" && window.devicePixelRatio > 1.5
                ? 1.5
                : 1
            }
            gl={{ antialias: true }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing touch-pan-y"
            camera={{
              position: [-1140, 8, -1500],
              fov: 50,
              far: 100000,
              near: 0.1,
            }}
          >
            <PreloadModels />
            <ambientLight intensity={0.5} />
            <spotLight
              position={[10, 10, 10]}
              angle={0.15}
              penumbra={1}
              shadow-mapSize={1024}
              castShadow={false}
            />

            <Float
              speed={2}
              rotationIntensity={1}
              floatIntensity={2}
            >
              <ResponsiveModel position={[0, -0.5, 0]} onFirstPaint={handleFirstPaint} />
            </Float>

            <ContactShadows
              resolution={512}
              scale={50}
              blur={2}
              opacity={0.5}
              far={50}
              color="#8a2be2"
            />
            <Environment
              files={`${STORAGE_URL}/brown_photostudio_01_1k.exr`}
              blur={0.8}
              backgroundIntensity={100}
            />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.5}
              enableDamping
              dampingFactor={0.05}
            />
          </Canvas>
        </Suspense>
      </motion.div>

      {/* Drag Indicator - Animated Hand, shown only after load for stable animation */}
      {isLoaded && (
        <div className="absolute bottom-4 right-7 md:bottom-10 md:right-10 pointer-events-none rotate-180">
          <motion.div
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: [-10, 10, -10], opacity: 1 }}
            transition={{
              x: {
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut",
              },
              opacity: { duration: 0.5 },
            }}
            className="text-white/80 drop-shadow-md"
          >
            <Hand className="w-8 h-8 rotate-90" />
          </motion.div>
        </div>
      )}
    </div>
  );
}
