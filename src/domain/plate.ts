import type { Design } from "./model";
import { cakeScale, type CakeSize } from "./cake-sizes";

// メッセージプレート（チョコ）の置き方と位置。座標は上面図と同じ（中心が原点・半径171・下が手前）。
export const PLATE_WIDTH = 174;
export const PLATE_DEPTH = 50;
// 「傾けて立てる」ときに上面から起こす角度。正面から文字が読みやすいよう60°にする。
export const PLATE_TILT_DEG = 60;
export const PLATE_STYLES = { flat: "寝かせる", tilted: "傾けて立てる" } as const;
export type PlateStyle = keyof typeof PLATE_STYLES;
export const PLATE_STYLE_KEYS = Object.keys(PLATE_STYLES) as PlateStyle[];
export type PlateLayout = { style: PlateStyle; x: number; y: number; rotation: number };
// 従来の表示位置（中央より少し手前・寝かせる）を既定にする。
export const DEFAULT_PLATE_LAYOUT: PlateLayout = { style: "flat", x: 0, y: 4, rotation: 0 };
// プレートの角がケーキの縁（半径171）から出ないようにする上限。
const EDGE = 165;

// 真上から見たときの奥行き。傾けると、上から見える部分（投影）が短くなる。
export const plateDepthOnTop = (style: PlateStyle) => style === "tilted" ? PLATE_DEPTH * Math.cos(PLATE_TILT_DEG * Math.PI / 180) : PLATE_DEPTH;

// 上から見た長方形の4つの角が、すべてケーキの上に収まっているか。
function cornersInside(layout: PlateLayout, margin = 0, size?: CakeSize) {
  const factor = cakeScale(size);
  const halfW = PLATE_WIDTH / factor / 2, halfD = plateDepthOnTop(layout.style) / factor / 2;
  const edge = 171 - (171 - EDGE) / factor;
  const angle = layout.rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  return [[-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD]].every(([cx, cy]) =>
    Math.hypot(layout.x + cx * cos - cy * sin, layout.y + cx * sin + cy * cos) <= edge + margin);
}

// はみ出す位置なら、収まるところまでプレートを中心の方へ寄せる（二分探索で境目を探す）。
export function constrainPlate(layout: PlateLayout, size?: CakeSize): PlateLayout {
  if (cornersInside(layout, 0, size)) return layout;
  let inside = 0, outside = 1;
  for (let i = 0; i < 24; i++) {
    const t = (inside + outside) / 2;
    if (cornersInside({ ...layout, x: layout.x * t, y: layout.y * t }, 0, size)) inside = t; else outside = t;
  }
  return { ...layout, x: layout.x * inside, y: layout.y * inside };
}

export const isPlateStyle = (value: unknown): value is PlateStyle => typeof value === "string" && Object.hasOwn(PLATE_STYLES, value);

// 保存データは未検証の入力として扱う。置き方を追加する前のデータには指定がないため、既定の位置として読む。
export function parsePlateLayout(value: unknown, size?: CakeSize): PlateLayout {
  if (value === undefined) return { ...DEFAULT_PLATE_LAYOUT };
  const p = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  if (!isPlateStyle(p.style) || !finite(p.x) || !finite(p.y) || !finite(p.rotation) || p.rotation < 0 || p.rotation > 360) throw new Error("プレートの置き方・位置が正しくありません。");
  const layout = { style: p.style, x: p.x, y: p.y, rotation: p.rotation };
  // DBの単位変換で生じるわずかな誤差は許す。
  if (!cornersInside(layout, 0.5, size)) throw new Error("プレートがケーキからはみ出しています。");
  return layout;
}

export const plateSummary = (design: Design) => design.plate ? `${design.message}（${PLATE_STYLES[design.plateLayout.style]}）` : "なし";
