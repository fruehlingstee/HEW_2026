export const CAKE_SIZES = [5, 6] as const;
export type CakeSize = typeof CAKE_SIZES[number];

const SPECS = {
  5: { label: "5号", diameterMm: 150, diameterCm: 15, radiusMm: 75, basePrice: 2500, people: "4〜6名さま", partId: "base" },
  6: { label: "6号", diameterMm: 180, diameterCm: 18, radiusMm: 90, basePrice: 3000, people: "6〜8名さま", partId: "base-6" },
} as const;

export const isCakeSize = (value: unknown): value is CakeSize => value === 5 || value === 6;
export function parseCakeSize(value: unknown): CakeSize {
  if (value === undefined) return 5;
  if (!isCakeSize(value)) throw new Error("ケーキのサイズは5号か6号を選んでください。");
  return value;
}
export const getCakeSpec = (size: CakeSize = 5) => SPECS[size];

// 上面図は常に半径171で表し、製造時の寸法へサイズ別に換算する。
export const cakeScale = (size: CakeSize = 5) => getCakeSpec(size).diameterMm / 150;
export const editorToMm = (value: number, size: CakeSize = 5) => value * getCakeSpec(size).radiusMm / 171;
export const mmToEditor = (value: number, size: CakeSize = 5) => value * 171 / getCakeSpec(size).radiusMm;
