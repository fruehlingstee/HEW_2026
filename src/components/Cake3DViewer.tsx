
"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  Center,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

// 利用できるケーキの種類
const cakePaths = {
  vanilla: "/models/bases/cake-base-vanilla.glb",
  chocolate: "/models/bases/cake-base-chocolate.glb",
  cocoa: "/models/bases/cake-base-cocoa.glb",
  matcha: "/models/bases/cake-base-matcha.glb",
  strawberry: "/models/bases/cake-base-strawberry.glb",
};

export type CakeType = keyof typeof cakePaths;

// GLBモデルを読み込む
function CakeModel({ type }: { type: CakeType }) {
  const { scene } = useGLTF(cakePaths[type]);

  return <primitive object={scene} />;
}

// 共通3Dプレビュー
export default function Cake3DViewer({
  type = "vanilla",
}: {
  type?: CakeType;
}) {
  return (
    <div className="h-[450px] w-full overflow-hidden rounded-2xl border border-rose-200 bg-white">
      <Canvas
        camera={{
          position: [3, 2.5, 4],
          fov: 45,
        }}
      >
        <color
          attach="background"
          args={["#FFF5F5"]}
        />

        <ambientLight intensity={1.5} />

        <directionalLight
          position={[3, 5, 4]}
          intensity={2}
        />

        <directionalLight
          position={[-3, 3, -4]}
          intensity={1}
        />

        <Suspense
          fallback={
            <Html center>
              <div className="whitespace-nowrap rounded-lg bg-white p-3 text-sm">
                3Dモデルを読み込み中...
              </div>
            </Html>
          }
        >
          <Bounds
            key={type}
            fit
            clip
            observe
            margin={1.3}
          >
            <Center>
              <CakeModel type={type} />
            </Center>
          </Bounds>
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
