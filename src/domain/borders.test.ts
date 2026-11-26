import { describe, expect, it } from "vitest";
import {
  BORDERS, BORDER_KINDS, BORDER_PLACES, BORDER_STYLES, DEFAULT_BORDER,
  borderFromPartId, borderInstruction, borderLabel, borderPartId, isBorderStyle, nappeLabel,
} from "./borders";
import { TOPPINGS } from "./toppings";

describe("外周デコ（ケーキの縁に一周付ける飾り）", () => {
  it("形は4種類で、「なし」を含めた5つから1つ選ぶ", () => {
    expect(BORDER_KINDS).toEqual(["border1", "border2", "border3", "border4"]);
    expect(BORDER_STYLES).toEqual(["none", "border1", "border2", "border3", "border4"]);
    expect(borderLabel("none")).toBe("なし");
    expect(borderLabel("border3")).toBe("ガーランド");
  });

  it("上に置く絞りクリームとは別の3Dモデルを使う", () => {
    const pipingModels: string[] = Object.values(TOPPINGS).map(t => t.model);
    for (const kind of BORDER_KINDS) expect(pipingModels).not.toContain(BORDERS[kind].model);
  });

  it("種類ごとに絞る位置（上の縁・すそ）が決まっていて、製造指示書には位置まで書く", () => {
    for (const kind of BORDER_KINDS) expect(Object.keys(BORDER_PLACES)).toContain(BORDERS[kind].place);
    expect(borderInstruction("border1")).toBe("ドレープ（上の縁から垂らす）");
    expect(borderInstruction("border4")).toBe("フリル（すそに絞る）");
    expect(borderInstruction("none")).toBe("なし");
  });

  it("保存データの値を確かめ、知らない形は受け付けない", () => {
    expect(DEFAULT_BORDER).toBe("border1");
    expect(isBorderStyle("none")).toBe(true);
    expect(isBorderStyle("border2")).toBe(true);
    expect(isBorderStyle("border9")).toBe(false);
    expect(isBorderStyle("toString")).toBe(false);
    expect(isBorderStyle(null)).toBe(false);
  });

  it("DBの商品IDと行き来できる", () => {
    expect(borderPartId("border2")).toBe("border-border2");
    expect(borderFromPartId("border-border2")).toBe("border2");
    expect(borderFromPartId("border-border9")).toBeNull();
    expect(borderFromPartId("strawberry")).toBeNull();
  });

  it("ナッペ（全体をクリームで塗る）の表示", () => {
    expect(nappeLabel(true)).toBe("あり（クリームの色で全体を塗る）");
    expect(nappeLabel(false)).toBe("なし");
  });
});