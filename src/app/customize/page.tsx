
"use client";

import { useState } from "react";

export default function CustomizePage() {
  // スポンジの色
  const [spongeColor, setSpongeColor] = useState("#F5D6A0");

  // クリームの色
  const [creamColor, setCreamColor] = useState("#FFFFFF");

  // 苺の個数
  const [strawberryCount, setStrawberryCount] = useState(0);

  // 選択できる色（Ver0.5の仮設定）
  const colors = [
    { name: "ホワイト", value: "#FFFFFF" },
    { name: "ピンク", value: "#FFB6C1" },
    { name: "ブラウン", value: "#8B4513" },
  ];

  // 苺の仮座標
  const strawberryPositions = [
    { x: 85, y: 85 },
    { x: 155, y: 85 },
    { x: 120, y: 155 },
  ];

  return (
    <main className="min-h-screen bg-rose-50 p-8">
      {/* タイトル */}
      <h1 className="text-3xl font-bold text-rose-700">
        CakeCanvas
      </h1>

      <h2 className="mt-6 text-xl font-bold text-slate-900">
        ケーキの色を選んでください
      </h2>

      {/* ケーキの俯瞰SVG */}
      <svg
        viewBox="0 0 240 240"
        className="mx-auto mt-8 h-56 w-56"
        role="img"
        aria-label="ケーキの上面図"
      >
        {/* スポンジ */}
        <circle
          cx="120"
          cy="120"
          r="108"
          fill={spongeColor}
        />

        {/* クリーム */}
        <circle
          cx="120"
          cy="120"
          r="88"
          fill={creamColor}
        />

        {/* 苺の配置と番号 */}
        {strawberryPositions
          .slice(0, strawberryCount)
          .map((position, index) => (
            <g key={index}>
              <circle
                cx={position.x}
                cy={position.y}
                r="18"
                fill="#DC4349"
              />

              <text
                x={position.x}
                y={position.y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="15"
                fontWeight="bold"
              >
                {index + 1}
              </text>
            </g>
          ))}
      </svg>

      {/* スポンジの色 */}
      <h3 className="mt-8 text-center font-bold text-slate-900">
        スポンジの色
      </h3>

      <div className="mt-4 flex justify-center gap-4">
        {colors.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => setSpongeColor(color.value)}
            className="rounded border bg-white px-4 py-2 text-black"
          >
            {color.name}
          </button>
        ))}
      </div>

      {/* クリームの色 */}
      <h3 className="mt-8 text-center font-bold text-slate-900">
        クリームの色
      </h3>

      <div className="mt-4 flex justify-center gap-4">
        {colors.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => setCreamColor(color.value)}
            className="rounded border bg-white px-4 py-2 text-black"
          >
            {color.name}
          </button>
        ))}
      </div>

      {/* 苺の飾り付け */}
      <h3 className="mt-8 text-center font-bold text-slate-900">
        苺の飾り付け
      </h3>

      <p className="mt-2 text-center text-slate-900">
        苺の数：{strawberryCount}個
      </p>

      <div className="mt-4 flex justify-center gap-4">
        {/* 削除ボタン */}
        <button
          type="button"
          onClick={() =>
            setStrawberryCount((n) => Math.max(0, n - 1))
          }
          disabled={strawberryCount === 0}
          className="rounded bg-white px-6 py-2 text-black disabled:opacity-40"
        >
          削除
        </button>

        {/* 追加ボタン */}
        <button
          type="button"
          onClick={() =>
            setStrawberryCount((n) => Math.min(3, n + 1))
          }
          disabled={strawberryCount === 3}
          className="rounded bg-rose-500 px-6 py-2 text-white disabled:opacity-40"
        >
          苺を追加
        </button>
      </div>
    </main>
  );
}
