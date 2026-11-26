import { describe, expect, it } from "vitest";
import { constrainPoint, quote, type Decoration } from "./model";

const cream = (color: string): Decoration => ({ id: 1, kind: "cream", x: 0, y: 0, color, rotation: 0 });
describe("prototypeの価格", () => {
  it("本体価格と税の端数切り捨て", () => {
    expect(quote([], false).total).toBe(2700);
    expect(quote([cream("#FFFFFF"), cream("#FFFFFF")], false).total).toBe(2743);
  });
  it("同色は大文字小文字を正規化し一度だけ課金する", () => {
    expect(quote([cream("#ff0000"), cream("#FF0000")], false).total).toBe(2797);
    expect(quote([cream("#FF0000"), cream("#0000FF")], false).total).toBe(2851);
    expect(quote([cream("#FF0000")], false).total).toBe(2775);
    expect(quote([], false).colors).toBe(0);
  });
  it("プレートを一度だけ加算する", () => {
    expect(quote([], true).subtotal).toBe(2800);
  });
});
describe("配置範囲", () => {
  it("飾りの大きさを含めて円の内側へ制限する", () => {
    const point = constrainPoint(300, 400);
    expect(Math.hypot(point.x, point.y)).toBeCloseTo(145);
    expect(constrainPoint(10, 20)).toEqual({ x: 10, y: 20 });
    expect(constrainPoint(0, 0)).toEqual({ x: 0, y: 0 });
  });
});
