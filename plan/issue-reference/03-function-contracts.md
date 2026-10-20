# 使用関数定義・契約

Issue 実装時に共有する TypeScript の境界。配置は [02-file-structure.md](./02-file-structure.md)、ルールは [06-business-logic.md](./06-business-logic.md) を参照する。

## 実装前の確認

以下の契約は設計案を含む。外周デコの価格入力、pending作成時の内容固定、予約枠と決済の競合処理は2026-09-28の方式に更新した。共有取得と更新権限の区別等は引き続き[開発着手レビュー](../development-readiness.md)で確認する。未解決の契約を確定仕様として実装しない。

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
  messagePlate: boolean;
  placements: Array<
    | { kind: "standard"; unitPrice: Money; color: null }
    | { kind: "border_decoration"; unitPrice: Money; color: string }
  >;
}): { subtotal: Money; tax: Money; total: Money; lines: QuoteLine[] };

export function calculateTax(subtotal: Money, taxRateBps?: number): Money;
export function getJstBusinessNow(now?: Date): Date;
export function getEarliestPickupDate(now?: Date): IsoDate;
export function aggregateRelevantAllergens(
  parts: Array<{ allergens: AllergenSummary[] }>
): AllergenSummary[];
```

税率は既定 8%（800 bps）、端数切り捨て。価格は注文時にスナップショット化する。

価格入力のplacementsは1個1要素。サーバーが同店舗のpartsを取得し、kindとunitPriceを結合した検証済み入力を作る。クライアントから受信した種別・単価は信頼しない。ここでのkindは計算用の値であり、placementsテーブルの列ではない。

通常飾りは単価の合計、外周デコは現行単価20円×配置個数に加え、正規化したcolorの白以外の異なる色数×50円を計上する。パレットは価格入力に含めない。QuoteLineは通常飾り・外周デコ本体・色追加料金を区別し、同じ配置を二重集計しない。

## デザイン

2026-10-19の採用方針: 通常編集はdesign_edit_sessionsのCookie認証とDesignのedit_session_id一致を必須とし、共有URLだけでは更新・注文開始を許可しない。デモは既存demo sessionを使う。以下の関数引数に秘密値を追加せず、サーバー側で認証済みコンテキストを解決してから操作する。まだ認可処理は実装されていない。

PlacementInputはposX/posY/posZ/rotY/scale/seqNoを持つ。m単位、上面中心原点、Y上向き、12時-Z・3時+X。rotYはラジアン、0以上2π未満へ正規化し全数値の有限性を検証する。苺PoCはposY=0・scale=1、通常飾りの範囲は登録済み実測半径込みで確認する。保存配列のseqNoは1〜Nと一致させ、編集中は再採番可、注文後は固定する。

getSharedDesignはshareTokenのSHA-256と共有有効状態・Design保持期限を照合する。公開DTOは表示項目だけを選択し、編集セッション・ハッシュ・顧客情報を含めない。共有停止はハッシュをNULL、再発行は置換し、古いURLを無効化する。

```ts
export async function createDesign(input: CreateDesignInput): Promise<Result<Design>>;
export async function savePlacements(
  designId: string,
  placements: PlacementInput[],
  expectedVersion: number
): Promise<Result<Design>>;
export async function lockDesign(
  designId: string,
  expectedVersion: number,
  tx: Prisma.TransactionClient
): Promise<Result<LockedDesign>>;
export async function getSharedDesign(shareToken: string): Promise<Result<PublicDesign>>;

export async function saveDesignPalette(
  designId: string,
  colors: string[],
  expectedVersion: number
): Promise<Result<Design>>;
```

配置保存は全置換で `seqNo` 重複不可。pending注文作成と同じトランザクションでロックし、共有表示には個人情報を含めない。lockDesignは注文サービス内部から呼び、単独の公開更新操作にしない。色・メッセージ・配置・パレットの全更新で親Designのロック、locked_atとversionの照合を行う。

PlacementInputに`color: string | null`を追加する。種別はpartIdから解決し、外周デコには色必須、通常飾りにはNULLを要求する。色は大文字の`#RRGGBB`へ正規化する。

saveDesignPaletteは再利用色の一覧を全置換し、配列順をsort_orderに保存する。正規化後の同色は重複登録しない。更新は編集権限・ロック・expectedVersionを検証し、パレット置換とdesign.versionの加算を同一トランザクションで行う。placements.colorは変更しない。配置更新も同じversionを使うため、競合時は最新状態を再取得する。パレット上限は未確定。

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
  holdId: string, orderId: string, tx: Prisma.TransactionClient
): Promise<Result<void>>;
```

仮押さえは 15 分。空き取得時と注文処理時に期限切れを解放し、確認・解放は冪等にする。

createCapacityHoldのpointsはVer1.0では1以外を拒否する。txを省略した更新関数は自分でトランザクションと店舗ロックを取得し、txを渡す場合は呼出元が店舗ロックを先に取得する。confirmCapacityHoldは決済処理内部のみで呼び、期限内active holdと同じ店舗・日付・design・orderの対応を検証する。期限切れはHOLD_EXPIREDで返し、決済サービスが返金要求保存へ分岐する。期限解放は店舗ロック後に関連pending注文・履歴も同時更新する。nowはテスト用注入値であり外部入力に公開せず、本番はロック取得後のDB時刻を使用する。

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

CreateOrderInputはdesignId、expectedDesignVersion、holdId、顧客入力と、確認画面の内容を識別するconfirmationDigestを含む。digestはサーバーが正規化したデザインversion・受取日・価格明細・税率・合計・表示アレルゲン・店舗注記から生成する。クライアント申告の価格や同意時刻を保存値として信頼しない。

createPendingOrderはサーバー側で内容を再取得・再計算し、version・digestが一致しなければCONFLICTで再確認へ戻す。同意操作を検証してallergen_confirmed_atをサーバー時刻で記録する。Designとマスタの整合した読み取り、snapshot保存、lockDesignを同じDBトランザクションで行う。マスタの同時変更でも混在した見積もりを保存しない分離レベル・ロック方式を実装時に検証する。

同一designへの重複注文はorders.design_idの一意性で防ぎ、新規作成として成功させない。復帰時は認可済みの既存pending注文を取得する。トークン生値はDBから復元しない。期限切れ・キャンセル後の再注文はデザインを複製して行う。詳細な保存項目はDB設計の「注文内容を固定する契約」を参照する。

## 決済・返金・通知

```ts
export async function createPaymentIntentForOrder(
  orderId: string
): Promise<Result<{ clientSecret: string }>>;

export async function handleStripeWebhook(input: {
  rawBody: string; signature: string;
}): Promise<Result<void>>;

export async function processStoredWebhook(eventId: string): Promise<Result<void>>;
export async function retryPendingPaymentWork(): Promise<Result<void>>;

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

handleStripeWebhookは署名検証済み本文からevent IDを取り出してreceivedを永続化する。成功は受信保存の成功であり、注文確定の完了とは限らない。processStoredWebhookはDB上の未処理・失敗イベントを処理し、業務更新・通知/返金予約・processed更新を同一トランザクションで行う。retryPendingPaymentWorkはサーバー内部の定期・手動再実行で、イベント・返金・Intent作成/取消の未完了を照合して復旧する。外部APIをDBロック中に呼ばない。詳細は[競合処理](09-capacity-payment-concurrency.md)を参照する。

## デモ・保持期限

```ts
export async function createDemoSession(): Promise<Result<DemoSession>>;
export async function resetDemoData(sessionId: string): Promise<Result<void>>;
export async function cleanupExpiredData(now?: Date): Promise<Result<CleanupReport>>;
```

デモは個人情報・決済・本番受取枠を使わない。削除処理は再実行可能にし、財務・監査履歴を残して個人情報だけ匿名化する。

## トランザクション境界

- 期限切れ hold 解放 → 空き判定 → 新規 hold
- デザイン・確認内容・有効hold検証 → 受取連番採番 → pending注文・明細・snapshot作成 → hold関連付け → デザインロック → 初期状態履歴（同一トランザクション）
- Webhook受信保存（独立した短いトランザクション）
- 保存済みWebhook処理 → payment更新 → 注文/hold確定または期限切れと返金予約 → 状態履歴・通知予約 → processed更新（同一トランザクション）
- 状態変更 → `order_status_logs` 追記
- 返金要求・予定額確保 → コミット後に外部返金 → 別トランザクションで結果保存・成功額に基づく手数料再計算

外部 API を DB トランザクション内で長時間待たない。外部呼び出しと DB 反映を分け、冪等キーと処理状態で再試行可能にする。
