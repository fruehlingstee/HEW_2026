
"use client";

import { useRef, useState, type PointerEvent } from "react";

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

// 購入フロー
const steps = [
  "色選択",
  "飾り付け",
  "メッセージ",
  "見積・確認",
];

// スポンジの色
const spongeColors = [
  { name: "プレーン", value: "#F5D6A0" },
  { name: "ピンク", value: "#FFB6C1" },
  { name: "ブラウン", value: "#8B4513" },
];

// クリームの色
const creamColors = [
  { name: "ホワイト", value: "#FFFFFF" },
  { name: "ピンク", value: "#FFB6C1" },
  { name: "ブラウン", value: "#8B4513" },
];

// 保存キー
const STORAGE_KEY = "cakecanvas-design-v2";
const OLD_STORAGE_KEY = "cakecanvas-design-v1";

// 保存形式
type SavedDesign = {
  version: 2;
  design: CakeDesign;
};

// 汎用オブジェクト判定
function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// 色コードの判定
function isHexColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(value)
  );
}

// 飾りの種類を確認
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

// メッセージに使える文字
const allowedMessage =
  /^[A-Za-z0-9０-９Ａ-Ｚａ-ｚぁ-ゖァ-ヶ一-龯々〆〤ー 　。、！？!?・（）()「」『』.,-]+$/u;

// メッセージを検証
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

// デザインデータの検証
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

  if (Array.from(value.message).length > 20) {
    return false;
  }

  if (
    value.message !== "" &&
    !allowedMessage.test(value.message)
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

// 以前の保存形式から移行する
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

// 金額を表示
function formatPrice(price: number) {
  return price.toLocaleString("ja-JP") + "円";
}

// ケーキの俯瞰SVG
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

  // ドラッグ中の飾りID
  const draggingId = useRef<string | null>(null);

  function handlePointerMove(
    event: PointerEvent<SVGSVGElement>
  ) {
    if (!editable) return;

    const id = draggingId.current;
    if (id === null) return;

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

      {/* 飾りを描画 */}
      {decorations.map((decoration, index) => (
        <g
          key={decoration.id}
          className={editable ? "cursor-grab" : ""}
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
              selectedId === decoration.id && editable
                ? "#EAB308"
                : "#A92D35"
            }
            strokeWidth={
              selectedId === decoration.id && editable
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

export default function CustomizePage() {
  // 現在の画面
  const [step, setStep] = useState(0);

  // 選択中の飾り
  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  // Zustandの状態
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

  // 飾りの料金
  const decorationTotal = decorations.reduce(
    (total, decoration) =>
      total +
      DECORATION_CATALOG[decoration.type].price,
    0
  );

  // メッセージ料金
  const messageTotal =
    hasMessagePlate ? MESSAGE_PRICE : 0;

  // 合計金額
  const totalPrice =
    CAKE_PRICE +
    decorationTotal +
    messageTotal;

  const messageError = hasMessagePlate
    ? validateMessage(message)
    : null;

  // 飾りの数
  const decorationCount = decorations.length;

  // 選択中の飾り
  const selectedDecoration = decorations.find(
    (decoration) => decoration.id === selectedId
  );

  // 次へ
  function nextStep() {
    if (step === 2 && messageError) return;

    setStep((current) =>
      Math.min(steps.length - 1, current + 1)
    );
  }

  // 戻る
  function previousStep() {
    setStep((current) =>
      Math.max(0, current - 1)
    );
  }

  // 苺を追加
  function addStrawberry() {
    addDecoration("strawberry");
  }

  // 選択中の飾りを削除
  function removeSelectedDecoration() {
    const target =
      selectedDecoration ??
      decorations[decorations.length - 1];

    if (!target) return;

    removeDecoration(target.id);
    setSelectedId(null);
  }

  // 選択中の飾りを右へ移動
  function moveSelectedRight() {
    const target =
      selectedDecoration ?? decorations[0];

    if (!target) return;

    moveDecoration(target.id, {
      x: target.x + 10,
      y: target.y,
    });
  }

  // デザイン全体を保存
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

      alert("デザイン全体を保存しました！");
    } catch {
      alert("デザインを保存できませんでした");
    }
  }

  // 保存したデザインを読み込み
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
        // 以前の形式からも読み込み可能
        const oldSaved =
          localStorage.getItem(OLD_STORAGE_KEY);

        if (oldSaved) {
          const parsed: unknown =
            JSON.parse(oldSaved);

          design = migrateOldDesign(parsed);
        }
      }

      if (!design) {
        alert("読み込めるデザインがありません");
        return;
      }

      restoreDesign(design);
      setSelectedId(null);

      alert("デザインを読み込みました！");
    } catch {
      alert("デザインを読み込めませんでした");
    }
  }

  // 共通のケーキプレビュー
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
      <div className="mx-auto max-w-3xl">
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-rose-700">
          CakeCanvas
        </h1>

        <p className="mt-2 text-slate-600">
          ケーキを、あなたらしく。
        </p>

        {/* 保存と読み込み */}
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
          ※ブラウザ内での保存です。
          DBへの保存はまだ行いません。
        </p>

        {/* 進捗 */}
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
              ② 飾り付け
            </h2>

            <p className="mt-2 text-slate-600">
              苺を追加して、ドラッグで配置してください。
            </p>

            {preview(true)}

            <p className="text-center font-bold">
              飾りの数：
              {decorationCount}/{MAX_DECORATIONS}個
            </p>

            {/* 飾りを追加・削除 */}
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

            <p className="mt-3 text-center text-sm text-slate-500">
              削除したい飾りをクリックして選択できます。
              未選択の場合は最後の飾りを削除します。
            </p>

            {/* 座標の移動 */}
            <button
              type="button"
              onClick={moveSelectedRight}
              disabled={decorationCount === 0}
              className="mx-auto mt-4 block rounded bg-rose-700 px-5 py-2 text-white disabled:opacity-40"
            >
              選択した飾りを右へ移動
            </button>

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

            <p className="mt-3 text-center text-sm text-slate-500">
              ※現時点で追加できる飾りは苺のみです。
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

                <p className="mt-3 text-sm text-slate-500">
                  改行・絵文字・機種依存文字は
                  使用できません。
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

        {/* STEP 4 見積・確認 */}
        {step === 3 && (
          <section className="mt-8 rounded-xl bg-white p-6">
            <h2 className="text-2xl font-bold">
              ④ 見積・確認
            </h2>

            <p className="mt-2 text-slate-600">
              カスタマイズ内容を確認してください。
            </p>

            {preview(false)}

            {/* 選択内容 */}
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
                  {hasMessagePlate
                    ? message
                    : "なし"}
                </strong>
              </p>
            </div>

            {/* 見積もり */}
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

              <hr className="border-slate-200" />

              <div className="flex justify-between text-xl font-bold">
                <span>合計（税抜）</span>

                <span className="text-rose-700">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              ※開発用の仮価格です。
              注文・決済はまだ行われません。
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
