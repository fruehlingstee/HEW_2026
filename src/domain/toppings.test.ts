import { describe, expect, it } from "vitest";
import {
  RING_KINDS, TOPPINGS, TOPPING_KINDS, celebrationNames,
  isAccent, isCandle, isCream, isEdible, isNumberCandle, isTintable, isToppingKind,
} from "./toppings";

describe("飾りの一覧", () => {
  it("価格はすべて0円以上の整数（円）", () => {
    for (const kind of TOPPING_KINDS) {
      expect(Number.isInteger(TOPPINGS[kind].price)).toBe(true);
      expect(TOPPINGS[kind].price).toBeGreaterThanOrEqual(0);
    }
  });

  it("一覧にある名前だけを飾りの種類として受け付ける", () => {
    expect(isToppingKind("strawberry")).toBe(true);
    expect(isToppingKind("unknown")).toBe(false);
    expect(isToppingKind("toString")).toBe(false);
    expect(isToppingKind(1)).toBe(false);
  });

  it("どの飾りも、上限の3つの枠（フルーツなど・絞りクリーム・お祝いの飾り）のどれか1つに入る", () => {
    const fruitLike = TOPPING_KINDS.filter(kind => isEdible(kind) && !isCream(kind));
    const creams = TOPPING_KINDS.filter(isCream);
    const celebration = TOPPING_KINDS.filter(kind => !isEdible(kind));
    expect(fruitLike).toContain("strawberry");
    expect(creams).toContain("piping1");
    expect(celebration).toContain("candle");
    expect(fruitLike.length + creams.length + celebration.length).toBe(TOPPING_KINDS.length);
    expect(celebration.every(isAccent)).toBe(true);
  });

  it("色を変えられる（色変更料金の対象になる）のは白い絞りクリームだけ", () => {
    expect(RING_KINDS).toEqual(["cream", "piping1", "piping2", "piping3", "piping4", "piping5"]);
    expect(isTintable("chocolateCream")).toBe(false);
    expect(isTintable("strawberry")).toBe(false);
  });

  it("ろうそくを見分けられる", () => {
    expect(isNumberCandle("numberCandle7")).toBe(true);
    expect(isCandle("candle")).toBe(true);
    expect(isCandle("numberCandle0")).toBe(true);
    expect(isCandle("pickStar")).toBe(false);
  });

  it("製造指示書用に、お祝いの飾り（食べられない飾り）の名前と数をまとめる", () => {
    const items = [{ kind: "candle" }, { kind: "strawberry" }, { kind: "topper" }, { kind: "candle" }] as const;
    expect(celebrationNames(items)).toBe("細ろうそく×2・「HAPPY BIRTHDAY」トッパー×1");
  });
});