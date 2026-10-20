import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  cakeCanvasPrisma?: PrismaClient;
};

/** DBを使うサーバー処理から呼ぶ。import時には設定確認・接続を行わない。 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.cakeCanvasPrisma) {
    return globalForPrisma.cakeCanvasPrisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) {
    throw new Error("DATABASE_URLが未設定です。サーバーの実行環境に設定してください。");
  }

  // URLの解析エラーに接続先やパスワードを含めない。
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URLは有効なPostgreSQL接続URLにしてください。");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname
  ) {
    throw new Error("DATABASE_URLは有効なPostgreSQL接続URLにしてください。");
  }

  const adapter = new PrismaPg({
    connectionString,
    // 1プロセスの接続数を制限し、接続失敗を無期限に待たない。
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  const client = new PrismaClient({ adapter });

  // 開発時の再読み込みやリクエストごとのClient・接続プール増殖を防ぐ。
  globalForPrisma.cakeCanvasPrisma = client;
  return client;
}
