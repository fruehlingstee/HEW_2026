CREATE TYPE "part_kind" AS ENUM (
  'standard',
  'border_decoration'
);

CREATE TYPE "contains_type" AS ENUM (
  'contains',
  'may_contain'
);

CREATE TYPE "order_status" AS ENUM (
  'pending',
  'confirmed',
  'in_production',
  'ready',
  'completed',
  'cancelled',
  'rejected',
  'expired'
);

CREATE TYPE "hold_status" AS ENUM (
  'active',
  'confirmed',
  'expired',
  'released'
);

CREATE TYPE "payment_status" AS ENUM (
  'creating',
  'pending',
  'failed',
  'succeeded',
  'cancelled',
  'needs_review'
);

CREATE TYPE "webhook_status" AS ENUM (
  'received',
  'processed',
  'ignored',
  'failed',
  'needs_review'
);

CREATE TYPE "refund_status" AS ENUM (
  'queued',
  'processing',
  'succeeded',
  'failed',
  'needs_review'
);

CREATE TABLE "stores" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "code" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "timezone" text NOT NULL,
  "is_active" boolean NOT NULL,
  "address" text,
  "phone" text,
  "business_hours_text" text,
  "pickup_instructions" text,
  "contamination_note" text,
  "min_lead_days" integer NOT NULL CHECK (min_lead_days >= 0),
  "max_advance_days" integer NOT NULL,
  "order_cutoff_time" time NOT NULL,
  "password_hash" text,
  "auth_version" integer NOT NULL DEFAULT 1,
  "password_changed_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "stores_lead_days_check" CHECK (max_advance_days >= min_lead_days)
);

CREATE TABLE "store_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "token_hash" text UNIQUE NOT NULL,
  "auth_version" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz
);

CREATE TABLE "demo_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "token_hash" text UNIQUE NOT NULL,
  "created_at" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz
);

CREATE TABLE "parts" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "name" text NOT NULL,
  "asset_key" text NOT NULL,
  "kind" part_kind NOT NULL,
  "unit_price" integer NOT NULL CHECK (unit_price >= 0),
  "sort_order" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "parts_border_price_check" CHECK (kind <> 'border_decoration' OR unit_price = 20)
);

CREATE TABLE "allergens" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "display_order" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "part_allergens" (
  "part_id" text NOT NULL,
  "allergen_id" text NOT NULL,
  "contains_type" contains_type NOT NULL,
  PRIMARY KEY ("part_id", "allergen_id")
);

CREATE TABLE "designs" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "demo_session_id" text,
  "sponge_color" varchar(7) NOT NULL,
  "cream_color" varchar(7) NOT NULL,
  "message_text" text,
  "message_plate" boolean NOT NULL,
  "version" integer NOT NULL,
  "locked_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "placements" (
  "id" text PRIMARY KEY NOT NULL,
  "design_id" text NOT NULL,
  "part_id" text NOT NULL,
  "seq_no" integer NOT NULL,
  "color" varchar(7),
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "placements_color_check" CHECK (color IS NULL OR color ~ '^#[0-9A-F]{6}$')
);

CREATE TABLE "design_palette_colors" (
  "id" text PRIMARY KEY NOT NULL,
  "design_id" text NOT NULL,
  "color" varchar(7) NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "palette_color_check" CHECK (color ~ '^#[0-9A-F]{6}$')
);

CREATE TABLE "orders" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "design_id" text UNIQUE,
  "is_demo" boolean NOT NULL,
  "demo_session_id" text,
  "pickup_date" date NOT NULL,
  "pickup_sequence" integer,
  "status" order_status NOT NULL,
  "customer_name" text,
  "customer_phone" text,
  "customer_email" text,
  "access_token_hash" text UNIQUE,
  "pii_erased_at" timestamptz,
  "subtotal" integer NOT NULL CHECK (subtotal >= 0),
  "tax_rate_bps" integer NOT NULL CHECK (tax_rate_bps >= 0 AND tax_rate_bps <= 10000),
  "tax" integer NOT NULL CHECK (tax >= 0),
  "total" integer NOT NULL CHECK (total >= 0),
  "design_snapshot" jsonb NOT NULL,
  "allergen_snapshot" jsonb NOT NULL,
  "allergen_confirmed_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "orders_total_check" CHECK (total = subtotal + tax),
  CONSTRAINT "orders_sequence_check" CHECK (pickup_sequence IS NULL OR pickup_sequence BETWEEN 1 AND 999),
  CONSTRAINT "orders_demo_pii_check" CHECK ((is_demo AND demo_session_id IS NOT NULL AND customer_name IS NULL AND customer_phone IS NULL AND customer_email IS NULL AND access_token_hash IS NULL AND pickup_sequence IS NULL AND allergen_confirmed_at IS NULL AND pii_erased_at IS NULL) OR (NOT is_demo AND demo_session_id IS NULL AND pickup_sequence IS NOT NULL AND allergen_confirmed_at IS NOT NULL AND ((pii_erased_at IS NULL AND customer_name IS NOT NULL AND customer_phone IS NOT NULL AND customer_email IS NOT NULL AND access_token_hash IS NOT NULL) OR (pii_erased_at IS NOT NULL AND customer_name IS NULL AND customer_phone IS NULL AND customer_email IS NULL AND access_token_hash IS NULL))))
);

CREATE TABLE "order_items" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL,
  "kind" text NOT NULL,
  "placement_seq_no" integer,
  "name_snapshot" text NOT NULL,
  "asset_key_snapshot" text,
  "color_snapshot" varchar(7),
  "unit_price" integer NOT NULL CHECK (unit_price >= 0),
  "quantity" integer NOT NULL CHECK (quantity > 0),
  "line_total" integer NOT NULL CHECK (line_total >= 0),
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "order_items_total_check" CHECK (line_total = unit_price * quantity),
  CONSTRAINT "order_items_placement_quantity_check" CHECK (placement_seq_no IS NULL OR quantity = 1)
);

CREATE TABLE "order_status_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL,
  "from_status" order_status,
  "to_status" order_status NOT NULL,
  "actor_type" text NOT NULL,
  "actor_id" text,
  "reason" text,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "store_weekly_capacity" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "weekday" integer NOT NULL,
  "capacity_points" integer NOT NULL CHECK (capacity_points >= 0),
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "daily_capacity" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "pickup_date" date NOT NULL,
  "capacity_points" integer NOT NULL CHECK (capacity_points >= 0),
  "is_closed" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "capacity_holds" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "design_id" text NOT NULL,
  "order_id" text UNIQUE,
  "pickup_date" date NOT NULL,
  "points" integer NOT NULL CHECK (points > 0),
  "status" hold_status NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "payments" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text UNIQUE NOT NULL,
  "provider" text NOT NULL,
  "payment_intent_id" text UNIQUE,
  "creation_idempotency_key" text UNIQUE NOT NULL,
  "status" payment_status NOT NULL,
  "amount" integer NOT NULL CHECK (amount >= 0),
  "currency" text NOT NULL,
  "paid_at" timestamptz,
  "cancel_requested_at" timestamptz,
  "cancel_completed_at" timestamptz,
  "next_attempt_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "object_id" text NOT NULL,
  "event_created_at" timestamptz NOT NULL,
  "event_data" jsonb NOT NULL,
  "status" webhook_status NOT NULL,
  "payload_digest" text NOT NULL,
  "attempt_count" integer NOT NULL CHECK (attempt_count >= 0),
  "next_attempt_at" timestamptz,
  "processed_at" timestamptz,
  "error_message" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "refunds" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL,
  "payment_id" text NOT NULL,
  "provider_refund_id" text UNIQUE,
  "idempotency_key" text UNIQUE NOT NULL,
  "reason" text NOT NULL,
  "rate_bps" integer NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  "amount" integer NOT NULL CHECK (amount >= 0),
  "status" refund_status NOT NULL,
  "attempt_count" integer NOT NULL CHECK (attempt_count >= 0),
  "next_attempt_at" timestamptz,
  "lease_expires_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE INDEX ON "store_sessions" ("store_id", "revoked_at", "expires_at");

CREATE INDEX ON "demo_sessions" ("store_id", "expires_at");

CREATE INDEX ON "parts" ("store_id", "sort_order");

CREATE UNIQUE INDEX ON "placements" ("design_id", "seq_no");

CREATE UNIQUE INDEX ON "design_palette_colors" ("design_id", "color");

CREATE UNIQUE INDEX ON "orders" ("store_id", "pickup_date", "pickup_sequence");

CREATE INDEX ON "orders" ("store_id", "pickup_date", "status");

CREATE UNIQUE INDEX ON "order_items" ("order_id", "placement_seq_no");

CREATE UNIQUE INDEX ON "store_weekly_capacity" ("store_id", "weekday");

CREATE UNIQUE INDEX ON "daily_capacity" ("store_id", "pickup_date");

CREATE INDEX ON "capacity_holds" ("store_id", "pickup_date", "status", "expires_at");

CREATE UNIQUE INDEX ON "webhook_events" ("provider", "event_id");

CREATE INDEX ON "webhook_events" ("status", "next_attempt_at");

COMMENT ON TABLE "stores" IS '店舗情報・受付設定・認証。表示列のNULL許容は暫定（DB-09）。';

COMMENT ON COLUMN "stores"."code" IS '店舗共通アカウントのログイン識別子';

COMMENT ON COLUMN "stores"."timezone" IS 'Ver1.0はAsia/Tokyo';

COMMENT ON COLUMN "stores"."address" IS '表示列の必須・任意はDB-09で確認';

COMMENT ON COLUMN "stores"."order_cutoff_time" IS '3日・60日・17:00の仮設定はDEFAULTにしない';

COMMENT ON COLUMN "stores"."password_hash" IS 'bcrypt。未設定時はログイン拒否。公開不可';

COMMENT ON TABLE "store_sessions" IS '店舗認証。生トークン・署名鍵は保存しない。店舗状態とauth_versionも毎回検証する。';

COMMENT ON TABLE "demo_sessions" IS '展示利用者のデモデータをまとめる。寿命と削除制約はDB-03・DB-09。';

COMMENT ON TABLE "parts" IS '登録済みパーツは常に利用可能。在庫・is_activeは設けない。参照中のkind変更拒否は更新処理で保証。';

COMMENT ON TABLE "allergens" IS '企画書のcategoryは値・必要性未確定のため未収録（DB-05）。';

COMMENT ON TABLE "part_allergens" IS 'パーツの原材料情報。土台・クリーム・メッセージプレートの情報源はDB-05。';

COMMENT ON COLUMN "part_allergens"."contains_type" IS '企画書5-Aで定義済み。含む／同一設備を区別';

COMMENT ON TABLE "designs" IS '注文前デザイン。共有・編集用識別子はDB-02の決定後に追加。pending作成と同時にロックし再注文は複製。message_plateは有無をbooleanで表現。';

COMMENT ON COLUMN "designs"."sponge_color" IS '#RRGGBB';

COMMENT ON COLUMN "designs"."cream_color" IS '#RRGGBB';

COMMENT ON TABLE "placements" IS '飾り1個1行。位置・回転・倍率はDB-01が未決のため列を保留。この表だけでは配置を復元できない。パレットへのFKは持たない。';

COMMENT ON COLUMN "placements"."color" IS '外周デコは白を含め必須、通常飾りはNULL。parts.kindとの照合が必要';

COMMENT ON TABLE "design_palette_colors" IS '再利用色。所属店舗はdesigns経由。未使用色は課金対象外。更新には編集権限・ロック・version照合が必要。';

COMMENT ON TABLE "orders" IS '1注文1台。通常はpending、デモはconfirmedで作成。所属店舗・デモsession一致と関連表へのデモ混入防止はDB-04。snapshotの厳密な構造はDB-08。';

COMMENT ON COLUMN "orders"."design_id" IS '作成時必須。保持期限後のデザイン削除でNULL';

COMMENT ON COLUMN "orders"."pickup_date" IS 'JSTの受取営業日';

COMMENT ON COLUMN "orders"."pickup_sequence" IS '通常注文001〜999。表示時にMMDDと結合。上限到達時の処理はDB-09';

COMMENT ON COLUMN "orders"."design_snapshot" IS '表示用。座標は含めない。清掃時はメッセージ等を消去';

COMMENT ON COLUMN "orders"."allergen_snapshot" IS '注文確認時の品目・含有区分・店舗注記';

COMMENT ON TABLE "order_items" IS '配置明細は1個1行。placement_seq_noは清掃後も残す履歴番号なのでplacementsへのFKにしない。明細合計と注文小計はトランザクションで照合。';

COMMENT ON COLUMN "order_items"."kind" IS '役割は確定、全種別の保存文字列はDB-08。未確定enumを作らない';

COMMENT ON COLUMN "order_items"."placement_seq_no" IS '配置明細は元のseq_no、本体・プレート・色料金はNULL';

COMMENT ON COLUMN "order_items"."asset_key_snapshot" IS '上書きしない版付きモデル参照';

COMMENT ON TABLE "order_status_logs" IS '状態変更履歴。店舗共通アカウントからスタッフ個人を識別したとは扱わない。自由文の清掃はDB-03。';

COMMENT ON COLUMN "order_status_logs"."from_status" IS '作成時の初期履歴は遷移前状態なし';

COMMENT ON COLUMN "order_status_logs"."actor_type" IS '保存値・actor_idの扱いはDB-08';

COMMENT ON TABLE "store_weekly_capacity" IS '曜日別の製造枠。初期5ポイントは設定値として投入する。';

COMMENT ON COLUMN "store_weekly_capacity"."weekday" IS '曜日の番号割当はDB-09。勝手に0=日曜と決めない';

COMMENT ON TABLE "daily_capacity" IS '日別の枠上書きと店休日。日別行がない場合も店舗行ロックで枠処理を直列化する。';

COMMENT ON TABLE "capacity_holds" IS '別途migrationでUNIQUE(design_id) WHERE status = activeを追加。通常のUNIQUE(design_id)で代用しない。注文と同じ店舗・design・受取日はDB-04。';

COMMENT ON COLUMN "capacity_holds"."design_id" IS '期限後のNULL許容・削除動作はDB-03';

COMMENT ON COLUMN "capacity_holds"."points" IS '現行5号は1ポイント';

COMMENT ON COLUMN "capacity_holds"."expires_at" IS '仮確保開始から15分';

COMMENT ON TABLE "payments" IS '1注文1Intent。creatingから開始し不明結果でも別Intentを作らない。デモは禁止。返金はrefundsで管理。';

COMMENT ON TABLE "webhook_events" IS '受信の永続化と業務処理完了を区別。業務反映・processed更新を同一トランザクションで行う。';

COMMENT ON COLUMN "webhook_events"."event_data" IS '検証済み復旧用最小データ。秘密値・カード・顧客個人情報を含めない';

COMMENT ON TABLE "refunds" IS '0円の申請も記録。処理中・結果不明の予定額も加味して過剰返金を防ぐ。paymentとorderの対応保証はDB-04。';

ALTER TABLE "store_sessions" ADD FOREIGN KEY ("store_id") REFERENCES "stores" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "demo_sessions" ADD FOREIGN KEY ("store_id") REFERENCES "stores" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "parts" ADD FOREIGN KEY ("store_id") REFERENCES "stores" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "part_allergens" ADD FOREIGN KEY ("part_id") REFERENCES "parts" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "part_allergens" ADD FOREIGN KEY ("allergen_id") REFERENCES "allergens" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "designs" ADD FOREIGN KEY ("store_id") REFERENCES "stores" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "designs" ADD FOREIGN KEY ("demo_session_id") REFERENCES "demo_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "placements" ADD FOREIGN KEY ("design_id") REFERENCES "designs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "placements" ADD FOREIGN KEY ("part_id") REFERENCES "parts" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "design_palette_colors" ADD FOREIGN KEY ("design_id") REFERENCES "designs" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "orders" ADD FOREIGN KEY ("store_id") REFERENCES "stores" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "orders" ADD FOREIGN KEY ("design_id") REFERENCES "designs" ("id") ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "orders" ADD FOREIGN KEY ("demo_session_id") REFERENCES "demo_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_items" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_status_logs" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "store_weekly_capacity" ADD FOREIGN KEY ("store_id") REFERENCES "stores" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daily_capacity" ADD FOREIGN KEY ("store_id") REFERENCES "stores" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "capacity_holds" ADD FOREIGN KEY ("store_id") REFERENCES "stores" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "capacity_holds" ADD FOREIGN KEY ("design_id") REFERENCES "designs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "capacity_holds" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refunds" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refunds" ADD FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") DEFERRABLE INITIALLY IMMEDIATE;
