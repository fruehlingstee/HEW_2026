
"use client";

import { useRef, type PointerEvent } from "react";

import {
  useCakeStore,
  CAKE_PRICE,
  STRAWBERRY_PRICE,
  MAX_STRAWBERRIES,
  type Position,
} from "@/store/cakeStore";

// 色の選択肢
const colors = [
  { name: "ホワイト", value: "#FFFFFF" },
  { name: "ピンク", value: "#FFB6C1" },
  { name: "ブラウン", value: "#8B4513" },
];

// 保存データの形式
type SavedPlacement = {
  strawberryCount: number;
  strawberryPositions: Position[];
};

// 保存データのチェック
function isSavedPlacement(
  value: unknown
): value is SavedPlacement {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;
  const count = data.strawberryCount;
  const positions = data.strawberryPositions;

  if (
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > MAX_STRAWBERRIES ||
    !Array.isArray(positions) ||
    positions.length !== MAX_STRAWBERRIES
  ) {
    return false;
  }

  return positions.every((position: unknown) => {
    if (
      typeof position !== "object" ||
      position === null
    ) {
      return false;
    }

    const p = position as Record<string, unknown>;

    return (
      typeof p.x === "number" &&
      typeof p.y === "number" &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y)
    );
  });
}

// 金額の表示
function formatPrice(price: number) {
  return price.toLocaleString("ja-JP") + "円";
}

export default function CustomizePage() {
  // Zustandからデータを取得
  const spongeColor = useCakeStore(
    (state) => state.spongeColor
  );

  const creamColor = useCakeStore(
    (state) => state.creamColor
  );

  const strawberryCount = useCakeStore(
    (state) => state.strawberryCount
  );

  const strawberryPositions = useCakeStore(
    (state) => state.strawberryPositions
  );

  // Zustandの操作を取得
  const setSpongeColor = useCakeStore(
    (state) => state.setSpongeColor
  );

  const setCreamColor = useCakeStore(
    (state) => state.setCreamColor
  );

  const addStrawberry = useCakeStore(
    (state) => state.addStrawberry
  );

  const removeStrawberry = useCakeStore(
    (state) => state.removeStrawberry
  );

  const moveStrawberry = useCakeStore(
    (state) => state.moveStrawberry
  );

  const restoreStrawberries = useCakeStore(
    (state) => state.restoreStrawberries
  );

  // ドラッグしている苺
  const draggingIndex = useRef<number | null>(null);

  // 金額計算
  const strawberryTotal =
    strawberryCount * STRAWBERRY_PRICE;

  const totalPrice = CAKE_PRICE + strawberryTotal;

  // 苺をドラッグして移動
  function handlePointerMove(
    event: PointerEvent<SVGSVGElement>
  ) {
    const index = draggingIndex.current;

    if (index === null) return;

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width) * 240;

    const y =
      ((event.clientY - rect.top) / rect.height) * 240;

    moveStrawberry(index, { x, y });
  }

  // 苺①を右へ移動
  function moveStrawberryRight() {
    const position = strawberryPositions[0];

    if (!position || strawberryCount === 0) return;

    moveStrawberry(0, {
      x: position.x + 10,
      y: position.y,
    });
  }

  // 苺の配置を保存
  function savePlacement() {
    const data: SavedPlacement = {
      strawberryCount,
      strawberryPositions,
    };

    try {
      localStorage.setItem(
        "cakecanvas-strawberries",
        JSON.stringify(data)
      );

      alert("苺の配置を保存しました！");
    } catch {
      alert("配置を保存できませんでした");
    }
  }

  // 苺の配置を読み込み
  function loadPlacement() {
    try {
      const saved = localStorage.getItem(
        "cakecanvas-strawberries"
      );

      if (!saved) {
        alert("保存データがありません");
        return;
      }

      const data: unknown = JSON.parse(saved);

      if (!isSavedPlacement(data)) {
        throw new Error("保存データが不正です");
      }

      restoreStrawberries(
        data.strawberryCount,
        data.strawberryPositions
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

        {/* 苺と番号 */}
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
              {/* 苺 */}
              <circle
                cx={position.x}
                cy={position.y}
                r="18"
                fill="#DC4349"
                stroke="#A92D35"
                strokeWidth="2"
              />

              {/* 番号 */}
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
            onClick={() =>
              setSpongeColor(color.value)
            }
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
            onClick={() =>
              setCreamColor(color.value)
            }
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
        {/* 苺を削除 */}
        <button
          type="button"
          onClick={removeStrawberry}
          disabled={strawberryCount === 0}
          className="rounded bg-white px-6 py-2 text-black disabled:opacity-40"
        >
          削除
        </button>

        {/* 苺を追加 */}
        <button
          type="button"
          onClick={addStrawberry}
          disabled={
            strawberryCount === MAX_STRAWBERRIES
          }
          className="rounded bg-rose-500 px-6 py-2 text-white disabled:opacity-40"
        >
          苺を追加
        </button>
      </div>

      {/* 苺①を右へ移動 */}
      <button
        type="button"
        onClick={moveStrawberryRight}
        disabled={strawberryCount === 0}
        className="mx-auto mt-4 block rounded bg-rose-700 px-6 py-2 text-white disabled:opacity-40"
      >
        苺①を右へ移動
      </button>

      {/* 保存・読み込み */}
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

      {/* 苺の座標一覧 */}
      <section className="mx-auto mt-10 max-w-md">
        <h3 className="mb-4 text-center text-xl font-bold text-slate-900">
          苺の座標一覧
        </h3>

        <table className="w-full border-collapse bg-white text-center text-slate-900">
          <thead>
            <tr className="bg-rose-200">
              <th className="border p-3">苺番号</th>
              <th className="border p-3">X座標</th>
              <th className="border p-3">Y座標</th>
            </tr>
          </thead>

          <tbody>
            {strawberryPositions
              .slice(0, strawberryCount)
              .map((position, index) => (
                <tr key={index}>
                  <td className="border p-3">
                    苺{index + 1}
                  </td>

                  <td className="border p-3">
                    {position.x}
                  </td>

                  <td className="border p-3">
                    {position.y}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {strawberryCount === 0 && (
          <p className="mt-3 text-center text-slate-600">
            苺を追加すると座標が表示されます
          </p>
        )}
      </section>

      {/* 価格の自動計算 */}
      <section className="mx-auto mt-10 max-w-md rounded-xl bg-white p-6 shadow">
        <h3 className="mb-6 text-xl font-bold text-slate-900">
          お見積もり
        </h3>

        <div className="space-y-4 text-slate-900">
          <div className="flex justify-between">
            <span>5号ケーキ（1台）</span>
            <span>{formatPrice(CAKE_PRICE)}</span>
          </div>

          <div className="flex justify-between">
            <span>スポンジ・クリーム色指定</span>
            <span>0円</span>
          </div>

          <div className="flex justify-between">
            <span>苺（{strawberryCount}個）</span>
            <span>{formatPrice(strawberryTotal)}</span>
          </div>

          <hr className="border-slate-200" />

          <div className="flex items-center justify-between">
            <span className="font-bold">
              合計（税抜）
            </span>

            <span className="text-2xl font-bold text-rose-700">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-500">
          ※開発用の仮価格です。実際の注文・決済は行われません。
        </p>
      </section>
    </main>
  );
}
