import { describe, expect, it } from "vitest";
import { constrainPhoto, getPhotoPlates, isEmbeddedPhoto, mapPhotoImages, photoCropRect, photoFootprintRadius, photoImageRect, photoLayout, photoRef, photoRefId, photoSummary, parsePhotoPlate, parsePhotoPlates, PHOTO_IMAGE_MAX_LENGTH, type PhotoPlate } from "./photo-plate";

const photo = (crop: Partial<PhotoPlate> = {}): PhotoPlate => ({ image: "data:image/png;base64,aGVsbG8=", zoom: 1, offsetX: 0, offsetY: 0, ...crop });

describe("写真の切り抜き", () => {
  it("横長と縦長の画像を中央から正方形に切り抜く", () => {
    expect(photoCropRect(photo(), 1200, 800)).toEqual({ sx: 200, sy: 0, size: 800 });
    expect(photoCropRect(photo(), 800, 1200)).toEqual({ sx: 0, sy: 200, size: 800 });
  });
  it("拡大して端へ寄せても画像の範囲を超えない", () => {
    expect(photoCropRect(photo({ zoom: 2, offsetX: 1, offsetY: -1 }), 1200, 800)).toEqual({ sx: 800, sy: 0, size: 400 });
    expect(photoCropRect(photo({ zoom: 2, offsetX: -1, offsetY: 1 }), 1200, 800)).toEqual({ sx: 0, sy: 400, size: 400 });
  });
  it("旧データは写真なしとし、非画像・過大画像・不正な切り抜きを拒否する", () => {
    expect(parsePhotoPlate(undefined)).toBeNull();
    for (const patch of [{ image: "https://example.test/photo.png" }, { image: "data:image/svg+xml;base64,PHN2Zz4=" }, { image: "data:image/png;base64," + "a".repeat(PHOTO_IMAGE_MAX_LENGTH) }, { zoom: NaN }, { zoom: 4 }, { offsetX: -1.01 }]) {
      expect(() => parsePhotoPlate(photo(patch))).toThrow();
    }
  });
});

describe("写真プレートの配置・保存互換", () => {
  it("以前の1枚データをそのまま読み、明示された空配列は写真なしとして扱う", () => {
    const legacy = photo();
    expect(parsePhotoPlate(legacy)).toEqual(legacy);
    expect(photoLayout(legacy)).toEqual({ x: 0, y: 0, rotation: 0, sizeMm: 70, shape: "circle", radius: 79.8 });
    expect(getPhotoPlates({ photoPlate: legacy })).toEqual([legacy]);
    expect(getPhotoPlates({ photoPlate: legacy, photoPlates: [] })).toEqual([]);
    expect(getPhotoPlates({})).toEqual([]);
  });

  it("3枚の個別設定を保持し、不足したIDをほかのIDと衝突せず安定して補う", () => {
    const input = [photo({ id: "photo-2", shape: "heart", sizeMm: 40, x: -50, rotation: -25 }), photo({ shape: "polaroid", sizeMm: 55, x: 30, y: 10 }), photo({ shape: "square", sizeMm: 85 })];
    const parsed = parsePhotoPlates(input);
    expect(parsed.map(p => p.id)).toEqual(["photo-2", "photo-2-new", "photo-3"]);
    expect(parsed[0]).toEqual(input[0]);
    expect(parsePhotoPlates(input)).toEqual(parsed);
    expect(parsePhotoPlates(undefined)).toEqual([]);
  });

  it("枚数超過・重複ID・不正な形や寸法・位置・回転を拒否する", () => {
    expect(() => parsePhotoPlates([photo(), photo(), photo(), photo()])).toThrow();
    expect(() => parsePhotoPlates([photo({ id: "same" }), photo({ id: "same" })])).toThrow();
    for (const patch of [{ shape: "triangle" }, { sizeMm: 39 }, { sizeMm: 91 }, { x: NaN }, { y: Infinity }, { x: 172 }, { rotation: 361 }]) {
      expect(() => parsePhotoPlate({ ...photo(), ...patch })).toThrow();
    }
    expect(() => parsePhotoPlates([photo({ x: 100 })])).toThrow("はみ出し");
  });

  it("四角の回転とケーキのサイズを考慮し、外接円全体を縁内に収める", () => {
    const input = photo({ shape: "square", sizeMm: 70, x: 120, y: 80, rotation: 45 });
    const small = constrainPhoto(input, 5), large = constrainPhoto(input, 6);
    expect(photoFootprintRadius(input, 5)).toBeCloseTo(79.8 * Math.SQRT2);
    expect(Math.hypot(small.x!, small.y!) + photoFootprintRadius(small, 5)).toBeCloseTo(171);
    expect(Math.hypot(large.x!, large.y!)).toBeGreaterThan(Math.hypot(small.x!, small.y!));
    expect(large.rotation).toBe(45);
    expect(() => parsePhotoPlates([small], 5)).not.toThrow();
    expect(() => parsePhotoPlates([large], 5)).toThrow();
    expect(() => parsePhotoPlates([large], 6)).not.toThrow();
  });

  it("チェキ風の写真は縦横を保って上に寄せ、位置のmm表示はケーキ寸法に合わせる", () => {
    const area = photoImageRect("polaroid");
    expect(area.width).toBe(area.height);
    expect(1 - (area.y + area.height)).toBeGreaterThan(area.y + 1);
    const placed = photo({ shape: "heart", sizeMm: 40, x: 57, y: -57, rotation: 30 });
    expect(photoSummary(placed, 0, 5)).toContain("左右25mm・前後-25mm");
    expect(photoSummary(placed, 0, 6)).toContain("左右30mm・前後-30mm");
  });
});

describe("公開版で保存した写真の参照", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it("/api/photos/<UUID> の参照だけを、埋め込み画像と同じく写真として受け付ける", () => {
    expect(parsePhotoPlate(photo({ image: photoRef(id) }))?.image).toBe(`/api/photos/${id}`);
    expect(photoRefId(photoRef(id))).toBe(id);
    expect(photoRefId("data:image/png;base64,aGVsbG8=")).toBeNull();
    expect(isEmbeddedPhoto("data:image/png;base64,aGVsbG8=")).toBe(true);
    expect(isEmbeddedPhoto(photoRef(id))).toBe(false);
    for (const image of ["/api/photos/not-a-uuid", `/api/photos/${id}?x=1`, `https://example.test/api/photos/${id}`, "/api/photos/ABCDEF01-2345-4678-9ABC-DEF012345678"]) {
      expect(() => parsePhotoPlate(photo({ image })), image).toThrow();
    }
  });
  it("写真の画像だけを差し替え、形・位置・切り抜きはそのまま残す", () => {
    const placed = photo({ id: "photo-1", shape: "heart", sizeMm: 55, x: 20, y: -10, rotation: 30, zoom: 2 });
    const design = { photoPlate: null, photoPlates: [placed, photo({ id: "photo-2" })] };
    const swapped = mapPhotoImages(design, () => photoRef(id));
    expect(getPhotoPlates(swapped).map(p => p.image)).toEqual([photoRef(id), photoRef(id)]);
    expect(swapped.photoPlates[0]).toEqual({ ...placed, image: photoRef(id) });
    // 元のデザインは書き換えない。
    expect(design.photoPlates[0].image).toBe("data:image/png;base64,aGVsbG8=");
    // 以前の1枚だけの写真（photoPlate）も差し替える。
    expect(mapPhotoImages({ photoPlate: photo() }, () => photoRef(id)).photoPlate?.image).toBe(photoRef(id));
  });
});
