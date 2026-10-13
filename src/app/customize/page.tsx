
"use client";

import { useRef, useState, type PointerEvent } from "react";

type Position = {
  x: number;
  y: number;
};

type SavedPlacement = {
  strawberryCount: number;
  strawberryPositions: Position[];
};

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
  const [strawberryPositions, setStrawberryPositions] = useState<
    Position[]
  >([
    { x: 85, y: 85 },
    { x: 155, y: 85 },
    { x: 120, y: 155 },
  ]);

  // ドラッグ中の苺の番号
  const draggingIndex = useRef<number | null>(null);

  // 苺がケーキからはみ出さないようにする
  function limitPosition(x: number, y: number): Position {
    const dx = x - 120;
    const dy = y - 120;
    const distance = Math.hypot(dx, dy);

    const ratio = distance > 70 ? 70 / distance : 1;

    return {
      x: Math.round(120 + dx * ratio),
      y: Math.round(120 + dy * ratio),
    };
  }

  // マウス・タッチで苺を動かす
  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const index = draggingIndex.current;

    if (index === null) return;

    const rect = event.currentTarget.getBoundingClientRect();

    // マウスの位置をSVG座標に変換
    const x = ((event.clientX - rect.left) / rect.width) * 240;
    const y = ((event.clientY - rect.top) / rect.height) * 240;

    const newPosition = limitPosition(x, y);

    // ドラッグしている苺だけ移動する
    setStrawberryPositions((positions) =>
      positions.map((position, i) =>
        i === index ? newPosition : position
      )
    );
  }

  // 苺①を右へ移動する
  function moveStrawberryRight() {
    setStrawberryPositions((positions) =>
      positions.map((position, index) =>
        index === 0
          ? limitPosition(position.x + 10, position.y)
          : position
      )
    );
  }

  // 苺の配置をブラウザに保存する
  function savePlacement() {
    const data: SavedPlacement = {
      strawberryCount,
      strawberryPositions,
    };

    localStorage.setItem(
      "cakecanvas-strawberries",
      JSON.stringify(data)
    );

    alert("苺の配置を保存しました！");
  }

  // 保存した苺の配置を読み込む
  function loadPlacement() {
    const saved = localStorage.getItem("cakecanvas-strawberries");

    if (!saved) {
      alert("保存データがありません");
      return;
    }

    try {
      const data: SavedPlacement = JSON.parse(saved);

      // 保存データが正しいか確認する
      if (
        !Number.isInteger(data?.strawberryCount) ||
        data.strawberryCount < 0 ||
        data.strawberryCount > 3 ||
        !Array.isArray(data.strawberryPositions) ||
        data.strawberryPositions.length !== 3 ||
        !data.strawberryPositions.every(
          (p) =>
            p !== null &&
            Number.isFinite(p?.x) &&
            Number.isFinite(p?.y)
        )
      ) {
        throw new Error("保存データが不正です");
      }

      // 個数を復元する
      setStrawberryCount(data.strawberryCount);

      // 苺の位置を復元する
      setStrawberryPositions(
        data.strawberryPositions.map((p) =>
          limitPosition(p.x, p.y)
        )
      );

      alert("苺の配置を読み込みました！");
    } catch {
      alert("保存データを読み込めませんでした");
    }
  }

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
        className="mx-auto mt-8 h-56 w-56 touch-none select-none"
        role="img"
        aria-label="ケーキの上面図"
        onPointerMove={handlePointerMove}
        onPointerUp={() => {
          draggingIndex.current = null;
        }}
        onPointerCancel={() => {
          draggingIndex.current = null;
        }}
        onLostPointerCapture={() => {
          draggingIndex.current = null;
        }}
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
            <g
              key={index}
              className="cursor-grab"
              onPointerDown={(event) => {
                event.preventDefault();

                draggingIndex.current = index;

                event.currentTarget.ownerSVGElement?.setPointerCapture(
                  event.pointerId
                );
              }}
            >
              {/* 苺を赤い丸で表示 */}
              <circle
                cx={position.x}
                cy={position.y}
                r="18"
                fill="#DC4349"
                stroke="#A92D35"
                strokeWidth="2"
              />

              {/* 苺の番号 */}
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

      {/* 苺①を右へ動かすボタン */}
      <button
        type="button"
        onClick={moveStrawberryRight}
        disabled={strawberryCount === 0}
        className="mx-auto mt-4 block rounded bg-rose-700 px-6 py-2 text-white disabled:opacity-40"
      >
        苺①を右へ移動
      </button>

      {/* 配置の保存・読み込み */}
      <div className="mt-6 flex justify-center gap-4">
        <button
          type="button"
          onClick={savePlacement}
          className="rounded bg-green-600 px-6 py-2 text-white"
        >
          配置を保存
        </button>

        <button
          type="button"
          onClick={loadPlacement}
          className="rounded bg-blue-600 px-6 py-2 text-white"
        >
          配置を読み込む
        </button>
      </div>
    </main>
  );
}
