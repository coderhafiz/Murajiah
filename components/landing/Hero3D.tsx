"use client";

import { useRef, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree, ThreeElements } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  ContactShadows,
  Float,
  useGLTF,
} from "@react-three/drei";
import { KTX2Loader, DRACOLoader, GLTFLoader, GLTF } from "three-stdlib";
import { Group, WebGLRenderer } from "three";
import { Move3d } from "lucide-react";

// --- Loader Management ---

let ktx2Loader: KTX2Loader | null = null;

function getKTX2Loader(gl: WebGLRenderer) {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("/basis/");
    ktx2Loader.detectSupport(gl);
  }
  return ktx2Loader;
}

function setupLoaders(loader: GLTFLoader, gl: WebGLRenderer) {
  const ktx2 = getKTX2Loader(gl);
  loader.setKTX2Loader(ktx2);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
  );
  loader.setDRACOLoader(dracoLoader);
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

function Model(props: ThreeElements["group"]) {
  const group = useRef<Group>(null);
  const { gl } = useThree();

  // Load the model, configuring loaders with the current GL context
  const { scene } = useGLTF(
    `${STORAGE_URL}/rubiks_compressed.glb`,
    undefined,
    undefined,
    (loader) => setupLoaders(loader as GLTFLoader, gl),
  ) as unknown as GLTF;

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.getElapsedTime();
      group.current.rotation.z = -0.2 - (1 + Math.sin(t / 1.5)) / 20;
      group.current.rotation.x = Math.cos(t / 4) / 8 + 0.5; // Tilt up towards top
      group.current.rotation.y = Math.sin(t / 4) / 8 - 0.5; // Turn left towards left
      group.current.position.y = (1 + Math.sin(t / 1.5)) / 10;
    }
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} scale={7} />
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
          key={3}
          shadows
          className="cursor-grab active:cursor-grabbing"
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
            shadow-mapSize={2048}
            castShadow
          />
          <Model position={[0, -0.5, 0]} />
          <ContactShadows
            resolution={1024}
            scale={100}
            blur={2}
            opacity={0.5}
            far={50}
            color="#8a2be2" // Purple shadow for contrast
          />
          {/* HDRI Environment */}
          <Environment
            files={`${STORAGE_URL}/brown_photostudio_05_4k.exr`}
            blur={0.8}
            backgroundIntensity={100}
          />

          <Float
            speed={2} // Animation speed, defaults to 1
            rotationIntensity={1} // XYZ rotation intensity, defaults to 1
            floatIntensity={2} // Up/down float intensity, defaults to 1
          />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </Suspense>

      {/* Drag Indicator */}
      <div className="absolute bottom-4 right-4 md:bottom-10 md:right-10 flex items-center gap-2 text-muted-foreground/50 text-xs md:text-sm font-medium pointer-events-none animate-pulse">
        <Move3d className="w-4 h-4" />
        <span>Drag to explore</span>
      </div>
    </div>
  );
}
