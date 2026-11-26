import { cakeScale, editorToMm, type CakeSize } from "./cake-sizes";

// 写真は縮小した画像だけを保存する。外部URLやSVGは受け付けない。
// image は次のどちらか。
// ・埋め込み画像（data:image/…;base64,…）：ローカル体験版と、公開版でまだ保存していない写真。
// ・サーバーの写真の参照（/api/photos/<ID>）：公開版（Vercel）で保存した写真。画像本体は会員DBの写真用テーブルにある。
export const PHOTO_SHAPES = { circle: "丸型", heart: "ハート", square: "角丸四角", polaroid: "チェキ風" } as const;
export type PhotoShape = keyof typeof PHOTO_SHAPES;
export type PhotoPlate = {
  image: string; zoom: number; offsetX: number; offsetY: number;
  id?: string; shape?: PhotoShape; sizeMm?: number; x?: number; y?: number; rotation?: number;
};
export const MAX_PHOTO_PLATES = 3;
export const PHOTO_PLATE_PART_ID = "photo-plate";
export const PHOTO_PLATE_PRICE = 500;
export const PHOTO_PLATE_SIZE_MM = 70;
export const PHOTO_PLATE_RADIUS = 79.8;
export const PHOTO_PLATE_BORDER_RATIO = 2 / PHOTO_PLATE_RADIUS;
export const PHOTO_IMAGE_MAX_LENGTH = 400_000;
export const PHOTO_FILE_MAX_BYTES = 10 * 1024 * 1024;
const bounded = (n: unknown, min: number, max: number): n is number => typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

// サーバーの写真の参照。IDはランダムなUUID（推測できない長い番号）だけを許し、ほかのURLは通さない。
export const PHOTO_REF_PREFIX = "/api/photos/";
const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EMBEDDED_PHOTO = /^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;
export const isPhotoId = (value: unknown): value is string => typeof value === "string" && PHOTO_ID.test(value);
export const photoRef = (id: string) => `${PHOTO_REF_PREFIX}${id}`;
// 参照ならそのID、埋め込み画像などならnull。
export function photoRefId(image: string): string | null {
  const id = image.startsWith(PHOTO_REF_PREFIX) ? image.slice(PHOTO_REF_PREFIX.length) : "";
  return isPhotoId(id) ? id : null;
}
// まだサーバーへ保存していない（画像そのものを持っている）写真か。
export const isEmbeddedPhoto = (image: string) => image.length <= PHOTO_IMAGE_MAX_LENGTH && EMBEDDED_PHOTO.test(image);

export function photoLayout(photo: PhotoPlate, size?: CakeSize) {
  const sizeMm = photo.sizeMm ?? PHOTO_PLATE_SIZE_MM;
  return { x: photo.x ?? 0, y: photo.y ?? 0, rotation: photo.rotation ?? 0, sizeMm, shape: photo.shape ?? "circle", radius: PHOTO_PLATE_RADIUS * (sizeMm / PHOTO_PLATE_SIZE_MM) / cakeScale(size) };
}

// 四角やハートは回転しても収まるよう、外接円を使って縁との距離を確保する。
export function photoFootprintRadius(photo: PhotoPlate, size?: CakeSize) {
  const layout = photoLayout(photo, size);
  return layout.radius * (layout.shape === "circle" ? 1 : Math.SQRT2);
}

export function constrainPhoto(photo: PhotoPlate, size?: CakeSize): PhotoPlate {
  const layout = photoLayout(photo, size);
  const distance = Math.hypot(layout.x, layout.y);
  const limit = Math.max(0, 171 - photoFootprintRadius(photo, size));
  const ratio = distance > limit ? limit / distance : 1;
  return { ...photo, x: layout.x * ratio, y: layout.y * ratio };
}

export function getPhotoPlates(design: { photoPlate?: PhotoPlate | null; photoPlates?: readonly PhotoPlate[] }): PhotoPlate[] {
  if (design.photoPlates !== undefined) return [...design.photoPlates];
  return design.photoPlate ? [design.photoPlate] : [];
}

// 写真の画像だけを差し替えたデザインを返す（形・位置・切り抜きは変えない）。公開版で、埋め込み画像をサーバーの参照へ置き換えるのに使う。
export function mapPhotoImages<T extends { photoPlate?: PhotoPlate | null; photoPlates?: PhotoPlate[] }>(design: T, change: (image: string) => string): T {
  const swap = (photo: PhotoPlate) => ({ ...photo, image: change(photo.image) });
  return { ...design, ...(design.photoPlate ? { photoPlate: swap(design.photoPlate) } : {}), ...(design.photoPlates !== undefined ? { photoPlates: design.photoPlates.map(swap) } : {}) };
}

// 外側を±1に正規化し、上面図・3D・印刷用PNGの輪郭を共通にする。
export function photoShapePath(shape: PhotoShape): string {
  if (shape === "circle") return "M 1 0 A 1 1 0 1 0 -1 0 A 1 1 0 1 0 1 0 Z";
  if (shape === "heart") return "M 0 1 C -.18 .78 -1 .14 -1 -.4 C -1 -1 -.35 -1 0 -.54 C .35 -1 1 -1 1 -.4 C 1 .14 .18 .78 0 1 Z";
  return "M -.82 -1 H .82 Q 1 -1 1 -.82 V .82 Q 1 1 .82 1 H -.82 Q -1 1 -1 .82 V -.82 Q -1 -1 -.82 -1 Z";
}

// チェキ風だけ写真を上へ寄せて、白い下余白を広く残す。画像領域は常に正方形。
export function photoImageRect(shape: PhotoShape) {
  if (shape === "polaroid") return { x: -.8, y: -.88, width: 1.6, height: 1.6 };
  const edge = 1 - PHOTO_PLATE_BORDER_RATIO;
  return { x: -edge, y: -edge, width: edge * 2, height: edge * 2 };
}

export function photoSummary(photo: PhotoPlate, index?: number, size?: CakeSize): string {
  const layout = photoLayout(photo, size);
  const position = Math.hypot(layout.x, layout.y) < .5 ? "中央" : `左右${Math.round(editorToMm(layout.x, size))}mm・前後${Math.round(editorToMm(layout.y, size))}mm`;
  return `${index === undefined ? "" : `${index + 1}枚目：`}${PHOTO_SHAPES[layout.shape]}・${layout.sizeMm}mm / ${position}・回転${Math.round(layout.rotation)}°`;
}

export function parsePhotoPlate(value: unknown): PhotoPlate | null {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object") throw new Error("写真プレートの形式が正しくありません。");
  const p = value as Record<string, unknown>;
  if (typeof p.image !== "string" || !(isEmbeddedPhoto(p.image) || photoRefId(p.image)) || !bounded(p.zoom, 1, 3) || !bounded(p.offsetX, -1, 1) || !bounded(p.offsetY, -1, 1)) throw new Error("写真はJPEG・PNG形式の縮小画像と、有効な切り抜き範囲を指定してください。");
  if (p.id !== undefined && (typeof p.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(p.id))) throw new Error("写真プレートの識別子が正しくありません。");
  if (p.shape !== undefined && (typeof p.shape !== "string" || !Object.hasOwn(PHOTO_SHAPES, p.shape))) throw new Error("写真プレートの形を選び直してください。");
  for (const [key, min, max] of [["sizeMm", 40, 90], ["x", -171, 171], ["y", -171, 171], ["rotation", -360, 360]] as const) {
    if (p[key] !== undefined && !bounded(p[key], min, max)) throw new Error("写真プレートの大きさ・位置・回転が正しくありません。");
  }
  return {
    image: p.image, zoom: p.zoom, offsetX: p.offsetX, offsetY: p.offsetY,
    ...(p.id === undefined ? {} : { id: p.id as string }),
    ...(p.shape === undefined ? {} : { shape: p.shape as PhotoShape }),
    ...(p.sizeMm === undefined ? {} : { sizeMm: p.sizeMm as number }),
    ...(p.x === undefined ? {} : { x: p.x as number }),
    ...(p.y === undefined ? {} : { y: p.y as number }),
    ...(p.rotation === undefined ? {} : { rotation: p.rotation as number }),
  };
}

export function parsePhotoPlates(value: unknown, size?: CakeSize): PhotoPlate[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_PHOTO_PLATES) throw new Error(`写真プレートは${MAX_PHOTO_PLATES}枚までです。`);
  const photos = value.map(item => {
    const parsed = parsePhotoPlate(item);
    if (!parsed) throw new Error("写真プレートの形式が正しくありません。");
    if (Math.hypot(parsed.x ?? 0, parsed.y ?? 0) + photoFootprintRadius(parsed, size) > 171 + 1e-6) throw new Error("写真プレートがケーキの縁からはみ出しています。");
    return parsed;
  });
  const used = new Set<string>();
  for (const photo of photos) {
    if (!photo.id) continue;
    if (used.has(photo.id)) throw new Error("写真プレートの識別子が重複しています。");
    used.add(photo.id);
  }
  return photos.map((photo, index) => {
    if (photo.id) return photo;
    let id = `photo-${index + 1}`;
    while (used.has(id)) id += "-new";
    used.add(id);
    return { ...photo, id };
  });
}

// SVG、3D、印刷用画像で同じ正方形の切り抜き範囲を使う。
export function photoCropRect(photo: PhotoPlate, width: number, height: number) {
  const size = Math.min(width, height) / photo.zoom;
  return { sx: (width - size) * (1 + photo.offsetX) / 2, sy: (height - size) * (1 + photo.offsetY) / 2, size };
}

export function loadPhotoImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth && image.naturalHeight ? resolve(image) : reject(new Error("画像の大きさを読み取れませんでした。"));
    image.onerror = () => reject(new Error("画像を読み込めませんでした。JPEG・PNG・WebP画像を選び直してください。"));
    image.src = source;
  });
}

export async function readPhotoFile(file: File): Promise<PhotoPlate> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("JPEG・PNG・WebP画像を選んでください。");
  if (!file.size || file.size > PHOTO_FILE_MAX_BYTES) throw new Error("画像は10MB以下のファイルを選んでください。");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadPhotoImage(url);
    if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error("画像が大きすぎます。4000万画素以下に縮小して選び直してください。");
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("このブラウザーでは画像の加工ができません。");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/jpeg", .86);
    for (const quality of [.75, .6, .45]) {
      if (data.length <= PHOTO_IMAGE_MAX_LENGTH) break;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    const photo = parsePhotoPlate({ image: data, zoom: 1, offsetX: 0, offsetY: 0 });
    if (!photo) throw new Error("写真を読み込めませんでした。");
    return photo;
  } finally { URL.revokeObjectURL(url); }
}

export async function renderPhotoPlate(photo: PhotoPlate, size = 1024): Promise<HTMLCanvasElement> {
  const parsed = parsePhotoPlate(photo);
  if (!parsed) throw new Error("写真が選択されていません。");
  const image = await loadPhotoImage(parsed.image);
  const crop = photoCropRect(parsed, image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("印刷用画像を作成できませんでした。");
  const layout = photoLayout(parsed);
  const area = photoImageRect(layout.shape);
  context.translate(size / 2, size / 2); context.scale(size / 2, size / 2);
  const outline = new Path2D(photoShapePath(layout.shape));
  context.fillStyle = "#fff8e6"; context.fill(outline);
  context.strokeStyle = "#ddcdb1"; context.lineWidth = 2 / size; context.stroke(outline);
  context.translate(area.x + area.width / 2, area.y + area.height / 2); context.scale(area.width / 2, area.height / 2);
  context.clip(new Path2D(photoShapePath(layout.shape === "polaroid" ? "square" : layout.shape)));
  context.drawImage(image, crop.sx, crop.sy, crop.size, crop.size, -1, -1, 2, 2);
  return canvas;
}
