import { describe, expect, it } from "vitest";
import { cakeScale, editorToMm, getCakeSpec, mmToEditor, parseCakeSize } from "./cake-sizes";

describe("ケーキのサイズ", () => {
  it("5号は15cm・2500円、6号は18cm・3000円", () => {
    expect(getCakeSpec(5)).toMatchObject({ diameterMm: 150, basePrice: 2500, partId: "base" });
    expect(getCakeSpec(6)).toMatchObject({ diameterMm: 180, basePrice: 3000, partId: "base-6" });
    expect(cakeScale(6)).toBe(1.2);
  });

  it("サイズの指定がないときは5号とし、対応していないサイズは受け付けない", () => {
    expect(parseCakeSize(undefined)).toBe(5);
    for (const size of [null, "6", 4, 7, NaN]) {
      expect(() => parseCakeSize(size)).toThrow();
    }
  });

  it("上面図の座標と実際の寸法（mm）を行き来できる", () => {
    expect(editorToMm(171, 5)).toBe(75);
    expect(editorToMm(171, 6)).toBe(90);
    for (const size of [5, 6] as const) {
      expect(editorToMm(mmToEditor(35, size), size)).toBeCloseTo(35);
      expect(editorToMm(mmToEditor(-45, size), size)).toBeCloseTo(-45);
    }
  });
});