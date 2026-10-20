# ER 図

列・制約の詳細は [04-database-design.md](./04-database-design.md) を参照する。

2026-10-19: Y回転のみの座標、通常編集セッション・共有ハッシュ、Design清掃時のnullable参照を反映。platform_fees・email_deliveries・rate_limitsは引き続き設計候補であり、DBML・Prismaには未定義。

```mermaid
erDiagram
    stores ||--o{ store_sessions : authenticates
    stores ||--o{ demo_sessions : hosts
    design_edit_sessions o|--o{ designs : edits
    demo_sessions o|--o{ designs : owns_demo
    demo_sessions o|--o{ orders : owns_demo
    stores ||--o{ parts : owns
    stores ||--o{ designs : receives
    stores ||--o{ orders : receives
    stores ||--o{ store_weekly_capacity : configures
    stores ||--o{ daily_capacity : overrides
    stores ||--o{ capacity_holds : reserves

    parts ||--o{ part_allergens : contains
    allergens ||--o{ part_allergens : classifies
    designs ||--o{ placements : contains
    designs ||--o{ design_palette_colors : saves
    parts ||--o{ placements : placed_as
    designs o|--o| orders : becomes
    designs o|--o{ capacity_holds : reserves

    orders ||--|{ order_items : snapshots
    orders ||--o{ order_status_logs : changes
    orders ||--o| capacity_holds : reserves
    orders ||--o| payments : pays
    orders ||--o{ refunds : refunds
    orders ||--o{ platform_fees : calculates
    orders ||--o{ email_deliveries : notifies
    payments ||--o{ refunds : refunded_by
```

## 主な属性

```mermaid
erDiagram
    stores {
      string id PK
      string slug UK
      string code UK
      string name
    }
    parts {
      string id PK
      string store_id FK
      string name
      string asset_key
      string kind
      float footprint_radius_m "required for standard"
      int unit_price
    }
    allergens {
      string id PK
      string code UK
      string name
    }
    part_allergens {
      string part_id PK,FK
      string allergen_id PK,FK
    }
    design_edit_sessions {
      string id PK
      string token_hash UK
      datetime created_at
      datetime expires_at
      datetime revoked_at "nullable"
    }
    designs {
      string id PK
      string store_id FK
      string demo_session_id FK "nullable; exclusive with edit_session_id"
      string edit_session_id FK "nullable; required for non-demo"
      string share_token_hash UK "nullable; read-only sharing"
      string sponge_color
      string cream_color
      string message_text
      int version
      datetime locked_at
    }
    placements {
      string id PK
      string design_id FK
      string part_id FK
      int seq_no
      float pos_x
      float pos_y
      float pos_z
      float rot_y
      float scale
      string color "nullable; required for border_decoration"
    }
    design_palette_colors {
      string id PK
      string design_id FK
      string color
      int sort_order
      datetime created_at
      datetime updated_at
    }
    orders {
      string id PK
      string store_id FK
      string design_id FK,UK
      date pickup_date
      int pickup_sequence
      string status
      int subtotal
      int tax_rate_bps
      int tax
      int total
      json design_snapshot
      json allergen_snapshot
      datetime allergen_confirmed_at
      string access_token_hash UK
    }
    order_items {
      string id PK
      string order_id FK
      string kind
      int placement_seq_no "nullable; unique with order_id"
      string name_snapshot
      string asset_key_snapshot "nullable"
      string color_snapshot "nullable"
      int unit_price
      int quantity
      int line_total
    }
    order_status_logs {
      string id PK
      string order_id FK
      string from_status
      string to_status
      string actor_type
      datetime created_at
    }
    store_weekly_capacity {
      string id PK
      string store_id FK
      int weekday
      int capacity_points
    }
    daily_capacity {
      string id PK
      string store_id FK
      date pickup_date
      int capacity_points
      boolean is_closed
    }
    capacity_holds {
      string id PK
      string store_id FK
      string design_id FK "nullable after cleanup; required while active"
      string order_id FK,UK
      date pickup_date
      int points
      string status
      datetime expires_at
    }
    payments {
      string id PK
      string order_id FK,UK
      string payment_intent_id UK "nullable until created"
      string creation_idempotency_key UK
      string status
      int amount
      string currency
      datetime cancel_requested_at
      datetime cancel_completed_at
      datetime next_attempt_at
      string last_error
    }
    webhook_events {
      string id PK
      string provider
      string event_id "unique with provider"
      string object_id
      datetime event_created_at
      json event_data
      string status
      int attempt_count
      datetime next_attempt_at
      datetime processed_at
    }
    refunds {
      string id PK
      string order_id FK
      string payment_id FK
      string provider_refund_id UK
      string idempotency_key UK
      int amount
      string status
      int attempt_count
      datetime next_attempt_at
      datetime lease_expires_at
      string last_error
    }
    platform_fees {
      string id PK
      string order_id FK
      int basis_amount
      int amount
    }
    email_deliveries {
      string id PK
      string order_id FK
      string dedupe_key UK
      string status
    }
    rate_limits {
      string id PK
      string key_hash
      string scope
      int attempts
      datetime blocked_until
    }
```

## データの流れ

通常Designはedit_session_id、デモDesignはdemo_session_idのどちらか一方を持つ。閲覧用share_token_hashは編集権限と分離する。Design削除では配置・パレットをCASCADE、注文・終端holdからの参照をSET NULLにする。参照中パーツと店舗はRESTRICTで保護する。

`parts.kind`は`standard` / `border_decoration`。配置には種別を重複保存しない。`design_palette_colors(design_id, color)`は複合一意。placements.colorは独立した色コードであり、パレットへの参照線は設けない。パレット編集・削除でも既存配置の色は変わらない。

```mermaid
flowchart LR
    A[店舗・パーツ] --> B[デザイン]
    B --> C[配置]
    B --> D[15分の受取枠hold]
    D --> E[pending注文]
    E --> F[Stripe]
    F --> G[署名検証済Webhook]
    G --> H[confirmed注文]
    H --> I[製造状態履歴]
    H --> J[メール履歴]
    H --> K[返金]
    K --> L[返金後手数料]
```

- `designs : orders = 1 : 0..1`（保持期限処理前）。pending作成と同時にデザインをロックする。座標はロック済みplacements、製造内容の表示値・金額は注文snapshotから取得する。保持期限処理後のnullable参照はDB設計の削除方針に従う。
- 配置付き明細はquantity=1で`placement_seq_no`を元のseq_noに対応させる。`(order_id, placement_seq_no)`は一意。清掃後も明細を保持するため、placementsへの外部キーではなく履歴番号とする。本体・プレート・色追加料金ではNULL。
- `orders : capacity_holds = 1 : 0..1`。決済前は active、成功後は confirmed。
- `parts : allergens = N : M`。使用パーツに関係する項目だけ注文確認・指示書へ表示する。
- Ver1.0は`orders : payments = 1 : 0..1`。同じPaymentIntentを再利用し、試行結果はwebhook_eventsに残す。作成要求は固定冪等キーで復旧する。
- `webhook_events`は(provider, event_id)一意。受信済みと処理完了を区別する。holdの部分一意制約、返金再実行の詳細は[競合処理](09-capacity-payment-concurrency.md)を参照する。
