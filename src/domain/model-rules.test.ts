// 11/27 に合意した決まりと、各機能の保存データの読み込みを、デザインの型（model）で確かめる。
// prototype の cake-sizes・toppings・extra-toppings・borders・fillings のテストのうち、model だけで確かめられる部分を集めた。
import { describe, expect, it } from "vitest";
import { MAX_FRUIT, changeCakeSize, constrainPoint, emptyDesign, parseDesign, quote, type Decoration } from "./model";
import { TOPPINGS, TOPPING_KINDS, isAccent, type ToppingKind } from "./toppings";

const item = (kind: ToppingKind, id = 1, color: string = TOPPINGS[kind].color): Decoration => ({ id, kind, color, x: 0, y: 0, rotation: 0 });

describe("ケーキのサイズと本体価格（11/27 合意）", () => {
  it("5号は税込2,700円、6号は税込3,240円（本体2,500円・3,000円に税8%）", () => {
    expect(quote([], false, [], null, 5).total).toBe(2700);
    expect(quote([], false, [], null, 6).total).toBe(3240);
  });
  it("サイズのない古い保存データは5号として読む", () => {
    const legacy: Record<string, unknown> = { ...emptyDesign() };
    delete legacy.size;
    expect(parseDesign(legacy).size).toBe(5);
  });
  it("小さくするときも飾りを残し、はみ出しだけを収める", () => {
    const design = { ...emptyDesign(), size: 6 as const, items: [{ id: 1, kind: "mint" as const, x: 120, y: 0, rotation: 0, color: "#FFFFFF" }] };
    const small = changeCakeSize(design, 5);
    expect(() => parseDesign(small)).not.toThrow();
    expect(small.items).toHaveLength(1);
    expect(small.items[0].x).toBeLessThan(120);
    expect(design.items[0].x).toBe(120);
  });
});

describe("飾りの上限（11/27 合意：種類別 20・32・10）", () => {
  it("フルーツなど20個・絞りクリーム32個・お祝いの飾り10個は、別々の枠として一緒に置ける", () => {
    expect(MAX_FRUIT).toBe(20);
    const fruit = Array.from({ length: 20 }, (_, i) => item("peach", i + 1));
    const creams = Array.from({ length: 32 }, (_, i) => item("cream", i + 21));
    const celebration = Array.from({ length: 10 }, (_, i) => item("candle", i + 53));
    expect(parseDesign({ ...emptyDesign(), items: [...fruit, ...creams, ...celebration] }).items).toHaveLength(62);
  });
  it("どれかの枠を1個でも超えると読み込まない", () => {
    const fruit = Array.from({ length: 20 }, (_, i) => item("peach", i + 1));
    const celebration = Array.from({ length: 10 }, (_, i) => item("candle", i + 53));
    expect(() => parseDesign({ ...emptyDesign(), items: [...fruit, item("kiwi", 100)] })).toThrow("上限");
    expect(() => parseDesign({ ...emptyDesign(), items: [...celebration, item("topper", 100)] })).toThrow("上限");
    const creams = Array.from({ length: 33 }, (_, i) => item("chocolateCream", i + 1));
    expect(() => parseDesign({ ...emptyDesign(), items: creams })).toThrow("上限");
  });
});

describe("飾りの読み込みと料金", () => {
  it("書き出し・読み込みで、全種類の飾りの種類・座標・回転を保つ", () => {
    const items = TOPPING_KINDS.filter(kind => TOPPINGS[kind].palette).map((kind, i) => ({ id: i + 1, kind, x: (i % 8) * 10, y: -30, rotation: (i * 30) % 360, color: "#FFFFFF" }));
    const design = { ...emptyDesign(), items };
    expect(parseDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
    expect(() => parseDesign({ ...design, items: [{ ...items[0], kind: "unknown" }] })).toThrow();
  });
  it("飾りの大きさの分だけ、縁より内側に収める", () => {
    expect(Math.hypot(...Object.values(constrainPoint(400, 300, "mint")))).toBeCloseTo(110);
  });
  it("お祝いの飾りの色は無料で、白以外の絞りクリームだけ1色50円（11/27 合意）", () => {
    for (const kind of TOPPING_KINDS.filter(isAccent)) {
      expect(quote([item(kind, 1, "#123456")], false)).toEqual(quote([item(kind)], false));
    }
    expect(quote([item("candle", 1, "#123456"), item("cream", 2, "#123456")], false).colors).toBe(50);
    const piece = (id: number, color: string) => ({ id, kind: "piping3" as const, x: id * 10, y: 0, rotation: 0, color });
    expect(quote([piece(1, "#FFFFFF"), piece(2, "#F5C4CF"), piece(3, "#F5C4CF")], false).colors).toBe(50);
  });
});

describe("外周デコ・ナッペ・中のフルーツの読み込み", () => {
  it("外周デコの指定がない古いデータはドレープとして読み、知らない形は読み込まない", () => {
    const { border, ...old } = emptyDesign();
    expect(border).toBe("border1");
    expect(parseDesign(old).border).toBe("border1");
    expect(parseDesign({ ...old, border: "none" }).border).toBe("none");
    expect(parseDesign({ ...old, border: "border3" }).border).toBe("border3");
    expect(() => parseDesign({ ...old, border: "border9" })).toThrow("外周デコ");
  });
  it("ナッペの指定がない古いデータは「なし」として読み、正しくない値は読み込まない", () => {
    const { nappe, ...old } = emptyDesign();
    expect(nappe).toBe(false);
    expect(parseDesign(old).nappe).toBe(false);
    expect(() => parseDesign({ ...old, nappe: "yes" })).toThrow("ナッペ");
  });
  it("中のフルーツは並び順をそろえ、知らない種類・重複は読み込まない", () => {
    const { fillings, ...old } = emptyDesign();
    expect(fillings).toEqual([]);
    expect(parseDesign(old).fillings).toEqual([]);
    expect(parseDesign({ ...old, fillings: ["raspberry", "strawberry"] }).fillings).toEqual(["strawberry", "raspberry"]);
    expect(() => parseDesign({ ...old, fillings: ["mango"] })).toThrow("中のフルーツ");
    expect(() => parseDesign({ ...old, fillings: ["blueberry", "blueberry"] })).toThrow("中のフルーツ");
  });
  it("中のフルーツは1種類ごとに200円を足す", () => {
    expect(quote([], false, ["strawberry", "blueberry"]).filling).toBe(400);
    expect(quote([], false, ["strawberry", "blueberry"]).total).toBe(Math.floor(2900 * 1.08));
  });
});
