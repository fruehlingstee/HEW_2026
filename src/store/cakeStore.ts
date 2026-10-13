
"use client";

import { create } from "zustand";

// 苺の座標
export type Position = {
  x: number;
  y: number;
};

// ケーキのデザイン情報
export type CakeDesign = {
  spongeColor: string;
  creamColor: string;
  strawberryCount: number;
  strawberryPositions: Position[];
  hasMessagePlate: boolean;
  message: string;
};

// 開発用の仮価格
export const CAKE_PRICE = 3500;
export const STRAWBERRY_PRICE = 200;
export const MESSAGE_PRICE = 300;

// PoCでは苺を3個まで配置
export const MAX_STRAWBERRIES = 3;

// 苺の初期座標
const initialPositions: Position[] = [
  { x: 85, y: 85 },
  { x: 155, y: 85 },
  { x: 120, y: 155 },
];

// ケーキ内に苺を収める
export function limitPosition(
  x: number,
  y: number
): Position {
  const dx = x - 120;
  const dy = y - 120;
  const distance = Math.hypot(dx, dy);

  const ratio = distance > 70 ? 70 / distance : 1;

  return {
    x: Math.round(120 + dx * ratio),
    y: Math.round(120 + dy * ratio),
  };
}

// Zustandで管理するデータと操作
type CakeStore = CakeDesign & {
  setSpongeColor: (color: string) => void;
  setCreamColor: (color: string) => void;

  addStrawberry: () => void;
  removeStrawberry: () => void;

  moveStrawberry: (
    index: number,
    position: Position
  ) => void;

  setHasMessagePlate: (enabled: boolean) => void;
  setMessage: (message: string) => void;

  restoreDesign: (design: CakeDesign) => void;
};

// Zustandストア
export const useCakeStore = create<CakeStore>((set) => ({
  spongeColor: "#F5D6A0",
  creamColor: "#FFFFFF",

  strawberryCount: 0,
  strawberryPositions: initialPositions.map(
    (position) => ({ ...position })
  ),

  hasMessagePlate: false,
  message: "",

  // スポンジの色変更
  setSpongeColor: (color) =>
    set({ spongeColor: color }),

  // クリームの色変更
  setCreamColor: (color) =>
    set({ creamColor: color }),

  // 苺を追加
  addStrawberry: () =>
    set((state) => ({
      strawberryCount: Math.min(
        MAX_STRAWBERRIES,
        state.strawberryCount + 1
      ),
    })),

  // 苺を削除
  removeStrawberry: () =>
    set((state) => ({
      strawberryCount: Math.max(
        0,
        state.strawberryCount - 1
      ),
    })),

  // 苺の座標を変更
  moveStrawberry: (index, position) =>
    set((state) => {
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= state.strawberryCount
      ) {
        return state;
      }

      return {
        strawberryPositions:
          state.strawberryPositions.map(
            (current, i) =>
              i === index
                ? limitPosition(position.x, position.y)
                : current
          ),
      };
    }),

  // メッセージプレートの有無
  setHasMessagePlate: (enabled) =>
    set({ hasMessagePlate: enabled }),

  // メッセージの変更
  setMessage: (message) =>
    set({ message }),

  // 保存したデザイン全体を復元
  restoreDesign: (design) =>
    set({
      spongeColor: design.spongeColor,
      creamColor: design.creamColor,

      strawberryCount: design.strawberryCount,

      strawberryPositions:
        design.strawberryPositions.map(
          (position) =>
            limitPosition(position.x, position.y)
        ),

      hasMessagePlate: design.hasMessagePlate,
      message: design.message,
    }),
}));
