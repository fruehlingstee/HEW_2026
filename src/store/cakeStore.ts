
"use client";

import { create } from "zustand";

// 苺の座標
export type Position = {
  x: number;
  y: number;
};

// 開発用の仮価格・上限
export const CAKE_PRICE = 3500;
export const STRAWBERRY_PRICE = 200;
export const MAX_STRAWBERRIES = 3;

// 苺の初期位置
const initialPositions: Position[] = [
  { x: 85, y: 85 },
  { x: 155, y: 85 },
  { x: 120, y: 155 },
];

// ケーキ内に座標を制限する
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
type CakeStore = {
  spongeColor: string;
  creamColor: string;
  strawberryCount: number;
  strawberryPositions: Position[];

  setSpongeColor: (color: string) => void;
  setCreamColor: (color: string) => void;

  addStrawberry: () => void;
  removeStrawberry: () => void;

  moveStrawberry: (
    index: number,
    position: Position
  ) => void;

  restoreStrawberries: (
    count: number,
    positions: Position[]
  ) => void;
};

// Zustandストア
export const useCakeStore = create<CakeStore>((set) => ({
  spongeColor: "#F5D6A0",
  creamColor: "#FFFFFF",
  strawberryCount: 0,
  strawberryPositions: initialPositions.map(
    (position) => ({ ...position })
  ),

  // スポンジ色を変更
  setSpongeColor: (color) =>
    set({ spongeColor: color }),

  // クリーム色を変更
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

  // 指定された苺を移動
  moveStrawberry: (index, position) =>
    set((state) => ({
      strawberryPositions: state.strawberryPositions.map(
        (current, i) =>
          i === index
            ? limitPosition(position.x, position.y)
            : current
      ),
    })),

  // 保存データから苺を復元
  restoreStrawberries: (count, positions) =>
    set({
      strawberryCount: Math.max(
        0,
        Math.min(MAX_STRAWBERRIES, count)
      ),
      strawberryPositions: positions.map((position) =>
        limitPosition(position.x, position.y)
      ),
    }),
}));
