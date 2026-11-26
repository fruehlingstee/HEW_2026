import { describe, expect, it } from "vitest";
import { FILLINGS, FILLING_KINDS, fillingFromPartId, fillingNames, fillingPartId, isFillingKind } from "./fillings";

describe("中のフルーツ（ケーキの中に挟むフルーツ）", () => {
  it("苺カット・ブルーベリー・ラズベリーの3種類で、どれも1種類200円", () => {
    expect(FILLING_KINDS).toEqual(["strawberry", "blueberry", "raspberry"]);
    for (const kind of FILLING_KINDS) expect(FILLINGS[kind].price).toBe(200);
  });

  it("一覧にある名前だけを受け付ける", () => {
    expect(isFillingKind("blueberry")).toBe(true);
    expect(isFillingKind("mango")).toBe(false);
    expect(isFillingKind("toString")).toBe(false);
    expect(isFillingKind(undefined)).toBe(false);
  });

  it("上に置く飾り（苺など）とぶつからない商品IDに変換し、元に戻せる", () => {
    expect(fillingPartId("strawberry")).toBe("filling-strawberry");
    expect(fillingFromPartId("filling-strawberry")).toBe("strawberry");
    expect(fillingFromPartId("strawberry")).toBeNull();
    expect(fillingFromPartId("filling-mango")).toBeNull();
  });

  it("製造指示書用に名前を並べ、なければ「なし」と書く", () => {
    expect(fillingNames(["strawberry", "raspberry"])).toBe("苺カット・ラズベリー");
    expect(fillingNames([])).toBe("なし");
  });
});