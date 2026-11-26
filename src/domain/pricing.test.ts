import { describe, expect, it } from "vitest";
import { NAPPE_PART_ID, borderPartId } from "./borders";
import { fillingPartId } from "./fillings";
import { emptyDesign, quote, type Decoration, type Design } from "./model";
import { PHOTO_PLATE_PART_ID, type PhotoPlate } from "./photo-plate";
import { type ToppingKind } from "./toppings";
import { defaultUnitPrices, quoteDesign } from "./pricing";

const item = (id: number, kind: ToppingKind, color = "#FFFFFF"): Decoration => ({ id, kind, color, x: 0, y: 0, rotation: 0 });
const photo = (id: string): PhotoPlate => ({ id, image: "data:image/png;base64,aGVsbG8=", zoom: 1, offsetX: 0, offsetY: 0 });

describe("デザインの料金を店舗単価で計算する", () => {
  it("既定単価は従来の料金を保ち、外周デコとナッペも内訳に持つ", () => {
    const design: Design = { ...emptyDesign(), size: 6, plate: true, nappe: true, border: "border3", fillings: ["strawberry", "blueberry"], photoPlates: [photo("a"), photo("b")], items: [item(1, "strawberry"), item(2, "strawberry"), item(3, "candle"), item(4, "piping1", "#FFAABB"), item(5, "piping1", "#ffaabb"), item(6, "piping2", "#FFAABB"), item(7, "cream"), item(8, "chocolateCream", "#74422B")] };
    const actual = quoteDesign(design);
    expect(actual).toEqual({ base: 3000, fruit: 330, decoration: 110, colors: 50, message: 300, photo: 1000, filling: 400, border: 0, nappe: 0, subtotal: 5190, tax: 415, total: 5605 });
    expect(actual).toMatchObject(quote(design.items, design.plate, design.fillings, design.photoPlates, design.size));
  });

  it("店舗で設定した0円を残し、未指定の単価だけ既定値で補う", () => {
    const design: Design = { ...emptyDesign(), plate: true, nappe: true, fillings: ["strawberry"], photoPlates: [photo("a")], items: [item(1, "strawberry"), item(2, "piping1", "#FFAABB")] };
    const prices = { base: 0, strawberry: 0, piping1: 0, color: 0, plate: 0, [PHOTO_PLATE_PART_ID]: 0, [fillingPartId("strawberry")]: 0, [borderPartId("border1")]: 0, [NAPPE_PART_ID]: 0 };
    expect(quoteDesign(design, prices)).toMatchObject({ base: 0, fruit: 0, decoration: 0, colors: 0, message: 0, photo: 0, filling: 0, border: 0, nappe: 0, subtotal: 0, tax: 0, total: 0 });
    expect(quoteDesign(design, { strawberry: 0 })).toMatchObject({ base: 2500, fruit: 0, decoration: 20, colors: 50, message: 300, photo: 500, filling: 200 });
  });

  it("色は色変更できる飾りの白以外を重複なく課金し、写真は枚数分を課金する", () => {
    const design: Design = { ...emptyDesign(), items: [item(1, "cream", "#aabbcc"), item(2, "piping1", "#AABBCC"), item(3, "piping2", "#DDEEFF"), item(4, "piping3", "#ffffff"), item(5, "chocolateCream", "#74422B"), item(6, "candle", "#123456")], photoPlates: [photo("a"), photo("b"), photo("c")] };
    expect(quoteDesign(design, { color: 71, [PHOTO_PLATE_PART_ID]: 613 })).toMatchObject({ colors: 142, photo: 1839 });
    expect(quoteDesign({ ...design, photoPlate: photo("legacy"), photoPlates: [] }).photo).toBe(0);
    expect(quoteDesign({ ...emptyDesign(), photoPlate: photo("legacy") }).photo).toBe(500);
  });

  it("既定単価を取得・変更しても次の呼び出しを変えない", () => {
    const prices = defaultUnitPrices();
    prices.base = 0;
    expect(defaultUnitPrices().base).toBe(2500);
  });
});
