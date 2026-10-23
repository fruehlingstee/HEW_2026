
"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";

import {
  Bounds,
  Center,
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

  // 読み込んだモデルを複製
  const model = useMemo(
    () => scene.clone(true),
    [scene]
  );

  // 3Dモデルの大きさと位置を調べる
  const dimensions = useMemo(() => {
    const box = new Box3().setFromObject(model);

    const size = new Vector3();
    const center = new Vector3();

    box.getSize(size);
    box.getCenter(center);

    // ケーキの半径
    const cakeRadius = Math.max(
      Math.min(size.x, size.z) / 2,
      0.01
    );

    // 苺を配置できる半径
    const placementRadius = cakeRadius * 0.68;

    // 仮の苺のサイズ
    const strawberryRadius = cakeRadius * 0.13;

    return {
      centerX: center.x,
      centerZ: center.z,
      topY: box.max.y,
      placementRadius,
      strawberryRadius,
    };
  }, [model]);

  // 現在は苺だけを3Dに反映
  const strawberries = decorations.filter(
    (decoration) =>
      decoration.type === "strawberry"
  );

  return (
    <group>
      {/* ケーキの土台 */}
      <primitive object={model} />

      {/* 苺の3D表示 */}
      {strawberries.map((strawberry) => {
        // SVG座標を3D座標に変換
        const x =
          dimensions.centerX +
          ((strawberry.x - SVG_CENTER) /
            SVG_PLACEMENT_RADIUS) *
            dimensions.placementRadius;

        const z =
          dimensions.centerZ +
          ((strawberry.y - SVG_CENTER) /
            SVG_PLACEMENT_RADIUS) *
            dimensions.placementRadius;

        // ケーキ上面の高さ
        const y =
          dimensions.topY +
          dimensions.strawberryRadius * 0.55;

        return (
          <mesh
            key={strawberry.id}
            position={[x, y, z]}
          >
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

        {/* 3Dモデルの読み込み */}
        {/* Htmlを使わず、安全なfallbackに変更 */}
        <Suspense fallback={null}>
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
