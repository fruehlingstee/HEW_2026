import { describe, expect, it } from "vitest";
import { emptyDesign, parseDesign } from "./model";
import { DEFAULT_PLATE_LAYOUT, PLATE_WIDTH, constrainPlate, parsePlateLayout, plateDepthOnTop, plateSummary } from "./plate";
import { cakeScale, editorToMm } from "./cake-sizes";

// 上から見たプレートの角が、ケーキの縁からどれだけ内側にあるか（最も外側の角の半径）。
const farthestCorner = (layout: ReturnType<typeof constrainPlate>) => {
  const a = layout.rotation * Math.PI / 180, halfW = PLATE_WIDTH / 2, halfD = plateDepthOnTop(layout.style) / 2;
  return Math.max(...[[-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD]].map(([x, y]) => Math.hypot(layout.x + x * Math.cos(a) - y * Math.sin(a), layout.y + x * Math.sin(a) + y * Math.cos(a))));
};

describe("メッセージプレートの置き方と位置", () => {
  it("置き方を追加する前の保存データは、従来どおり中央に寝かせて読む", () => {
    const { plateLayout, ...old } = { ...emptyDesign(), plate: true };
    expect(plateLayout).toEqual(DEFAULT_PLATE_LAYOUT);
    expect(parseDesign(old).plateLayout).toEqual({ style: "flat", x: 0, y: 4, rotation: 0 });
    expect(plateSummary(parseDesign(old))).toBe("Happy Birthday（寝かせる）");
  });
  it("縁の外へ動かすと、角がケーキに収まるところまで中心へ寄せる", () => {
    for (const layout of [{ style: "flat" as const, x: 160, y: 0, rotation: 0 }, { style: "flat" as const, x: -90, y: 120, rotation: 45 }, { style: "tilted" as const, x: 0, y: -170, rotation: 90 }]) {
      const fixed = constrainPlate(layout);
      expect(farthestCorner(fixed)).toBeLessThanOrEqual(165.001);
      expect(farthestCorner(fixed)).toBeGreaterThan(164);
      expect(Math.atan2(fixed.y, fixed.x)).toBeCloseTo(Math.atan2(layout.y, layout.x));
    }
    // 収まる位置はそのまま。傾けると上から見た奥行きが短くなるので、寝かせるより縁に寄せられる。
    expect(constrainPlate({ style: "flat", x: 10, y: 20, rotation: 30 })).toEqual({ style: "flat", x: 10, y: 20, rotation: 30 });
    expect(constrainPlate({ style: "tilted", x: 0, y: 150, rotation: 0 }).y).toBeGreaterThan(constrainPlate({ style: "flat", x: 0, y: 150, rotation: 0 }).y);
  });
  it("不正な置き方・はみ出した位置・範囲外の回転は読み込まない", () => {
    expect(() => parsePlateLayout({ style: "standing", x: 0, y: 0, rotation: 0 })).toThrow("プレート");
    expect(() => parsePlateLayout({ style: "flat", x: 150, y: 0, rotation: 0 })).toThrow("はみ出し");
    expect(() => parsePlateLayout({ style: "flat", x: 0, y: 0, rotation: 400 })).toThrow("プレート");
    expect(() => parsePlateLayout(null)).toThrow("プレート");
  });
  it("6号では実寸の幅を保ち、5号には収まらない位置も選べる", () => {
    const layout = { style: "flat" as const, x: 85, y: 0, rotation: 0 };
    expect(() => parsePlateLayout(layout, 5)).toThrow("はみ出し");
    expect(parsePlateLayout(layout, 6)).toEqual(layout);
    expect(constrainPlate(layout, 6)).toEqual(layout);
    expect(constrainPlate(layout, 5).x).toBeLessThan(layout.x);
    expect(editorToMm(PLATE_WIDTH / cakeScale(6), 6)).toBeCloseTo(editorToMm(PLATE_WIDTH, 5));
  });
});
