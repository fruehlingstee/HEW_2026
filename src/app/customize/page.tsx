
"use client";

import { useRef, useState, type PointerEvent } from "react";
import dynamic from "next/dynamic";

import type { CakeType } from "@/components/Cake3DViewer";

import {
  useCakeStore,
  CAKE_PRICE,
  MESSAGE_PRICE,
  MAX_DECORATIONS,
  DECORATION_CATALOG,
  type CakeDesign,
  type Decoration,
  type DecorationType,
} from "@/store/cakeStore";

// 3Dコンポーネントはブラウザ側で読み込む
const Cake3DViewer = dynamic(
  () => import("@/components/Cake3DViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[450px] items-center justify-center rounded-2xl bg-rose-50">
        3Dモデルを読み込み中...
      </div>
    ),
  }
);

// 購入フロー
const steps = [
  "色選択",
  "飾り付け",
  "メッセージ",
  "見積・確認",
];

// 色の候補
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

// 3Dモデルの候補
const cakeModels: {
  id: CakeType;
  name: string;
}[] = [
  { id: "vanilla", name: "バニラ" },
  { id: "chocolate", name: "チョコレート" },
  { id: "cocoa", name: "ココア" },
  { id: "matcha", name: "抹茶" },
  { id: "strawberry", name: "ストロベリー" },
];

// 保存キー
const STORAGE_KEY = "cakecanvas-design-v2";
const OLD_STORAGE_KEY = "cakecanvas-design-v1";

// 保存データ
type SavedDesign = {
  version: 2;
  design: CakeDesign;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isHexColor(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(value)
  );
}

function isDecorationType(
  value: unknown
): value is DecorationType {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      DECORATION_CATALOG,
      value
    )
  );
}

// メッセージの入力チェック
const allowedMessage =
  /^[A-Za-z0-9０-９Ａ-Ｚａ-ｚぁ-ゖァ-ヶ一-龯々〆〤ー 　。、！？!?・（）()「」『』.,-]+$/u;

function validateMessage(
  value: string
): string | null {
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

// 保存データの検証
function isValidDesign(
  value: unknown
): value is CakeDesign {
  if (!isRecord(value)) return false;

  if (
    !isHexColor(value.spongeColor) ||
    !isHexColor(value.creamColor)
  ) {
    return false;
  }

  if (
    typeof value.hasMessagePlate !== "boolean" ||
    typeof value.message !== "string"
  ) {
    return false;
  }

  if (
    Array.from(value.message).length > 20 ||
    (value.message !== "" &&
      !allowedMessage.test(value.message))
  ) {
    return false;
  }

  if (
    value.hasMessagePlate &&
    validateMessage(value.message) !== null
  ) {
    return false;
  }

  const decorations = value.decorations;

  if (
    !Array.isArray(decorations) ||
    decorations.length > MAX_DECORATIONS
  ) {
    return false;
  }

  const ids = new Set<string>();

  return decorations.every((item: unknown) => {
    if (!isRecord(item)) return false;

    if (
      typeof item.id !== "string" ||
      item.id.length === 0 ||
      !isDecorationType(item.type) ||
      typeof item.x !== "number" ||
      typeof item.y !== "number" ||
      !Number.isFinite(item.x) ||
      !Number.isFinite(item.y)
    ) {
      return false;
    }

    if (ids.has(item.id)) return false;

    ids.add(item.id);
    return true;
  });
}

// 旧バージョンの保存データを読み込む
function migrateOldDesign(
  value: unknown
): CakeDesign | null {
  if (!isRecord(value) || value.version !== 1) {
    return null;
  }

  const old = value.design;

  if (!isRecord(old)) return null;

  const count = old.strawberryCount;
  const positions = old.strawberryPositions;

  if (
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > 3 ||
    !Array.isArray(positions) ||
    positions.length !== 3
  ) {
    return null;
  }

  const decorations: Decoration[] = [];

  for (let i = 0; i < count; i++) {
    const position: unknown = positions[i];

    if (
      !isRecord(position) ||
      typeof position.x !== "number" ||
      typeof position.y !== "number" ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y)
    ) {
      return null;
    }

    decorations.push({
      id: `legacy-strawberry-${i + 1}`,
      type: "strawberry",
      x: position.x,
      y: position.y,
    });
  }

  const design = {
    spongeColor: old.spongeColor,
    creamColor: old.creamColor,
    decorations,
    hasMessagePlate: old.hasMessagePlate,
    message: old.message,
  };

  return isValidDesign(design) ? design : null;
}

function formatPrice(price: number) {
  return price.toLocaleString("ja-JP") + "円";
}

// SVG上面図
function CakePreview({
  editable,
  selectedId,
  onSelect,
}: {
  editable: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const spongeColor = useCakeStore(
    (state) => state.spongeColor
  );

  const creamColor = useCakeStore(
    (state) => state.creamColor
  );

  const decorations = useCakeStore(
    (state) => state.decorations
  );

  const moveDecoration = useCakeStore(
    (state) => state.moveDecoration
  );

  const draggingId = useRef<string | null>(null);

  function handlePointerMove(
    event: PointerEvent<SVGSVGElement>
  ) {
    if (!editable) return;

    const id = draggingId.current;
    if (!id) return;

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width) *
      240;

    const y =
      ((event.clientY - rect.top) / rect.height) *
      240;

    moveDecoration(id, { x, y });
  }

  return (
    <svg
      viewBox="0 0 240 240"
      className="mx-auto my-6 h-64 w-64 touch-none select-none"
      role="img"
      aria-label="ケーキの上面図"
      onPointerMove={handlePointerMove}
      onPointerUp={() => {
        draggingId.current = null;
      }}
      onPointerCancel={() => {
        draggingId.current = null;
      }}
      onLostPointerCapture={() => {
        draggingId.current = null;
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

      {/* 飾り */}
      {decorations.map((decoration, index) => (
        <g
          key={decoration.id}
          className={
            editable ? "cursor-grab" : ""
          }
          onPointerDown={(event) => {
            if (!editable) return;

            event.preventDefault();

            draggingId.current = decoration.id;
            onSelect(decoration.id);

            event.currentTarget.ownerSVGElement?.setPointerCapture(
              event.pointerId
            );
          }}
        >
          <circle
            cx={decoration.x}
            cy={decoration.y}
            r="14"
            fill="#DC4349"
            stroke={
              editable &&
              selectedId === decoration.id
                ? "#EAB308"
                : "#A92D35"
            }
            strokeWidth={
              editable &&
              selectedId === decoration.id
                ? 4
                : 2
            }
          />

          <text
            x={decoration.x}
            y={decoration.y + 4}
            textAnchor="middle"
            fill="white"
            fontSize="12"
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

// カスタマイズ画面
export default function CustomizePage() {
  // 現在のステップ
  const [step, setStep] = useState(0);

  // SVGまたは3D
  const [viewMode, setViewMode] = useState<
    "svg" | "3d"
  >("svg");

  // 3D表示用のケーキ種類
  const [cakeType, setCakeType] =
    useState<CakeType>("vanilla");

  // 選択中の飾り
  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  // Zustandのデータ
  const spongeColor = useCakeStore(
    (state) => state.spongeColor
  );

  const creamColor = useCakeStore(
    (state) => state.creamColor
  );

  const decorations = useCakeStore(
    (state) => state.decorations
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

  const addDecoration = useCakeStore(
    (state) => state.addDecoration
  );

  const removeDecoration = useCakeStore(
    (state) => state.removeDecoration
  );

  const moveDecoration = useCakeStore(
    (state) => state.moveDecoration
  );

  const setHasMessagePlate = useCakeStore(
    (state) => state.setHasMessagePlate
  );

  const setMessage = useCakeStore(
    (state) => state.setMessage
  );

  const restoreDesign = useCakeStore(
    (state) => state.restoreDesign
  );

  // 料金計算
  const decorationTotal = decorations.reduce(
    (total, decoration) =>
      total +
      DECORATION_CATALOG[decoration.type].price,
    0
  );

  const messageTotal =
    hasMessagePlate ? MESSAGE_PRICE : 0;

  const totalPrice =
    CAKE_PRICE +
    decorationTotal +
    messageTotal;

  const messageError = hasMessagePlate
    ? validateMessage(message)
    : null;

  const decorationCount = decorations.length;

  const selectedDecoration = decorations.find(
    (decoration) => decoration.id === selectedId
  );

  // 画面を進める
  function nextStep() {
    if (step === 2 && messageError) return;

    setStep((current) =>
      Math.min(3, current + 1)
    );
  }

  // 画面を戻す
  function previousStep() {
    setStep((current) =>
      Math.max(0, current - 1)
    );
  }

  // 苺の追加
  function addStrawberry() {
    addDecoration("strawberry");
  }

  // 飾りの削除
  function removeSelectedDecoration() {
    const target =
      selectedDecoration ??
      decorations[decorations.length - 1];

    if (!target) return;

    removeDecoration(target.id);
    setSelectedId(null);
  }

  // 飾りを右へ移動
  function moveSelectedRight() {
    const target =
      selectedDecoration ?? decorations[0];

    if (!target) return;

    moveDecoration(target.id, {
      x: target.x + 10,
      y: target.y,
    });
  }

  // デザインを保存
  function saveDesign() {
    if (messageError) {
      alert(messageError);
      return;
    }

    const design: CakeDesign = {
      spongeColor,
      creamColor,

      decorations: decorations.map(
        (decoration) => ({ ...decoration })
      ),

      hasMessagePlate,
      message: hasMessagePlate ? message : "",
    };

    const savedData: SavedDesign = {
      version: 2,
      design,
    };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(savedData)
      );

      alert("デザインを保存しました！");
    } catch {
      alert("保存できませんでした");
    }
  }

  // デザインを読み込み
  function loadDesign() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      let design: CakeDesign | null = null;

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (
          isRecord(parsed) &&
          parsed.version === 2 &&
          isValidDesign(parsed.design)
        ) {
          design = parsed.design;
        } else {
          throw new Error("保存データが不正です");
        }
      } else {
        const oldSaved = localStorage.getItem(
          OLD_STORAGE_KEY
        );

        if (oldSaved) {
          const parsed: unknown =
            JSON.parse(oldSaved);

          design = migrateOldDesign(parsed);
        }
      }

      if (!design) {
        alert("保存データがありません");
        return;
      }

      restoreDesign(design);
      setSelectedId(null);

      alert("デザインを読み込みました！");
    } catch {
      alert("読み込みに失敗しました");
    }
  }

  // SVG表示
  function preview(editable: boolean) {
    return (
      <CakePreview
        editable={editable}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    );
  }

  return (
    <main className="min-h-screen bg-rose-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl">
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-rose-700">
          CakeCanvas
        </h1>

        <p className="mt-2 text-slate-600">
          ケーキを、あなたらしく。
        </p>

        {/* 保存・復元 */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveDesign}
            className="rounded bg-green-700 px-5 py-3 text-white"
          >
            デザインを保存
          </button>

          <button
            type="button"
            onClick={loadDesign}
            className="rounded bg-blue-700 px-5 py-3 text-white"
          >
            保存デザインを読み込む
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          ※現在はブラウザ内への保存です。
          DBへの保存は未実装です。
        </p>

        {/* ステップ表示 */}
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

        {/* STEP 1 色選択 */}
        {step === 0 && (
          <section className="mt-8 rounded-xl bg-white p-6">
            <h2 className="text-2xl font-bold">
              ① ケーキの色選択
            </h2>

            <p className="mt-2 text-slate-600">
              スポンジとクリームの色を選んでください。
            </p>

            {preview(false)}

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

        {/* STEP 2 飾り付け */}
        {step === 1 && (
          <section className="mt-8 rounded-xl bg-white p-6">
            <h2 className="text-2xl font-bold">
              ② ケーキの飾り付け
            </h2>

            <p className="mt-2 text-slate-600">
              SVG上面図で飾りを配置できます。
              3Dではケーキの土台を確認できます。
            </p>

            {/* SVG / 3D切り替え */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode("svg")}
                aria-pressed={viewMode === "svg"}
                className={`rounded-lg border px-6 py-3 ${
                  viewMode === "svg"
                    ? "border-rose-700 bg-rose-600 text-white"
                    : "border-rose-200 bg-white"
                }`}
              >
                SVG上面図
              </button>

              <button
                type="button"
                onClick={() => setViewMode("3d")}
                aria-pressed={viewMode === "3d"}
                className={`rounded-lg border px-6 py-3 ${
                  viewMode === "3d"
                    ? "border-rose-700 bg-rose-600 text-white"
                    : "border-rose-200 bg-white"
                }`}
              >
                3Dプレビュー
              </button>
            </div>

            {/* SVG表示 */}
            {viewMode === "svg" && (
              <div className="mt-6 rounded-xl bg-rose-50 p-4">
                <h3 className="text-center font-bold">
                  SVG上面図
                </h3>

                {preview(true)}

                <p className="text-center text-sm text-slate-600">
                  飾りをドラッグして移動できます。
                </p>
              </div>
            )}

            {/* 3D表示 */}
            {viewMode === "3d" && (
              <div className="mt-6">
                <h3 className="text-center font-bold">
                  3Dケーキプレビュー
                </h3>

                {/* 5種類のモデル選択 */}
                <div className="my-5 flex flex-wrap justify-center gap-2">
                  {cakeModels.map((cake) => (
                    <button
                      key={cake.id}
                      type="button"
                      onClick={() =>
                        setCakeType(cake.id)
                      }
                      aria-pressed={
                        cakeType === cake.id
                      }
                      className={`rounded-lg border px-4 py-2 ${
                        cakeType === cake.id
                          ? "border-rose-700 bg-rose-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {cake.name}
                    </button>
                  ))}
                </div>

                <Cake3DViewer type={cakeType} />

                <p className="mt-4 text-center text-sm text-slate-600">
                  ドラッグで回転、ホイールで拡大・縮小できます。
                </p>

                <p className="mt-2 text-center text-sm text-amber-700">
                  ※3Dは土台モデルの表示検証です。
                  SVGで選択した色や苺の位置は、
                  まだ3Dには反映されません。
                </p>

                <p className="mt-2 text-center text-xs text-slate-500">
                  3Dモデルの種類は現在の保存対象外です。
                </p>
              </div>
            )}

            {/* 飾りの操作 */}
            <h3 className="mt-8 text-center text-xl font-bold">
              飾りの管理
            </h3>

            <p className="mt-3 text-center">
              飾りの数：
              {decorationCount}/{MAX_DECORATIONS}個
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={removeSelectedDecoration}
                disabled={decorationCount === 0}
                className="rounded border border-slate-300 px-5 py-2 disabled:opacity-40"
              >
                選択した飾りを削除
              </button>

              <button
                type="button"
                onClick={addStrawberry}
                disabled={
                  decorationCount >= MAX_DECORATIONS
                }
                className="rounded bg-rose-600 px-5 py-2 text-white disabled:opacity-40"
              >
                苺を追加（200円）
              </button>
            </div>

            <button
              type="button"
              onClick={moveSelectedRight}
              disabled={decorationCount === 0}
              className="mx-auto mt-4 block rounded bg-rose-700 px-5 py-2 text-white disabled:opacity-40"
            >
              選択した飾りを右へ移動
            </button>

            <p className="mt-3 text-center text-sm text-slate-500">
              SVG上面図で飾りを選択できます。
              未選択の場合、削除は最後の飾り、
              移動は最初の飾りが対象です。
            </p>

            {/* 座標一覧 */}
            <h3 className="mt-8 text-center text-xl font-bold">
              飾りの座標一覧
            </h3>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-rose-100">
                    <th className="border p-2">番号</th>
                    <th className="border p-2">種類</th>
                    <th className="border p-2">X</th>
                    <th className="border p-2">Y</th>
                  </tr>
                </thead>

                <tbody>
                  {decorations.map(
                    (decoration, index) => (
                      <tr
                        key={decoration.id}
                        className={
                          selectedId === decoration.id
                            ? "bg-amber-50"
                            : ""
                        }
                      >
                        <td className="border p-2">
                          {index + 1}
                        </td>

                        <td className="border p-2">
                          {
                            DECORATION_CATALOG[
                              decoration.type
                            ].name
                          }
                        </td>

                        <td className="border p-2">
                          {decoration.x}
                        </td>

                        <td className="border p-2">
                          {decoration.y}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {decorationCount === 0 && (
              <p className="mt-3 text-center text-slate-500">
                飾りを追加すると座標が表示されます。
              </p>
            )}

            <p className="mt-6 text-center font-bold">
              飾りの小計：
              {formatPrice(decorationTotal)}
            </p>
          </section>
        )}

        {/* STEP 3 メッセージ */}
        {step === 2 && (
          <section className="mt-8 rounded-xl bg-white p-6">
            <h2 className="text-2xl font-bold">
              ③ メッセージプレート
            </h2>

            <p className="mt-2 text-slate-600">
              プレートを追加する場合は
              メッセージを入力してください。
            </p>

            <label className="mt-6 flex items-center gap-3">
              <input
                type="checkbox"
                checked={hasMessagePlate}
                onChange={(event) =>
                  setHasMessagePlate(
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />
              メッセージプレートを追加する
              （300円）
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
                  aria-invalid={
                    Boolean(messageError)
                  }
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
              </div>
            )}

            {!hasMessagePlate && (
              <p className="mt-6 text-slate-600">
                プレートなしで次へ進めます。
              </p>
            )}
          </section>
        )}

        {/* STEP 4 見積・確認 */}
        {step === 3 && (
          <section className="mt-8 rounded-xl bg-white p-6">
            <h2 className="text-2xl font-bold">
              ④ 見積・確認
            </h2>

            <p className="mt-2 text-slate-600">
              カスタマイズした内容を確認してください。
            </p>

            {preview(false)}

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
                苺：
                <strong>
                  {
                    decorations.filter(
                      (d) => d.type === "strawberry"
                    ).length
                  }
                  個
                </strong>
              </p>

              <p>
                メッセージ：
                <strong>
                  {hasMessagePlate ? message : "なし"}
                </strong>
              </p>
            </div>

            {/* 価格 */}
            <h3 className="mt-8 text-xl font-bold">
              お見積もり
            </h3>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span>5号ケーキ</span>
                <span>
                  {formatPrice(CAKE_PRICE)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>色指定</span>
                <span>0円</span>
              </div>

              <div className="flex justify-between">
                <span>
                  飾り（{decorationCount}個）
                </span>
                <span>
                  {formatPrice(decorationTotal)}
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
              ※開発用の仮価格です。
              注文や決済はまだ行われません。
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
                step === 2 &&
                Boolean(messageError)
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
