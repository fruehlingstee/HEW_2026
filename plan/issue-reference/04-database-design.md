# DB 設計

PostgreSQL（Neon）と Prisma を使用する。金額は円単位の `Int`、DB 日時は `timestamptz` / UTC、受取営業日は JST 基準の `date` とする。

## 共通方針

- 店舗データは必ず `store_id` を持ち、検索条件にも含める。
- 監査対象は `created_at`、`updated_at` を持つ。
- 注文時の名称・価格・税・色・メッセージ・アレルゲンはスナップショット保存する。
- 状態は Prisma enum、遷移可否はアプリケーション層でも検証する。
- JSON は表示用スナップショットなど、検索・更新の中心でない用途に限る。

## テーブル

### stores

店舗・テナントの基点。主な列は `id`, `slug`, `code`, `name`, `timezone`, `is_active`。slug と code は一意。

### parts / allergens / part_allergens

- `parts`: `store_id`, `category`, `name`, `asset_key`, `unit_price`, `sort_order`, `is_active`
- `parts.category`: `decoration`(3D配置する飾り) / `outer_deco`(外周デコ)。Prisma enum とする
- `allergens`: `code`, `name`
- `part_allergens`: `part_id`, `allergen_id` の複合主キー
- Index: `parts(store_id, category, is_active, sort_order)`
- 在庫数は管理せず、登録済みパーツは利用可能とみなす。

### designs / placements

- `designs`: `store_id`, `outer_deco_part_id`, `sponge_color`, `cream_color`, `message_text`, `message_plate`, `version`, `locked_at`, `share_token_hash`
- `designs.outer_deco_part_id`: nullable な `parts` への参照。NULL は「外周デコなし」。座標を持たないため `placements` には入れない
- `placements`: `design_id`, `part_id`, `seq_no`, position XYZ、rotation XYZ、`scale`
- 制約: `placements(design_id, seq_no)` 一意
- 色は `#RRGGBB`。注文後は `locked_at` を設定して変更不可。

### orders / order_items / order_status_logs

- `orders`: `store_id`, `design_id`, `pickup_date`, `pickup_sequence`, `status`, 顧客情報、`access_token_hash`, `subtotal`, `tax`, `total`, `allergen_snapshot`, `allergen_confirmed_at`
- `order_items`: `order_id`, `kind`, `name_snapshot`, `unit_price`, `quantity`, `line_total`
- `order_items.kind`: `base` / `outer_deco` / `decoration` / `message_plate`
- `order_status_logs`: `order_id`, `from_status`, `to_status`, `actor_type`, `actor_id`, `reason`, `created_at`
- 一意: `orders.design_id`, `orders(store_id, pickup_date, pickup_sequence)`, `orders.access_token_hash`
- Index: `orders(store_id, pickup_date, status)`
- 受取番号 `MMDD-3桁連番` は date と sequence を別々に保存して表示時に組み立てる。

### store_weekly_capacity / daily_capacity / capacity_holds

- `store_weekly_capacity`: `store_id`, `weekday`, `capacity_points`
- `daily_capacity`: `store_id`, `pickup_date`, `capacity_points`, `is_closed`
- `capacity_holds`: `store_id`, `design_id`, `order_id`, `pickup_date`, `points`, `status`, `expires_at`
- 一意: `(store_id, weekday)`, `(store_id, pickup_date)`, nullable な `capacity_holds.order_id`
- Index: `capacity_holds(store_id, pickup_date, status, expires_at)`
- 5号 = 1 point、既定 1日 5 points、hold は 15 分。

### payments / webhook_events

- `payments`: `order_id`, `provider`, `payment_intent_id`, `status`, `amount`, `paid_at`
- `webhook_events`: `provider`, `event_id`, `event_type`, `status`, `payload_digest`, `processed_at`, `error_message`
- 一意: `payment_intent_id`, `(provider, event_id)`

### refunds / platform_fees

- `refunds`: `order_id`, `payment_id`, `provider_refund_id`, `idempotency_key`, `reason`, `rate_bps`, `amount`, `status`
- `platform_fees`: `order_id`, `basis_amount`, `rate_bps`, `amount`, `calculated_at`
- `idempotency_key` と `provider_refund_id` は一意。

### email_deliveries / rate_limits

- `email_deliveries`: `order_id`, `template`, `recipient_hash`, `dedupe_key`, `provider_message_id`, `status`, `attempt_count`, `last_error`, `sent_at`
- `dedupe_key` は一意。失敗を記録し再送可能にする。
- `rate_limits`: `key_hash`, `scope`, `window_started_at`, `attempts`, `blocked_until`
- 生 IP・生トークンは保存しない。

## 注文状態

```text
pending
  ├─ confirmed → in_production → ready → completed
  ├─ expired
  ├─ cancelled
  └─ rejected

confirmed / in_production / ready
  ├─ cancelled
  └─ rejected
```

## 競合制御

1. 空き判定前に期限切れ hold を解放する。
2. 店舗・日付単位でロックし、確定注文 + 有効 hold + 新規 1 point が上限以下か判定する。
3. 受取連番は店舗・日付単位で排他的に採番し、一意制約違反時だけ安全に再試行する。
4. Webhook イベント ID の一意制約を冪等性の最終防衛線にする。
5. 状態更新は期待する現在状態を WHERE 条件に含める。

## 保持期限

- 未注文デザイン: 最終更新から 7 日後に削除。
- 注文済みデザイン: 受取日 30 日後に配置・共有情報を削除。
- 氏名・メール・アクセストークン: 保持期限後に匿名化または破棄。
- 金額・決済・返金・手数料・状態履歴: 会計・監査期間は保持。
- デザイン削除後も財務履歴を残すため、保持期限処理では `orders.design_id` を nullable / `SET NULL` とする。
- 画像印刷を採用するまでは顧客画像用の列・テーブルを作らない。
