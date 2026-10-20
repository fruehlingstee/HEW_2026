
"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";

import {
  Bounds,
  Center,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

// ケーキの種類
const cakeModels = [
  {
    id: "vanilla",
    name: "バニラ",
    path: "/models/bases/cake-base-vanilla.glb",
  },
  {
    id: "chocolate",
    name: "チョコレート",
    path: "/models/bases/cake-base-chocolate.glb",
  },
  {
    id: "cocoa",
    name: "ココア",
    path: "/models/bases/cake-base-cocoa.glb",
  },
  {
    id: "matcha",
    name: "抹茶",
    path: "/models/bases/cake-base-matcha.glb",
  },
  {
    id: "strawberry",
    name: "ストロベリー",
    path: "/models/bases/cake-base-strawberry.glb",
  },
] as const;

type CakeId = (typeof cakeModels)[number]["id"];

// GLBモデルを読み込む
function CakeModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);

  return <primitive object={scene} />;
}

// 3D検証ページ
export default function ThreeDPreviewPage() {
  // 選択中のケーキ
  const [cakeId, setCakeId] = useState<CakeId>(
    "vanilla"
  );

  const selectedCake =
    cakeModels.find((cake) => cake.id === cakeId) ??
    cakeModels[0];

  return (
    <main className="min-h-screen bg-rose-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-rose-700">
          CakeCanvas
        </h1>

        <p className="mt-2 text-slate-600">
          ケーキを、あなたらしく。
        </p>

        <h2 className="mt-8 text-2xl font-bold">
          3Dケーキプレビュー
        </h2>

        <p className="mt-3 text-slate-600">
          ケーキの種類を選択してください。
        </p>

        {/* 種類選択ボタン */}
        <div className="mt-6 flex flex-wrap gap-3">
          {cakeModels.map((cake) => (
            <button
              key={cake.id}
              type="button"
              onClick={() => setCakeId(cake.id)}
              aria-pressed={cakeId === cake.id}
              className={`rounded-lg border px-5 py-3 transition ${
                cakeId === cake.id
                  ? "border-rose-700 bg-rose-600 text-white"
                  : "border-rose-200 bg-white text-slate-800 hover:bg-rose-100"
              }`}
            >
              {cake.name}
            </button>
          ))}
        </div>

        {/* 選択中のケーキ */}
        <div className="mt-6 rounded-xl bg-white p-4">
          <p className="text-sm text-slate-500">
            現在選択中
          </p>

          <h3 className="mt-1 text-xl font-bold text-rose-700">
            {selectedCake.name}ケーキ
          </h3>
        </div>

        {/* 3D表示エリア */}
        <div className="mt-5 h-[500px] w-full overflow-hidden rounded-2xl border border-rose-200 bg-white">
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

            {/* ライト */}
            <ambientLight intensity={1.5} />

            <directionalLight
              position={[3, 5, 4]}
              intensity={2}
            />

            <directionalLight
              position={[-3, 3, -4]}
              intensity={1}
            />

            {/* ケーキモデル */}
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
                key={selectedCake.id}
                fit
                clip
                observe
                margin={1.3}
              >
                <Center>
                  <CakeModel path={selectedCake.path} />
                </Center>
              </Bounds>
            </Suspense>

            {/* 回転・拡大 */}
            <OrbitControls
              makeDefault
              enableDamping
              enablePan={false}
              minDistance={0.1}
              maxDistance={100}
            />
          </Canvas>
        </div>

        {/* 操作説明 */}
        <div className="mt-6 rounded-xl bg-white p-5">
          <h3 className="text-lg font-bold">
            操作方法
          </h3>

          <div className="mt-4 space-y-2 text-slate-700">
            <p>マウスドラッグ：ケーキを回転</p>
            <p>マウスホイール：拡大・縮小</p>
            <p>上のボタン：ケーキの種類を変更</p>
          </div>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          ※3D表示の検証ページです。
          まだ購入画面との連携はしていません。
        </p>
      </div>
    </main>
  );
}
