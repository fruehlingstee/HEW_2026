
"use client";

import { useRef, useState, type PointerEvent } from "react";
import {
  useCakeStore,
  CAKE_PRICE,
  STRAWBERRY_PRICE,
  MESSAGE_PRICE,
  MAX_STRAWBERRIES,
  type Position,
} from "@/store/cakeStore";

// 購入フローの4画面
const steps = [
  "色選択",
  "飾り付け",
  "メッセージ",
  "見積・確認",
];

const spongeColors = [
  { name: "プレーン", value: "#F5D6A0" },
  { name: "ピンク", value: "#FFB6C1" },
  { name: "ブラウン", value: "#8B4513" },
];

const creamColors = [
  { name: "ホワイト", value: "#FFFFFF" },
  { name: "ピンク", value: "#FFB6C1" },
  { name: "ブラウン", value: "#8B4513" },
];

// 保存する苺のデータ
type SavedPlacement = {
  strawberryCount: number;
  strawberryPositions: Position[];
};

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

// メッセージに使用できる文字
const allowedMessage =
  /^[A-Za-z0-9０-９Ａ-Ｚａ-ｚぁ-ゖァ-ヶ一-龯々〆〤ー 　。、！？!?・（）()「」『』.,\-]+$/u;

// メッセージの入力チェック
function validateMessage(value: string): string | null {
  if (value.trim().length === 0) {
    return "メッセージを入力してください";
  }

  if (/[\r\n]/.test(value)) {
    return "改行は使用できません";
  }

  if (Array.from(value).length > 20) {
    return "20文字以内で入力してください";
  }

  if (!allowedMessage.test(value)) {
    return "絵文字・特殊な文字は使用できません";
  }

  return null;
}

function formatPrice(price: number) {
  return price.toLocaleString("ja-JP") + "円";
}

// ケーキの俯瞰SVG
function CakePreview({ editable }: { editable: boolean }) {
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
  const moveStrawberry = useCakeStore(
    (state) => state.moveStrawberry
  );

  const draggingIndex = useRef<number | null>(null);

  function handlePointerMove(
    event: PointerEvent<SVGSVGElement>
  ) {
    if (!editable) return;

    const index = draggingIndex.current;
    if (index === null) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width) * 240;
    const y =
      ((event.clientY - rect.top) / rect.height) * 240;

    moveStrawberry(index, { x, y });
  }

  return (
    <svg
      viewBox="0 0 240 240"
      className="mx-auto my-6 h-60 w-60 touch-none select-none"
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

      {/* 苺 */}
      {strawberryPositions
        .slice(0, strawberryCount)
        .map((position, index) => (
          <g
            key={index}
            className={editable ? "cursor-grab" : ""}
            onPointerDown={(event) => {
              if (!editable) return;

              event.preventDefault();
              draggingIndex.current = index;

              event.currentTarget.ownerSVGElement?.setPointerCapture(
                event.pointerId
              );
            }}
          >
            <circle
              cx={position.x}
              cy={position.y}
              r="18"
              fill="#DC4349"
              stroke="#A92D35"
              strokeWidth="2"
            />

            <text
              x={position.x}
              y={position.y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="15"
              fontWeight="bold"
              pointerEvents="none"
            >
              {index + 1}
            </text>
          </g>
        ))}
    </svg>
  );
}

export default function CustomizePage() {
  // 現在の画面（0〜3）
  const [step, setStep] = useState(0);

  // Zustandのデータ
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
  const hasMessagePlate = useCakeStore(
    (state) => state.hasMessagePlate
  );
  const message = useCakeStore(
    (state) => state.message
  );

  // Zustandの操作
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
  const setHasMessagePlate = useCakeStore(
    (state) => state.setHasMessagePlate
  );
  const setMessage = useCakeStore(
    (state) => state.setMessage
  );

  // 見積もり
  const strawberryTotal =
    strawberryCount * STRAWBERRY_PRICE;

  const messageTotal =
    hasMessagePlate ? MESSAGE_PRICE : 0;

  const totalPrice =
    CAKE_PRICE + strawberryTotal + messageTotal;

  const messageError = hasMessagePlate
    ? validateMessage(message)
    : null;

  // 次の画面へ
  function nextStep() {
    if (step === 2 && messageError) return;

    setStep((current) => Math.min(3, current + 1));
  }

  // 前の画面へ
  function previousStep() {
    setStep((current) => Math.max(0, current - 1));
  }

  // 苺①を右へ移動
  function moveStrawberryRight() {
    if (strawberryCount === 0) return;

    const position = strawberryPositions[0];
    if (!position) return;

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
      alert("保存できませんでした");
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

      alert("配置を読み込みました！");
    } catch {
      alert("読み込みに失敗しました");
    }
  }

  return (
    <main className="min-h-screen bg-rose-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl">
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-rose-700">
          CakeCanvas
        </h1>

        <p className="mt-2 text-slate-600">
          ケーキを、あなたらしく。
        </p>

        {/* 進捗表示 */}
        <div className="mt-8 grid grid-cols-4 gap-2">
          {steps.map((name, index) => (
            <div
              key={name}
              className={`rounded p-2 text-center text-xs sm:text-sm ${
                step === index
                  ? "bg-rose-600 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              {index + 1}. {name}
            </div>
          ))}
        </div>

        {/* STEP 1：色選択 */}
        {step === 0 && (
          <section className="mt-8 rounded-xl bg-white p-6">
            <h2 className="text-2xl font-bold">
              ① ケーキの色選択
            </h2>

            <p className="mt-2 text-slate-600">
              スポンジとクリームの色を選んでください。
            </p>

            <CakePreview editable={false} />

            <h3 className="mt-6 font-bold">
              スポンジの色
            </h3>

            <div className="mt-3 flex flex-wrap gap-3">
              {spongeColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() =>
                    setSpongeColor(color.value)
                  }
                  aria-pressed={
                    spongeColor === color.value
                  }
                  className={`rounded border px-4 py-2 ${
                    spongeColor === color.value
                      ? "border-rose-600 bg-rose-100"
                      : "border-slate-300"
                  }`}
                >
                  {color.name}
                </button>
              ))}
            </div>

            <h3 className="mt-8 font-bold">
              クリームの色
            </h3>

            <div className="mt-3 flex flex-wrap gap-3">
              {creamColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() =>
                    setCreamColor(color.value)
                  }
                  aria-pressed={
                    creamColor === color.value
                  }
                  className={`rounded border px-4 py-2 ${
                    creamColor === color.value
                      ? "border-rose-600 bg-rose-100"
                      : "border-slate-300"
                  }`}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* STEP 2：飾り付け */}
        {step === 1 && (
          <section className="mt-8 rounded-xl bg-white p-6">
            <h2 className="text-2xl font-bold">
              ② 苺の飾り付け
            </h2>

            <p className="mt-2 text-slate-600">
              苺を追加し、ドラッグして配置してください。
            </p>

            <CakePreview editable={true} />

            <p className="text-center font-bold">
              苺の数：{strawberryCount}個
            </p>

            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={removeStrawberry}
                disabled={strawberryCount === 0}
                className="rounded border px-5 py-2 disabled:opacity-40"
              >
                削除
              </button>

              <button
                type="button"
                onClick={addStrawberry}
                disabled={
                  strawberryCount >= MAX_STRAWBERRIES
                }
                className="rounded bg-rose-600 px-5 py-2 text-white disabled:opacity-40"
              >
                苺を追加
              </button>
            </div>

            <button
              type="button"
              onClick={moveStrawberryRight}
              disabled={strawberryCount === 0}
              className="mx-auto mt-4 block rounded bg-rose-700 px-5 py-2 text-white disabled:opacity-40"
            >
              苺①を右へ移動
            </button>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={savePlacement}
                className="rounded bg-green-700 px-4 py-2 text-white"
              >
                配置を保存
              </button>

              <button
                type="button"
                onClick={loadPlacement}
                className="rounded bg-blue-700 px-4 py-2 text-white"
              >
                配置を読み込む
              </button>
            </div>

            {/* 座標一覧 */}
            <h3 className="mt-8 text-center font-bold">
              苺の座標一覧
            </h3>

            <table className="mt-3 w-full border-collapse text-center">
              <thead>
                <tr className="bg-rose-100">
                  <th className="border p-2">番号</th>
                  <th className="border p-2">X</th>
                  <th className="border p-2">Y</th>
                </tr>
              </thead>

              <tbody>
                {strawberryPositions
                  .slice(0, strawberryCount)
                  .map((position, index) => (
                    <tr key={index}>
                      <td className="border p-2">
                        苺{index + 1}
                      </td>
                      <td className="border p-2">
                        {position.x}
                      </td>
                      <td className="border p-2">
                        {position.y}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <p className="mt-5 text-center">
              苺の小計：{formatPrice(strawberryTotal)}
            </p>
          </section>
        )}

        {/* STEP 3：メッセージ */}
        {step === 2 && (
          <section className="mt-8 rounded-xl bg-white p-6">
            <h2 className="text-2xl font-bold">
              ③ メッセージプレート
            </h2>

            <p className="mt-2 text-slate-600">
              プレートを追加する場合は、文字を入力してください。
            </p>

            <label className="mt-6 flex items-center gap-3">
              <input
                type="checkbox"
                checked={hasMessagePlate}
                onChange={(event) =>
                  setHasMessagePlate(event.target.checked)
                }
                className="h-5 w-5"
              />
              メッセージプレートを追加する（300円・仮）
            </label>

            {hasMessagePlate && (
              <div className="mt-6">
                <label
                  htmlFor="cake-message"
                  className="block font-bold"
                >
                  メッセージ（20文字以内・1行）
                </label>

                <input
                  id="cake-message"
                  type="text"
                  value={message}
                  maxLength={20}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Happy Birthday"
                  aria-invalid={Boolean(messageError)}
                  className="mt-3 w-full rounded border border-slate-300 p-3"
                />

                <p className="mt-2 text-sm text-slate-500">
                  {Array.from(message).length}/20文字
                </p>

                {messageError && (
                  <p
                    role="alert"
                    className="mt-2 text-sm text-red-600"
                  >
                    {messageError}
                  </p>
                )}

                <p className="mt-3 text-sm text-slate-500">
                  絵文字・機種依存文字・改行は使用できません。
                </p>
              </div>
            )}

            {!hasMessagePlate && (
              <p className="mt-6 text-slate-600">
                プレートなしで次へ進めます。
              </p>
            )}
          </section>
        )}

        {/* STEP 4：見積・確認 */}
        {step === 3 && (
          <section className="mt-8 rounded-xl bg-white p-6">
            <h2 className="text-2xl font-bold">
              ④ 見積・確認
            </h2>

            <p className="mt-2 text-slate-600">
              カスタマイズした内容を確認してください。
            </p>

            <CakePreview editable={false} />

            <div className="space-y-3">
              <p>
                スポンジ：
                <strong>{spongeColor}</strong>
              </p>

              <p>
                クリーム：
                <strong>{creamColor}</strong>
              </p>

              <p>
                苺：<strong>{strawberryCount}個</strong>
              </p>

              <p>
                メッセージ：
                <strong>
                  {hasMessagePlate ? message : "なし"}
                </strong>
              </p>
            </div>

            <h3 className="mt-8 text-xl font-bold">
              お見積もり
            </h3>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span>5号ケーキ</span>
                <span>{formatPrice(CAKE_PRICE)}</span>
              </div>

              <div className="flex justify-between">
                <span>色指定</span>
                <span>0円</span>
              </div>

              <div className="flex justify-between">
                <span>苺（{strawberryCount}個）</span>
                <span>
                  {formatPrice(strawberryTotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>メッセージプレート</span>
                <span>
                  {formatPrice(messageTotal)}
                </span>
              </div>

              <hr />

              <div className="flex justify-between text-xl font-bold">
                <span>合計（税抜）</span>
                <span className="text-rose-700">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              ※開発用の仮価格です。注文や決済は行われません。
            </p>
          </section>
        )}

        {/* 戻る・次へ */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 0}
            className="rounded border border-slate-300 bg-white px-6 py-3 disabled:opacity-40"
          >
            戻る
          </button>

          {step < 3 && (
            <button
              type="button"
              onClick={nextStep}
              disabled={
                step === 2 && Boolean(messageError)
              }
              className="rounded bg-rose-600 px-6 py-3 text-white disabled:opacity-40"
            >
              次へ →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
