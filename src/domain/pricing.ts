import { BORDER_KINDS, NAPPE_PART_ID, borderPartId } from "./borders";
import { CAKE_SIZES, getCakeSpec } from "./cake-sizes";
import { FILLINGS, FILLING_KINDS, fillingPartId } from "./fillings";
import type { Design } from "./model";
import { PHOTO_PLATE_PART_ID, PHOTO_PLATE_PRICE, getPhotoPlates } from "./photo-plate";
import { TOPPINGS, TOPPING_KINDS, isCream, isTintable } from "./toppings";

export type UnitPrices = Record<string, number>;

// 商品IDを共通にし、店舗単価のないローカル体験では既定の仮単価を使う。
export function defaultUnitPrices(): UnitPrices {
  return {
    ...Object.fromEntries(CAKE_SIZES.map(size => { const cake = getCakeSpec(size); return [cake.partId, cake.basePrice]; })),
    ...Object.fromEntries(TOPPING_KINDS.map(kind => [kind, TOPPINGS[kind].price])),
    ...Object.fromEntries(FILLING_KINDS.map(kind => [fillingPartId(kind), FILLINGS[kind].price])),
    ...Object.fromEntries(BORDER_KINDS.map(kind => [borderPartId(kind), 0])),
    [NAPPE_PART_ID]: 0,
    [PHOTO_PLATE_PART_ID]: PHOTO_PLATE_PRICE,
    color: 50,
    plate: 300,
  };
}

// 編集・料金差・注文で同じ税抜内訳を使い、消費税は小計に対して一度だけ切り捨てる。
export function quoteDesign(design: Design, unitPrices?: UnitPrices) {
  const defaults = defaultUnitPrices();
  // 0円も店舗が設定した有効な単価なので、論理和ではなくnullishで補完する。
  const unit = (partId: string) => unitPrices?.[partId] ?? defaults[partId];
  const base = unit(getCakeSpec(design.size).partId);
  const fruit = design.items.filter(item => !isCream(item.kind)).reduce((sum, item) => sum + unit(item.kind), 0);
  const decoration = design.items.filter(item => isCream(item.kind)).reduce((sum, item) => sum + unit(item.kind), 0);
  const colorCount = new Set(design.items.filter(item => isTintable(item.kind)).map(item => item.color.toUpperCase()).filter(color => color !== "#FFFFFF")).size;
  const colors = colorCount * unit("color");
  const message = design.plate ? unit("plate") : 0;
  const photo = getPhotoPlates(design).length * unit(PHOTO_PLATE_PART_ID);
  const filling = [...new Set(design.fillings)].reduce((sum, kind) => sum + unit(fillingPartId(kind)), 0);
  const border = design.border === "none" ? 0 : unit(borderPartId(design.border));
  const nappe = design.nappe ? unit(NAPPE_PART_ID) : 0;
  const subtotal = base + fruit + decoration + colors + message + photo + filling + border + nappe;
  const tax = Math.floor(subtotal * 8 / 100);
  return { base, fruit, decoration, colors, message, photo, filling, border, nappe, subtotal, tax, total: subtotal + tax };
}
