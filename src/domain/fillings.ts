// ケーキ内部（中段のクリーム層）に挟むフルーツ。断面表示・料金・製造指示書で共用する。
export const FILLINGS = {
  strawberry: { label: "苺カット", color: "#D6334F", price: 200 },
  blueberry: { label: "ブルーベリー", color: "#3F4C7A", price: 200 },
  raspberry: { label: "ラズベリー", color: "#C42A55", price: 200 },
} as const;
export type FillingKind = keyof typeof FILLINGS;
export const FILLING_KINDS = Object.keys(FILLINGS) as FillingKind[];
export const isFillingKind = (value: unknown): value is FillingKind => typeof value === "string" && Object.hasOwn(FILLINGS, value);
// DBのpartsでは上面の飾りとIDが衝突しないよう接頭辞を付ける。
export const fillingPartId = (kind: FillingKind) => `filling-${kind}`;
export const fillingFromPartId = (partId: string) => {
  const kind = partId.startsWith("filling-") ? partId.slice(8) : "";
  return isFillingKind(kind) ? kind : null;
};
export const fillingNames = (fillings: readonly FillingKind[]) => fillings.length ? fillings.map(kind => FILLINGS[kind].label).join("・") : "なし";
