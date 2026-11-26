// 保存するkindとGLB・表示名・仮単価を一箇所で管理する。
// short: 素材パレットの正方形カードに載せる短い名前
// tintable: クリーム色を変えられる（白以外は色変更料金の対象）
// fit: Blender単位のモデル。読み込み時に寸法を測り、radiusの大きさに合わせて表示する
export const TOPPINGS = {
  strawberry: { label: "苺", short: "苺", model: "/models/fruits/strawberry-hulled-tip-up.glb", color: "#CA3048", price: 150, radius: 34, cream: false, tintable: false, fit: false, edible: true, accent: false, palette: true },
  blueberry: { label: "ブルーベリー", short: "ブルーベリー", model: "/models/fruits/blueberry.glb", color: "#53638D", price: 80, radius: 20, cream: false, tintable: false, fit: false, edible: true, accent: false, palette: true },
  raspberry: { label: "ラズベリー", short: "ラズベリー", model: "/models/fruits/raspberry.glb", color: "#C9204B", price: 120, radius: 24, cream: false, tintable: false, fit: false, edible: true, accent: false, palette: true },
  cream: { label: "生クリーム", short: "生クリーム", model: "/models/cream/whipped-cream.glb", color: "#FFFFFF", price: 20, radius: 31, cream: true, tintable: true, fit: false, edible: true, accent: false, palette: true },
  chocolateCream: { label: "チョコクリーム", short: "チョコクリーム", model: "/models/cream/chocolate-cream.glb", color: "#74422B", price: 30, radius: 31, cream: true, tintable: false, fit: false, edible: true, accent: false, palette: true },
  macaron: { label: "マカロン", short: "マカロン", model: "/models/sweets/macaron-pink.glb", color: "#D98E9E", price: 200, radius: 38, cream: false, tintable: false, fit: false, edible: true, accent: false, palette: true },
  mint: { label: "ミント", short: "ミント", model: "/models/leaves/mint.glb", color: "#39732A", price: 30, radius: 61, cream: false, tintable: false, fit: false, edible: true, accent: false, palette: true },
  // ケーキの上に1個ずつ置く絞りクリーム（cream_dec_1〜5）。外周に巻く帯（cream_border）とは別物。
  piping1: { label: "絞りクリーム（ロゼット）", short: "ロゼット", model: "/models/cream/cream_dec_1.glb", color: "#FFFFFF", price: 20, radius: 28, cream: true, tintable: true, fit: true, edible: true, accent: false, palette: true },
  piping2: { label: "絞りクリーム（ツイスト）", short: "ツイスト", model: "/models/cream/cream_dec_2.glb", color: "#FFFFFF", price: 20, radius: 28, cream: true, tintable: true, fit: true, edible: true, accent: false, palette: true },
  piping3: { label: "絞りクリーム（スター）", short: "スター", model: "/models/cream/cream_dec_3.glb", color: "#FFFFFF", price: 20, radius: 28, cream: true, tintable: true, fit: true, edible: true, accent: false, palette: true },
  piping4: { label: "絞りクリーム（フラット）", short: "フラット", model: "/models/cream/cream_dec_4.glb", color: "#FFFFFF", price: 20, radius: 28, cream: true, tintable: true, fit: true, edible: true, accent: false, palette: true },
  piping5: { label: "絞りクリーム（とんがり）", short: "とんがり", model: "/models/cream/cream_dec_5.glb", color: "#FFFFFF", price: 20, radius: 28, cream: true, tintable: true, fit: true, edible: true, accent: false, palette: true },
  peach: { label: "黄桃", short: "黄桃", model: "/models/fruits/yellow-peach.glb", color: "#F4B24A", price: 120, radius: 26, cream: false, tintable: false, fit: false, edible: true, accent: false, palette: true },
  kiwi: { label: "キウイ", short: "キウイ", model: "/models/fruits/kiwi-slice.glb", color: "#7FB241", price: 100, radius: 24, cream: false, tintable: false, fit: false, edible: true, accent: false, palette: true },
  grape: { label: "シャインマスカット", short: "マスカット", model: "/models/fruits/shine-muscat.glb", color: "#B9D86A", price: 150, radius: 18, cream: false, tintable: false, fit: false, edible: true, accent: false, palette: true },
  candle: { label: "細ろうそく", short: "ろうそく", model: "/models/celebration/candle-thin.glb", color: "#F5C4CF", price: 30, radius: 10, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: true },
  numberCandle0: { label: "数字ろうそく「0」", short: "数字ろうそく", model: "/models/celebration/number-candle-0.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: true },
  numberCandle1: { label: "数字ろうそく「1」", short: "数字ろうそく", model: "/models/celebration/number-candle-1.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: false },
  numberCandle2: { label: "数字ろうそく「2」", short: "数字ろうそく", model: "/models/celebration/number-candle-2.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: false },
  numberCandle3: { label: "数字ろうそく「3」", short: "数字ろうそく", model: "/models/celebration/number-candle-3.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: false },
  numberCandle4: { label: "数字ろうそく「4」", short: "数字ろうそく", model: "/models/celebration/number-candle-4.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: false },
  numberCandle5: { label: "数字ろうそく「5」", short: "数字ろうそく", model: "/models/celebration/number-candle-5.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: false },
  numberCandle6: { label: "数字ろうそく「6」", short: "数字ろうそく", model: "/models/celebration/number-candle-6.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: false },
  numberCandle7: { label: "数字ろうそく「7」", short: "数字ろうそく", model: "/models/celebration/number-candle-7.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: false },
  numberCandle8: { label: "数字ろうそく「8」", short: "数字ろうそく", model: "/models/celebration/number-candle-8.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: false },
  numberCandle9: { label: "数字ろうそく「9」", short: "数字ろうそく", model: "/models/celebration/number-candle-9.glb", color: "#F5C4CF", price: 100, radius: 26, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: false },
  topper: { label: "「HAPPY BIRTHDAY」トッパー", short: "トッパー", model: "/models/celebration/topper-happy-birthday.glb", color: "#D4A24C", price: 150, radius: 60, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: true },
  pickFlag: { label: "旗ピック", short: "旗ピック", model: "/models/celebration/pick-flag.glb", color: "#C2475E", price: 50, radius: 14, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: true },
  pickStar: { label: "星ピック", short: "星ピック", model: "/models/celebration/pick-star.glb", color: "#F2C94C", price: 50, radius: 16, cream: false, tintable: false, fit: false, edible: false, accent: true, palette: true },
} as const;
export type ToppingKind = keyof typeof TOPPINGS;
export const TOPPING_KINDS = Object.keys(TOPPINGS) as ToppingKind[];
export const isToppingKind = (value: unknown): value is ToppingKind => typeof value === "string" && Object.hasOwn(TOPPINGS, value);
export const isCream = (kind: ToppingKind) => TOPPINGS[kind].cream;
export const isTintable = (kind: ToppingKind) => TOPPINGS[kind].tintable;
// リング（8/12/16個を縁に並べる）に使える、色を変えられるクリーム。
export const RING_KINDS = TOPPING_KINDS.filter(isTintable);

export const isEdible = (kind: ToppingKind) => TOPPINGS[kind].edible;
export const isAccent = (kind: ToppingKind) => TOPPINGS[kind].accent;
export const isNumberCandle = (kind: ToppingKind) => kind.startsWith("numberCandle");
// 火のついたろうそく（細ろうそく・数字ろうそく）。炎のゆらぎと「吹き消す」の対象。
export const isCandle = (kind: ToppingKind) => kind === "candle" || isNumberCandle(kind);
export const CELEBRATION_NOTICE = "※食べられません。お渡し時に取り外すようお伝えください";
export const celebrationNames = (items: readonly { kind: ToppingKind }[]) => TOPPING_KINDS.filter(kind => !isEdible(kind)).map(kind => { const n = items.filter(item => item.kind === kind).length; return n ? `${TOPPINGS[kind].label}×${n}` : ""; }).filter(Boolean).join("・");
