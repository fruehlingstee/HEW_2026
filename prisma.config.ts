// Prisma 7用。依存導入前でも既存アプリの型チェックを壊さない設定。
// .envファイルは読み込まず、実行環境から渡された接続先のみを使用する。
export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(process.env.DATABASE_URL
    ? { datasource: { url: process.env.DATABASE_URL } }
    : {}),
};
