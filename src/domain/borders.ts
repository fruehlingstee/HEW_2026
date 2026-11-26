// 外周デコ：ケーキの側面にぐるりと巻くクリームの帯（cream_border_1〜4）。1台につき1つ選ぶ。
// 上に1個ずつ置く絞りクリーム（toppings.tsのpiping）とは別の仕組みで扱う。
// place：実際のケーキで絞る位置。垂れ下がる形（ドレープ・ガーランド）は上の縁、スカートのような形（プリーツ・フリル）はすそ（皿との境目）。
export const BORDERS = {
  border1: { label: "ドレープ", model: "/models/cream/cream_border_1.glb", place: "top" },
  border2: { label: "プリーツ", model: "/models/cream/cream_border_2.glb", place: "base" },
  border3: { label: "ガーランド", model: "/models/cream/cream_border_3.glb", place: "top" },
  border4: { label: "フリル", model: "/models/cream/cream_border_4.glb", place: "base" },
} as const;
export const BORDER_PLACES = { top: "上の縁", base: "すそ" } as const;
export type BorderPlace = keyof typeof BORDER_PLACES;
export type BorderKind = keyof typeof BORDERS;
export type BorderStyle = BorderKind | "none";
export const BORDER_KINDS = Object.keys(BORDERS) as BorderKind[];
export const BORDER_STYLES: BorderStyle[] = ["none", ...BORDER_KINDS];
// これまでの保存データは外周デコ1番で表示していたため、未指定はborder1として読む。
export const DEFAULT_BORDER: BorderStyle = "border1";
export const isBorderStyle = (value: unknown): value is BorderStyle => value === "none" || (typeof value === "string" && Object.hasOwn(BORDERS, value));
export const borderLabel = (style: BorderStyle) => style === "none" ? "なし" : BORDERS[style].label;
// 製造指示書用。どこに絞るかまで書く（例：「ドレープ（上の縁から垂らす）」）。
export const borderInstruction = (style: BorderStyle) => style === "none" ? "なし" : `${BORDERS[style].label}（${BORDERS[style].place === "top" ? "上の縁から垂らす" : "すそに絞る"}）`;
// DBではparts.kind="border_band"の商品として、placementsに1件だけ保存する。
export const borderPartId = (kind: BorderKind) => `border-${kind}`;
export const borderFromPartId = (partId: string): BorderKind | null => {
  const kind = partId.startsWith("border-") ? partId.slice(7) : "";
  return Object.hasOwn(BORDERS, kind) ? kind as BorderKind : null;
};

// ナッペ：ケーキ全体（側面と上面）をクリームで塗る下地。色は外周デコと同じ「クリームの色」を使う。
// DBでは外周デコと同じく、parts.kind="nappe"の商品として配置を1件だけ保存する。
export const NAPPE_PART_ID = "nappe";
export const nappeLabel = (nappe: boolean) => nappe ? "あり（クリームの色で全体を塗る）" : "なし";
