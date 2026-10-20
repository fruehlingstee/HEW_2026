import { defineConfig } from "prisma/config";

// Prisma 7用。
// .envファイルは読み込まず、実行環境から渡された接続先のみを使用する。
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(process.env.DATABASE_URL
    ? { datasource: { url: process.env.DATABASE_URL } }
    : {}),
});
