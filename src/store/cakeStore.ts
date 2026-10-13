
"use client";

import { create } from "zustand";

export type Position = {
  x: number;
  y: number;
};

// 開発用の仮価格・上限
export const CAKE_PRICE = 3500;
export const STRAWBERRY_PRICE = 200;
export const MESSAGE_PRICE = 300;
export const MAX_STRAWBERRIES = 3;

const initialPositions: Position[] = [
  { x: 85, y: 85 },
  { x: 155, y: 85 },
  { x: 120, y: 155 },
];

// 苺の移動範囲を制限する
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

type CakeStore = {
  spongeColor: string;
  creamColor: string;
  strawberryCount: number;
  strawberryPositions: Position[];

  hasMessagePlate: boolean;
  message: string;

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

  setHasMessagePlate: (enabled: boolean) => void;
  setMessage: (message: string) => void;
};

export const useCakeStore = create<CakeStore>((set) => ({
  spongeColor: "#F5D6A0",
  creamColor: "#FFFFFF",
  strawberryCount: 0,

  strawberryPositions: initialPositions.map(
    (position) => ({ ...position })
  ),

  hasMessagePlate: false,
  message: "",

  setSpongeColor: (color) =>
    set({ spongeColor: color }),

  setCreamColor: (color) =>
    set({ creamColor: color }),

  addStrawberry: () =>
    set((state) => ({
      strawberryCount: Math.min(
        MAX_STRAWBERRIES,
        state.strawberryCount + 1
      ),
    })),

  removeStrawberry: () =>
    set((state) => ({
      strawberryCount: Math.max(
        0,
        state.strawberryCount - 1
      ),
    })),

  moveStrawberry: (index, position) =>
    set((state) => ({
      strawberryPositions: state.strawberryPositions.map(
        (current, i) =>
          i === index
            ? limitPosition(position.x, position.y)
            : current
      ),
    })),

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

  setHasMessagePlate: (enabled) =>
    set({ hasMessagePlate: enabled }),

  setMessage: (message) =>
    set({ message }),
}));
