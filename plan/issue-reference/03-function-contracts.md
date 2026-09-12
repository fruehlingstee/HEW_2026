# 使用関数定義・契約

Issue 実装時に共有する TypeScript の境界。配置は [02-file-structure.md](./02-file-structure.md)、ルールは [06-business-logic.md](./06-business-logic.md) を参照する。

## 共通型

```ts
export type Result<T, E extends AppError = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type AppError = {
  code:
    | "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "UNAUTHORIZED"
    | "RATE_LIMITED" | "CAPACITY_UNAVAILABLE" | "HOLD_EXPIRED"
    | "INVALID_STATE" | "PAYMENT_FAILED" | "EXTERNAL_SERVICE_ERROR";
  message: string;
  cause?: unknown;
};

export type Money = number;       // 円単位の整数
export type IsoDate = string;     // YYYY-MM-DD、受取営業日は JST
export type UtcDateTime = string; // ISO 8601 / UTC
```

外部入力は Zod で検証する。UI から Prisma・Stripe SDK を直接呼ばず、Server Action / Route Handler 経由にする。

## 検証・価格・日時

```ts
export const designInputSchema: z.ZodType<DesignInput>;
export const placementInputSchema: z.ZodType<PlacementInput>;
export const orderInputSchema: z.ZodType<OrderInput>;

export function calculateQuote(input: {
  basePrice: Money;
  outerDecoPrice?: Money;
  messagePlate: boolean;
  items: Array<{ unitPrice: Money; quantity: number }>;
}): { subtotal: Money; tax: Money; total: Money; lines: QuoteLine[] };

export function calculateTax(subtotal: Money, taxRateBps?: number): Money;
export function getJstBusinessNow(now?: Date): Date;
export function getEarliestPickupDate(now?: Date): IsoDate;
export function aggregateRelevantAllergens(
  parts: Array<{ allergens: AllergenSummary[] }>
): AllergenSummary[];
```

税率は既定 8%（800 bps）、端数切り捨て。価格は注文時にスナップショット化する。`outerDecoPrice` は外周デコ「なし」のとき省略または 0 とする。

## デザイン

```ts
export async function createDesign(input: CreateDesignInput): Promise<Result<Design>>;
export async function savePlacements(
  designId: string,
  placements: PlacementInput[],
  expectedVersion: number
): Promise<Result<Design>>;
export async function lockDesign(
  designId: string,
  tx?: Prisma.TransactionClient
): Promise<Result<LockedDesign>>;
export async function getSharedDesign(shareToken: string): Promise<Result<PublicDesign>>;
```

配置保存は全置換で `seqNo` 重複不可。注文作成後はロックし、共有表示には個人情報を含めない。

## 受取枠・仮押さえ

```ts
export async function listPickupAvailability(input: {
  storeId: string; from: IsoDate; to: IsoDate; now?: Date;
}): Promise<Result<PickupAvailability[]>>;

export async function createCapacityHold(
  input: { storeId: string; pickupDate: IsoDate; points: number; designId: string },
  tx?: Prisma.TransactionClient
): Promise<Result<CapacityHold>>;

export async function releaseExpiredHolds(
  storeId: string, now?: Date, tx?: Prisma.TransactionClient
): Promise<Result<number>>;

export async function confirmCapacityHold(
  holdId: string, orderId: string, tx?: Prisma.TransactionClient
): Promise<Result<void>>;
```

仮押さえは 15 分。空き取得時と注文処理時に期限切れを解放し、確認・解放は冪等にする。

## 注文・トークン

```ts
export async function createPendingOrder(
  input: CreateOrderInput
): Promise<Result<{ order: Order; accessToken: string }>>;

export function generateOrderNumber(input: {
  storeCode: string; pickupDate: IsoDate; pickupSequence: number;
}): string;

export async function allocatePickupSequence(
  storeId: string, pickupDate: IsoDate, tx: Prisma.TransactionClient
): Promise<Result<number>>;

export async function getOrderByAccessToken(rawToken: string): Promise<Result<GuestOrderView>>;
export function generateAccessToken(): string;
export function hashAccessToken(rawToken: string): string;
export async function checkRateLimit(
  key: string, policy: RateLimitPolicy
): Promise<Result<void>>;
```

受取番号は `MMDD-3桁連番`。採番と注文作成は同じトランザクション。アクセストークンは 32 byte 以上の乱数とし、DB にはハッシュだけ保存する。

## 決済・返金・通知

```ts
export async function createPaymentIntentForOrder(
  orderId: string
): Promise<Result<{ clientSecret: string }>>;

export async function handleStripeWebhook(input: {
  eventId: string; rawBody: string; signature: string;
}): Promise<Result<void>>;

export function determineRefund(input: {
  status: OrderStatus; pickupDate: IsoDate; requestedAt: Date; paidAmount: Money;
}): RefundDecision;

export async function executeRefund(
  orderId: string, decision: RefundDecision, idempotencyKey: string
): Promise<Result<Refund>>;

export async function sendOrderEmail(input: {
  orderId: string; template: OrderEmailTemplate;
}): Promise<Result<EmailDelivery>>;
```

Webhook は署名検証後にイベント ID を記録して冪等化する。返金には一意な冪等キーを使う。メール失敗は注文を巻き戻さず送信履歴に残す。

## デモ・保持期限

```ts
export async function createDemoSession(): Promise<Result<DemoSession>>;
export async function resetDemoData(sessionId: string): Promise<Result<void>>;
export async function cleanupExpiredData(now?: Date): Promise<Result<CleanupReport>>;
```

デモは個人情報・決済・本番受取枠を使わない。削除処理は再実行可能にし、財務・監査履歴を残して個人情報だけ匿名化する。

## トランザクション境界

- 期限切れ hold 解放 → 空き判定 → 新規 hold
- 受取連番採番 → 注文・明細作成 → デザインロック
- Webhook 記録 → 注文確定 → hold 確定 → 状態履歴
- 状態変更 → `order_status_logs` 追記
- 返金記録 → 手数料再計算

外部 API を DB トランザクション内で長時間待たない。外部呼び出しと DB 反映を分け、冪等キーと処理状態で再試行可能にする。
