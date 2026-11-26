import { TOPPINGS, isToppingKind, isCream, isEdible, isTintable, type ToppingKind } from "./toppings";
import { DEFAULT_BORDER, isBorderStyle, type BorderStyle } from "./borders";
import { FILLINGS, FILLING_KINDS, isFillingKind, type FillingKind } from "./fillings";
import { DEFAULT_PLATE_LAYOUT, constrainPlate, parsePlateLayout, type PlateLayout } from "./plate";
import { PHOTO_PLATE_PRICE, parsePhotoPlate, parsePhotoPlates, getPhotoPlates, constrainPhoto, type PhotoPlate } from "./photo-plate";
import { cakeScale, getCakeSpec, parseCakeSize, type CakeSize } from "./cake-sizes";
export type Decoration = { id: number; kind: ToppingKind; x: number; y: number; color: string; rotation: number };
export const MAX_FRUIT = 20;
export const MAX_CELEBRATION = 10;
// 5号ケーキ本体の単価（税抜）。料金計算・商品マスタの初期値・旧プロトタイプの表示で共用する。
export const BASE_PRICE = getCakeSpec(5).basePrice;
export const FRUIT_PRICE = 150; // prototype用の仮単価
export const MAX_CREAM = 32;
export type Design = {
  size?: CakeSize;
  cream: string;
  sponge: string;
  items: Decoration[];
  plate: boolean;
  message: string;
  fillings: FillingKind[];
  border: BorderStyle;
  // ナッペ（全体をクリームの色で塗る）とプレートの置き方・位置。
  nappe: boolean;
  plateLayout: PlateLayout;
  photoPlate?: PhotoPlate | null;
  // 複数写真を追加する前のphotoPlateも引き続き読み込む。
  photoPlates?: PhotoPlate[];
};
export const emptyDesign = (): Design => ({ size: 5, cream: "#FFFFFF", sponge: "#E8C795", items: [], plate: false, message: "Happy Birthday", fillings: [], border: DEFAULT_BORDER, nappe: false, plateLayout: { ...DEFAULT_PLATE_LAYOUT }, photoPlate: null });
export function messageError(design: Design) {
  if (!design.plate) return "";
  if (!design.message.trim() || [...design.message].length > 20 || !/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}a-zA-Z0-9ー々、。！？!? ・'"\-]+$/u.test(design.message)) {
    return "1〜20文字の日本語・英数字・基本的な句読点で入力してください。";
  }
  return "";
}

// 保存ファイルやlocalStorageも未検証の入力として扱う。
export function parseDesign(value: unknown): Design {
  if (!value || typeof value !== "object") throw new Error("デザインの形式が正しくありません。");
  const d = value as Record<string, unknown>;
  const size = parseCakeSize(d.size);
  const color = (c: unknown): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
  if (!color(d.cream) || !color(d.sponge) || typeof d.plate !== "boolean" || typeof d.message !== "string" || d.message.length > 80 || !Array.isArray(d.items) || d.items.length > MAX_FRUIT + MAX_CREAM + MAX_CELEBRATION) throw new Error("デザインの形式が正しくありません。");
  const ids = new Set<number>();
  const items: Decoration[] = d.items.map((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new Error("飾りの形式が正しくありません。");
    const p = raw as Record<string, unknown>;
    if (typeof p.id !== "number" || !Number.isSafeInteger(p.id) || p.id < 1 || ids.has(p.id) || !isToppingKind(p.kind) || !color(p.color) || typeof p.x !== "number" || !Number.isFinite(p.x) || typeof p.y !== "number" || !Number.isFinite(p.y) || Math.hypot(p.x, p.y) > 145.001 || typeof p.rotation !== "number" || !Number.isFinite(p.rotation) || p.rotation < 0 || p.rotation > 360) throw new Error("飾りの位置・色・番号が正しくありません。");
    ids.add(p.id);
    return { id: p.id, kind: p.kind as Decoration["kind"], x: p.x, y: p.y, color: p.color.toUpperCase(), rotation: p.rotation };
  });
  if (items.filter(p => isEdible(p.kind) && !isCream(p.kind)).length > MAX_FRUIT || items.filter(p => !isEdible(p.kind)).length > MAX_CELEBRATION || items.filter(p => isCream(p.kind)).length > MAX_CREAM) throw new Error("飾りの上限を超えています。");
  // フィリング追加前の保存データにはfillingsがないため、未指定は「なし」として読む。
  const rawFillings = d.fillings ?? [];
  if (!Array.isArray(rawFillings) || !rawFillings.every(isFillingKind) || new Set(rawFillings).size !== rawFillings.length) throw new Error("中のフルーツの指定が正しくありません。");
  const fillings = FILLING_KINDS.filter(kind => rawFillings.includes(kind));
  // 外周デコ追加前の保存データは、当時表示していたborder1として読む。
  const border = d.border ?? DEFAULT_BORDER;
  if (!isBorderStyle(border)) throw new Error("外周デコの指定が正しくありません。");
  // ナッペ・プレートの置き方を追加する前の保存データは、当時の見た目（ナッペなし・中央に寝かせる）として読む。
  const nappe = d.nappe ?? false;
  if (typeof nappe !== "boolean") throw new Error("ナッペの指定が正しくありません。");
  const plateLayout = parsePlateLayout(d.plateLayout, size);
  const photoPlate = d.photoPlates !== undefined ? null : parsePhotoPlate(d.photoPlate);
  const photoPlates = d.photoPlates !== undefined ? parsePhotoPlates(d.photoPlates, size) : undefined;
  return { size, cream: d.cream.toUpperCase(), sponge: d.sponge.toUpperCase(), plate: d.plate, message: d.message, items, fillings, border, nappe, plateLayout, photoPlate, ...(photoPlates !== undefined ? { photoPlates } : {}) };
}
export function constrainPoint(x: number, y: number, kind?: ToppingKind, size: CakeSize = 5) {
  const radius = Math.hypot(x, y);
  const limit = kind ? Math.min(145, 171 - TOPPINGS[kind].radius / cakeScale(size)) : 145;
  const ratio = radius > limit ? limit / radius : 1;
  return { x: x * ratio, y: y * ratio };
}
// サイズ変更では配色・写真・飾りを残し、小さくしたときのはみ出しだけを収める。
export function changeCakeSize(design: Design, size: CakeSize): Design {
  return { ...design, size, items: design.items.map(item => ({ ...item, ...constrainPoint(item.x, item.y, item.kind, size) })), plateLayout: constrainPlate(design.plateLayout, size), ...(design.photoPlates !== undefined ? { photoPlate: null, photoPlates: getPhotoPlates(design).map(photo => constrainPhoto(photo, size)) } : design.photoPlate ? { photoPlate: constrainPhoto(design.photoPlate, size) } : {}) };
}
export function quote(items: Decoration[], plate: boolean, fillings: readonly FillingKind[] = [], photoPlate?: PhotoPlate | readonly PhotoPlate[] | null, size: CakeSize = 5) {
  const fruit = items.filter((item) => !isCream(item.kind)).reduce((sum, item) => sum + TOPPINGS[item.kind].price, 0);
  const creams = items.filter((item) => isTintable(item.kind));
  const decoration = items.filter(item => isCream(item.kind)).reduce((sum, item) => sum + TOPPINGS[item.kind].price, 0);
  const colors = new Set(creams.map((item) => item.color.toUpperCase()).filter((color) => color !== "#FFFFFF")).size * 50;
  const message = plate ? 300 : 0;
  const filling = fillings.reduce((sum, kind) => sum + FILLINGS[kind].price, 0);
  const photo = (Array.isArray(photoPlate) ? photoPlate.length : photoPlate ? 1 : 0) * PHOTO_PLATE_PRICE;
  const base: number = getCakeSpec(size).basePrice;
  const subtotal = base + fruit + decoration + colors + message + filling + photo;
  const tax = Math.floor(subtotal * 8 / 100);
  return { base, fruit, decoration, colors, message, filling, photo, subtotal, tax, total: subtotal + tax };
}

