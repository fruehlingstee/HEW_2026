
"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  Center,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

import { Box3, Vector3 } from "three";

import { useCakeStore } from "@/store/cakeStore";

// 3Dモデルのファイル
const cakePaths = {
  vanilla: "/models/bases/cake-base-vanilla.glb",
  chocolate: "/models/bases/cake-base-chocolate.glb",
  cocoa: "/models/bases/cake-base-cocoa.glb",
  matcha: "/models/bases/cake-base-matcha.glb",
  strawberry: "/models/bases/cake-base-strawberry.glb",
} as const;

export type CakeType = keyof typeof cakePaths;

// SVGの座標情報
const SVG_CENTER = 120;
const SVG_PLACEMENT_RADIUS = 70;

// 3Dケーキと苺を表示
function CakeModel({
  type,
}: {
  type: CakeType;
}) {
  // GLBモデルの読み込み
  const { scene } = useGLTF(cakePaths[type]);

  // SVGで配置した飾りを取得
  const decorations = useCakeStore(
    (state) => state.decorations
  );

  // 読み込んだモデルの複製
  const model = useMemo(
    () => scene.clone(true),
    [scene]
  );

  // 3Dモデルの大きさと中心を調べる
  const dimensions = useMemo(() => {
    const box = new Box3().setFromObject(model);

    const size = new Vector3();
    const center = new Vector3();

    box.getSize(size);
    box.getCenter(center);

    // ケーキの半径（モデルから推定）
    const cakeRadius = Math.max(
      Math.min(size.x, size.z) / 2,
      0.01
    );

    // 苺を置ける範囲
    const placementRadius = cakeRadius * 0.68;

    // 仮の苺の大きさ
    const strawberryRadius = cakeRadius * 0.13;

    return {
      centerX: center.x,
      centerZ: center.z,
      topY: box.max.y,
      placementRadius,
      strawberryRadius,
    };
  }, [model]);

  // 現在は苺だけを3Dで表示
  const strawberries = decorations.filter(
    (decoration) =>
      decoration.type === "strawberry"
  );

  return (
    <group>
      {/* ケーキの3Dモデル */}
      <primitive object={model} />

      {/* SVGの苺を3D座標に変換して表示 */}
      {strawberries.map((strawberry) => {
        // SVGのX座標を3DのX座標へ
        const x =
          dimensions.centerX +
          ((strawberry.x - SVG_CENTER) /
            SVG_PLACEMENT_RADIUS) *
            dimensions.placementRadius;

        // SVGのY座標を3DのZ座標へ
        const z =
          dimensions.centerZ +
          ((strawberry.y - SVG_CENTER) /
            SVG_PLACEMENT_RADIUS) *
            dimensions.placementRadius;

        // ケーキの上面に置く
        const y =
          dimensions.topY +
          dimensions.strawberryRadius * 0.55;

        return (
          <mesh
            key={strawberry.id}
            position={[x, y, z]}
          >
            {/* 仮の苺：赤い球 */}
            <sphereGeometry
              args={[
                dimensions.strawberryRadius,
                24,
                16,
              ]}
            />

            <meshStandardMaterial
              color="#E63946"
              roughness={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
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
        {/* 背景色 */}
        <color
          attach="background"
          args={["#FFF5F5"]}
        />

        {/* 照明 */}
        <ambientLight intensity={1.5} />

        <directionalLight
          position={[3, 5, 4]}
          intensity={2}
        />

        <directionalLight
          position={[-3, 3, -4]}
          intensity={1}
        />

        {/* ケーキと苺 */}
        <Suspense
          fallback={
            <Html center>
              <div className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm text-slate-700 shadow">
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

        {/* マウス操作 */}
        <OrbitControls
          makeDefault
          enableDamping
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
