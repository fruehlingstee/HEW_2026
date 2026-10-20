import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const testGlobal = globalThis as typeof globalThis & {
  cakeCanvasPrisma?: PrismaClient;
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", undefined);
});

afterEach(async () => {
  await testGlobal.cakeCanvasPrisma?.$disconnect();
  delete testGlobal.cakeCanvasPrisma;
  vi.unstubAllEnvs();
});

describe("サーバー用Prisma Client", () => {
  it("DB設定なしでもimportでき、DB利用時にだけ設定不足を通知する", async () => {
    const { getPrisma } = await import("./prisma");

    expect(testGlobal.cakeCanvasPrisma).toBeUndefined();
    expect(getPrisma).toThrow("DATABASE_URLが未設定です");
    expect(testGlobal.cakeCanvasPrisma).toBeUndefined();
  });

  it.each([
    "not-a-url-with-secret",
    "https://user:secret@example.invalid/database",
    "postgresql:///database",
  ])("無効なURLを接続前に拒否し、秘密値をエラーへ含めない: %s", async (value) => {
    vi.stubEnv("DATABASE_URL", value);
    const { getPrisma } = await import("./prisma");

    expect(getPrisma).toThrow(
      new Error("DATABASE_URLは有効なPostgreSQL接続URLにしてください。"),
    );
    expect(testGlobal.cakeCanvasPrisma).toBeUndefined();
  });

  it.each(["postgres", "postgresql"])(
    "%s URLでClientを遅延生成し、モジュール再読み込み後も再利用する",
    async (protocol) => {
      // クエリも$connectも呼ばないため、実DBへの接続は発生しない。
      vi.stubEnv("DATABASE_URL", `${protocol}://test:test@localhost:1/cake_test`);
      const { getPrisma } = await import("./prisma");
      const client = getPrisma();

      expect(getPrisma()).toBe(client);
      vi.resetModules();
      const reloaded = await import("./prisma");
      expect(reloaded.getPrisma()).toBe(client);
    },
  );
});
