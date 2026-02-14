"use client";

import { useRef, Suspense, useEffect } from "react";
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

// Refactored Model component using <Gltf> from drei
function ResponsiveModel(props: ThreeElements["group"]) {
  const group = useRef<Group>(null);
  const { gl } = useThree();

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.elapsedTime;
      group.current.rotation.z = -0.2 - (1 + Math.sin(t / 1.5)) / 20;
      group.current.rotation.x = Math.cos(t / 4) / 8 + 0.5; // Tilt up towards top
      group.current.rotation.y = Math.sin(t / 4) / 8 - 0.5; // Turn left towards left
      group.current.position.y = (1 + Math.sin(t / 1.5)) / 10;
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
    <div className="flex items-center justify-center w-full h-full text-sm font-medium text-muted-foreground animate-pulse">
      Loading 3D Model...
    </div>
  );
}

export default function Hero3D() {
  return (
    <div className="w-full h-[250px] md:h-[400px] lg:h-[600px] relative z-10 flex items-center justify-center">
      <div className="absolute translate-y-[35%] w-[80%] h-[60%] bg-linear-to-tr from-red-600 via-orange-500 to-amber-400 rounded-3xl -rotate-6 shadow-[0_0_100px_-20px_rgba(249,115,22,0.8)] border-4 border-orange-500/30" />

      <Suspense fallback={<Loader />}>
        {/* Force remount with key when camera changes to ensure it updates */}
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
          className="cursor-grab active:cursor-grabbing touch-pan-y" // Allow vertical scroll
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
            shadow-mapSize={1024} // Reduced shadow map size
            castShadow={false}
          />

          <Float
            speed={2} // Animation speed, defaults to 1
            rotationIntensity={1} // XYZ rotation intensity, defaults to 1
            floatIntensity={2} // Up/down float intensity, defaults to 1
          >
            <ResponsiveModel position={[0, -0.5, 0]} />
          </Float>

          <ContactShadows
            resolution={512} // Lower resolution for better performance
            scale={50} // slightly smaller scale
            blur={2}
            opacity={0.5}
            far={50}
            color="#8a2be2"
          />
          {/* HDRI Environment */}
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

      {/* Drag Indicator - Animated Hand */}
      <div className="absolute bottom-4 right-7 md:bottom-10 md:right-10 pointer-events-none rotate-180">
        <motion.div
          animate={{ x: [-10, 10, -10] }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "easeInOut",
          }}
          className="text-white/80 drop-shadow-md"
        >
          <Hand className="w-8 h-8 rotate-90" />
        </motion.div>
      </div>
    </div>
  );
}
