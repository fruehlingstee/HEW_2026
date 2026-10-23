
"use client";

import { create } from "zustand";

// 座標
export type Position = {
  x: number;
  y: number;
};

// 飾りの種類と税抜価格
// 新しい飾りは将来ここへ追加する
export const DECORATION_CATALOG = {
  strawberry: {
    name: "苺",
    price: 200,
  },
  raspberry: {
    name: "ラズベリー",
    price: 120,
  },
  blueberry: {
    name: "ブルーベリー",
    price: 80,
  },
  chocolate_plate: {
    name: "チョコプレート",
    price: 150,
  },
} as const;

export type DecorationType =
  keyof typeof DECORATION_CATALOG;

// 飾り1個分の情報
export type Decoration = {
  id: string;
  type: DecorationType;
  x: number;
  y: number;
};

// ケーキのデザイン
export type CakeDesign = {
  spongeColor: string;
  creamColor: string;
  decorations: Decoration[];
  hasMessagePlate: boolean;
  message: string;
};

// 開発用価格
export const CAKE_PRICE = 3500;
export const MESSAGE_PRICE = 300;

// 初期実装の飾り上限
export const MAX_DECORATIONS = 12;

// SVG上の仮配置座標
const initialPositions: Position[] = [
  { x: 72, y: 78 },
  { x: 104, y: 78 },
  { x: 136, y: 78 },
  { x: 168, y: 78 },
  { x: 72, y: 120 },
  { x: 104, y: 120 },
  { x: 136, y: 120 },
  { x: 168, y: 120 },
  { x: 72, y: 162 },
  { x: 104, y: 162 },
  { x: 136, y: 162 },
  { x: 168, y: 162 },
];

// ケーキからはみ出さないようにする
export function limitPosition(
  x: number,
  y: number
): Position {
  const dx = x - 120;
  const dy = y - 120;

  const distance = Math.hypot(dx, dy);

  const ratio =
    distance > 70 ? 70 / distance : 1;

  return {
    x: Math.round(120 + dx * ratio),
    y: Math.round(120 + dy * ratio),
  };
}

// Zustandで管理する情報
type CakeStore = CakeDesign & {
  setSpongeColor: (color: string) => void;
  setCreamColor: (color: string) => void;

  addDecoration: (type: DecorationType) => void;
  removeDecoration: (id: string) => void;

  moveDecoration: (
    id: string,
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

  decorations: [],

  hasMessagePlate: false,
  message: "",

  // スポンジの色
  setSpongeColor: (color) =>
    set({ spongeColor: color }),

  // クリームの色
  setCreamColor: (color) =>
    set({ creamColor: color }),

  // 飾りを追加
  addDecoration: (type) =>
    set((state) => {
      if (
        state.decorations.length >= MAX_DECORATIONS
      ) {
        return state;
      }

      const index = state.decorations.length;

      const position =
        initialPositions[index] ?? {
          x: 120,
          y: 120,
        };

      const decoration: Decoration = {
        id: crypto.randomUUID(),
        type,
        ...position,
      };

      return {
        decorations: [
          ...state.decorations,
          decoration,
        ],
      };
    }),

  // 指定した飾りを削除
  removeDecoration: (id) =>
    set((state) => ({
      decorations: state.decorations.filter(
        (decoration) => decoration.id !== id
      ),
    })),

  // 指定した飾りだけ移動
  moveDecoration: (id, position) =>
    set((state) => ({
      decorations: state.decorations.map(
        (decoration) =>
          decoration.id === id
            ? {
                ...decoration,
                ...limitPosition(
                  position.x,
                  position.y
                ),
              }
            : decoration
      ),
    })),

  // メッセージプレート
  setHasMessagePlate: (enabled) =>
    set({ hasMessagePlate: enabled }),

  setMessage: (message) =>
    set({ message }),

  // デザイン全体を復元
  restoreDesign: (design) =>
    set({
      spongeColor: design.spongeColor,
      creamColor: design.creamColor,

      decorations: design.decorations.map(
        (decoration) => ({
          ...decoration,
          ...limitPosition(
            decoration.x,
            decoration.y
          ),
        })
      ),

      hasMessagePlate: design.hasMessagePlate,
      message: design.message,
    }),
}));
