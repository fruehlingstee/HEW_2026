# DB 設計

PostgreSQL（Neon）と Prisma を使用する。金額は円単位の `Int`、DB 日時は `timestamptz` / UTC、受取営業日は JST 基準の `date` とする。

## 実装前の確認

2026-10-15: 採用済み部分を[database.dbml](../../database.dbml)に整理した。dbdiagram.ioへ貼り付けるための部分設計であり、実DBへ適用する完成DDLではない。座標・共有権限等の未決項目、保留したテーブル、暫定的な型・NULL許容は[DB-01〜DB-09](../open-questions.md#dbml作成で具体化した未決事項2026-10-15)で追跡する。

外周デコの保存形式、pending注文作成時の内容固定、予約枠と決済の競合処理は2026-09-28に本チャットで整理した構成に更新した。パーツの提供可否は現行仕様に合わせて削除済み。配置のXYZ回転、共有・編集権限は引き続き[開発着手レビュー](../development-readiness.md)の確認対象。未解決の項目を確定Prismaモデルへ変換しない。

## 共通方針

- 店舗データは必ず `store_id` を持ち、検索条件にも含める。
- 監査対象は `created_at`、`updated_at` を持つ。
- pending注文作成時に名称・価格・税率・色・メッセージ・アレルゲンをスナップショット保存し、同時にデザインと配置をロックする。決済成功後にマスタから作り直さない。
- 状態は Prisma enum、遷移可否はアプリケーション層でも検証する。
- JSON は表示用スナップショットなど、検索・更新の中心でない用途に限る。

## テーブル

### stores

店舗・テナントの基点。主な列は `id`, `slug`, `code`, `name`, `timezone`, `is_active`。slug と code は一意。

2026-09-28、店舗設定・認証の保存項目を補完する。

| 列 | 用途・制約 |
|---|---|
| address / phone | 店舗の住所・電話。購入者の住所ではない |
| business_hours_text / pickup_instructions | 営業時間の表示文・受取案内。時間帯別の予約枠には使用しない |
| contamination_note | 原材料・同一設備についての店舗注記。注文時にallergen_snapshotへコピーする |
| min_lead_days | 最短受付日までの日数。整数、0以上 |
| max_advance_days | 受付可能な将来日数。整数、min_lead_days以上 |
| order_cutoff_time | 店舗時間の締切時刻（time型）。Ver1.0はAsia/Tokyoで判定 |
| password_hash | bcryptハッシュ。平文パスワードは保存しない。未設定時はNULLとしログインを拒否 |
| auth_version | セッションの一括失効用整数。初期値1。パスワード変更・店舗停止・全端末ログアウトで加算 |
| password_changed_at | パスワード設定・変更のUTC時刻。未設定時はNULL |

店舗ログインの識別子は既存の一意なcodeを使う。Ver1.0は店舗共通アカウントとし、スタッフ個人のusersテーブルは作らない。操作者履歴は店舗アカウント単位であり、個人を識別できるとは扱わない。

受取可能日は、JSTの当日を基点とし、締切時刻以上なら基点を翌日にずらしてmin_lead_daysを加える。上限はJST当日+max_advance_days、両端を含む。店休日・枠数はその範囲へ別途適用する。開発用の初期値案は3日・60日・17:00（店舗合意前の仮値）。新しい設定は新規受付へ適用し、既存注文の日付を変更しない。

公開する店舗情報は必要な表示列だけを明示選択する。password_hash、auth_version、password_changed_atやセッション情報を公開DTO・ログへ含めない。認証設定の更新は通常の店舗表示設定更新と分け、入力の一括代入で上書きできないようにする。

### store_sessions

- `id`, `store_id`, `token_hash`, `auth_version`, `created_at`, `expires_at`, nullableな`revoked_at`。
- token_hashは一意。Index: `(store_id, revoked_at, expires_at)`。Cookieには32byte以上のランダム秘密値を署名して格納し、DBにはそのハッシュだけを保存する。署名鍵はDBに保存しない。
- リクエストごとに署名・期限・revoked_at・店舗のis_active・stores.auth_versionとの一致を検証し、DBで解決したstore_idでデータ操作を制限する。URLやフォームのstore_idだけで権限を決めない。
- ログアウトは対象sessionを失効させてCookieを削除する。パスワード変更はhash更新とauth_version加算を同じトランザクションで行い、変更前の認証情報で発行したsessionを使えなくする。
- ログイン時はパスワード照合後、session保存前にも店舗状態とauth_versionが変わっていないことを確認する。署名付きCookieだけで失効を管理せず、DBの期限・失効状態を正とする。
- CookieはHttpOnly、HTTPSではSecure、SameSite=Lax、Path=/、Domainなし。変更操作にはOrigin検証等のCSRF対策を適用する。ログインをrate_limitsの独立scopeで制限する。具体的な寿命・試行回数・bcryptコストは#52の認証実装で決めて検証する。
- 期限・失効・Cookie属性の基準は[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)を参照。今回は設計のみで、認証パッケージや秘密値は追加していない。

### demo_sessions

- `id`, `store_id`, `token_hash`, `created_at`, `expires_at`, nullableな`revoked_at`。token_hashは一意。Index: `(store_id, expires_at)`。
- 店舗管理用sessionとは別の、展示利用者のデータをまとめるセッション。サーバー側のデモ有効設定と対象店舗を確認して発行する。秘密値は32byte以上の乱数とし、DBはハッシュのみ、ブラウザには専用HttpOnly Cookieで保持する。
- 一般利用者のリセット・疑似注文・照会は有効なdemo sessionの所有データだけを対象にする。sessionIdだけでは認可しない。展示終了後の全件清掃は店舗管理権限の別操作。
- expires_atとrevoked_atを毎回検証する。展示用の寿命は#62で設定する。リセットは先にsessionを失効し、同一トランザクションで配下のデモ注文・明細・状態履歴・デザイン・配置・パレットを削除する。共有マスタ・通常注文を削除せず、再実行は安全に完了する。作成処理も同じdemo sessionをロックして失効と競合させない。
- マルチテナントの複合外部キーと一般の削除制約は次の設計項目で確定する。

### parts / allergens / part_allergens

- `parts`: `store_id`, `name`, `asset_key`, `kind`, `unit_price`, `sort_order`
- `kind`: `standard`（通常飾り）/ `border_decoration`（外周デコ）。種別はpartsだけに保持し、placementsには重複保存しない。参照中パーツの種別変更は拒否し、別種別は新しいパーツとして登録する。
- 外周デコの`unit_price`は現行仕様の20円（税抜）。色追加料金はパーツ単価に含めず、デザイン全体で計算する。
- `allergens`: `code`, `name`
- `part_allergens`: `part_id`, `allergen_id` の複合主キー
- Index: `parts(store_id, sort_order)`
- 通常飾り・外周デコとも在庫数・提供可否は管理せず、登録済みパーツは常に利用可能とする。parts.is_activeは設けず、パーツ一覧や見積もりで提供可否による絞り込みを行わない。店舗の有効状態を表すstores.is_activeとは区別する。
- 注文時の内容は以下のスナップショットとロック済み配置で維持する。参照中パーツの削除制約は削除方針の整理時に確定する。提供可否の削除を、参照中パーツの削除許可とは扱わない。

### designs / placements / design_palette_colors

- `designs`: `store_id`, nullableな`demo_session_id`, `sponge_color`, `cream_color`, `message_text`, `message_plate`, `version`, `locked_at`, `share_token_hash`
- demo_session_idがあるデザインはデモ専用とし、通常注文へ流用しない。所属店舗をdemo_sessionsと一致させる。未注文デモデザインもsession単位の清掃対象になる。
- `placements`: `design_id`, `part_id`, `seq_no`, position XYZ、rotation XYZ、`scale`, nullableな`color`
- 制約: `placements(design_id, seq_no)` 一意
- 色は `#RRGGBB`。pending注文作成と同一トランザクションで`locked_at`を設定し、色・メッセージ・配置・パレットの更新を拒否する。
- 通常飾りと外周デコは同じplacementsへ1個1行で保存する。`seq_no`は種別をまたいでデザイン内で一意。
- 外周デコの`color`は白を含め必須、通常飾りではNULL。色は大文字の`#RRGGBB`へ正規化する。保存時にサーバーが参照先parts.kindと照合する（別テーブルの種別との整合はcolor単体のCHECKでは保証しない）。
- `design_palette_colors`: `id`, `design_id`, `color`, `sort_order`, `created_at`, `updated_at`。`design_id`はdesigns参照、`(design_id, color)`は一意。色の形式・正規化はplacementsと共通。
- パレットはデザイン所属とし、所有店舗はdesigns経由で検証する。デザイン削除時にパレットも削除する。
- placements.colorは色コード自体を保存し、パレットへの外部キーを持たない。パレットの削除・色変更で既存配置の色を変えず、既存配置の色変更は明示的な配置更新で行う。
- パレット更新にもデザインの編集権限・ロック・versionによる競合検証を適用する。
- 課金は実配置だけを集計する。外周デコの個数×20円と、実使用の白（`#FFFFFF`）以外の異なる色数×50円を加算する。パレットの登録数や未使用色は課金しない。
- プリセットは適用時にplacementsへ展開する。形・プリセット内容・置換方法・パレット上限・配置範囲・通常飾り上限12個との関係は別途確定する。

### orders / order_items / order_status_logs

- `orders`: `store_id`, `design_id`, `is_demo`, nullableな`demo_session_id`, `pickup_date`, nullableな`pickup_sequence`, `status`, nullableな`customer_name`, `customer_phone`, `customer_email`, `access_token_hash`, `pii_erased_at`, `subtotal`, `tax_rate_bps`, `tax`, `total`, `design_snapshot`, `allergen_snapshot`, nullableな`allergen_confirmed_at`
- `order_items`: `order_id`, `kind`, nullableな`placement_seq_no`, `name_snapshot`, nullableな`asset_key_snapshot`, nullableな`color_snapshot`, `unit_price`, `quantity`, `line_total`
- `order_status_logs`: `order_id`, `from_status`, `to_status`, `actor_type`, `actor_id`, `reason`, `created_at`
- 一意: `orders.design_id`, `orders(store_id, pickup_date, pickup_sequence)`, `orders.access_token_hash`
- Index: `orders(store_id, pickup_date, status)`
- 受取番号 `MMDD-3桁連番` は date と sequence を別々に保存して表示時に組み立てる。

#### 通常注文・デモ・匿名化の区別

- is_demoはサーバーが決定し、通常注文APIでのクライアント指定を受け付けない。作成後にモード・demo_session_idを変更しない。
- 通常注文はis_demo=false、demo_session_id=NULL。作成時は氏名・電話・メール・access_token_hash・pickup_sequence・allergen_confirmed_atを必須とする。
- 個人情報清掃後はcustomer_name / customer_phone / customer_email / access_token_hashをNULLにし、pii_erased_atを記録する。通常注文の番号・金額は残す。NULL許容を通常注文作成時の入力任意と混同しない。
- デモ注文はis_demo=true、同店舗のdemo_session_id必須、designも同じsessionに所属する。顧客情報・access_token_hash・pickup_sequence・allergen_confirmed_at・pii_erased_atはNULL。偽の氏名やメールを保存しない。これらの同一行内条件はDBのCHECK制約にも反映する。
- デモのpickup_dateは展示用の日付、金額は見積表示用として保持し、画面・指示書にデモと明示する。表示番号は`DEMO-内部ID`とし、通常の受取連番を消費しない。氏名欄は画面側で「デモ」と表示する。
- デモは専用サービスで直接confirmedと初期履歴を作成し、snapshot保存とDesignロックを同じトランザクションで行う。通常注文のpending/hold/決済経路を呼ばない。
- デモにはcapacity_holds / payments / refunds / platform_fees / email_deliveriesを作らない。各サービスもis_demoを検査して拒否し、予約枠・売上・返金・手数料の集計から除外する。DBでの表をまたぐ保証方式は参照制約の項目で確定する。
- 清掃前のデモには自由入力の個人情報も残さないよう、メッセージは展示用の定型候補に限定する。デモの自由文入力・本番への変換は現行の個人情報を扱わない要件の対象外。

#### 注文内容を固定する契約（2026-09-28）

- 編集用座標の正本は正規化したplacements。pending作成時に親Designをロックし、全編集経路で同じ親行のロックとversion照合を使用する。配置の保存と注文作成が競合しても、検証した内容と固定した内容を一致させる。
- `design_snapshot`は表示用JSON。`schemaVersion`、5号のサイズ情報、`spongeColor`、`creamColor`、`messagePlate`、`messageText`、プレート使用時の書体識別子を保存する。座標をJSONへ二重保存しない。
- 通常飾り・外周デコのorder_itemsは配置1個につき1行、quantity=1とし、`placement_seq_no`を元のseq_noに一致させる。`(order_id, placement_seq_no)`を一意にする。種別・名称・色・モデル参照・単価は注文時の値を保存する。ここでのkindは履歴であり、編集用placementsへの種別重複保存とは異なる。
- 本体・メッセージプレート・色追加料金の明細は`placement_seq_no`をNULLにする。色追加料金は実使用の白以外の色ごとに1行、color_snapshotに対象色、unit_price=50、quantity=1を保存する。パレットだけの色は明細を作らない。
- `asset_key_snapshot`は内容を上書きしない版付きモデル参照とする。保存期間中の旧モデルを保持し、マスタのasset_key変更で過去注文の形状を変えない。
- `allergen_snapshot`には確認時に表示した品目・含有区分・店舗注記を保存する。名前や価格を含め、注文表示・製造指示書は現在のpartsマスタから再構築しない。座標はロック済みplacements、表示仕様は各snapshotを使用する。
- pending作成時にサーバーで金額を再計算する。購入者が確認した金額・アレルゲンと変わっていた場合は再確認を要求し、そのリクエストでは注文を作らない。確認対象の識別方法は関数契約を参照する。
- デザイン検証・有効holdとの対応確認・採番・注文/明細/snapshot作成・holdと注文の関連付け・デザインロック・初期状態履歴を同一トランザクションで確定する。一部が失敗すれば全体をロールバックする。
- PaymentIntentはDBコミット後に保存済みorders.totalを使って作成する。通常注文のconfirmedへの遷移は署名検証済み決済成功Webhookで行い、snapshotや価格は変更しない。デモ経路は別扱い。
- 決済失敗でも有効なholdとpending注文が残る間は同じ注文の支払いを再試行できる。新しい注文やデザインを重複作成しない。期限切れ・キャンセル後の再注文や内容変更は新しいDesignへ複製し、価格・枠・アレルゲンを再確認する。元のlocked_atは解除せず、orders.design_idの一意性を維持する。
- ロックは通常の編集を禁止するもの。受取日30日後の清掃ではdesign_snapshotのメッセージ等も消去し、配置・共有・個人情報の保持期限を延ばさない。財務明細を残すため、清掃後のplacement_seq_noは履歴番号として保持し、placementsへの削除を妨げる外部キーにはしない。

### store_weekly_capacity / daily_capacity / capacity_holds

- `store_weekly_capacity`: `store_id`, `weekday`, `capacity_points`
- `daily_capacity`: `store_id`, `pickup_date`, `capacity_points`, `is_closed`
- `capacity_holds`: `store_id`, `design_id`, `order_id`, `pickup_date`, `points`, `status`, `expires_at`
- 一意: `(store_id, weekday)`, `(store_id, pickup_date)`, nullable な `capacity_holds.order_id`
- Index: `capacity_holds(store_id, pickup_date, status, expires_at)`
- 5号 = 1 point、既定 1日 5 points、hold は 15 分。
- hold状態はactive / confirmed / expired / released。同一designのactive holdは1件までとする部分一意indexをmigration SQLで定義する。詳細は[競合処理](09-capacity-payment-concurrency.md)を参照。

### payments / webhook_events

- `payments`: `order_id`, `provider`, nullableな`payment_intent_id`, `creation_idempotency_key`, `status`, `amount`, `currency`, `paid_at`, `cancel_requested_at`, `cancel_completed_at`, `next_attempt_at`, `last_error`
- Ver1.0は1注文1PaymentIntentを再利用する。作成前はstatus=creatingとしてIntent IDのNULLを許容し、API結果不明時に別Intentを作らない。statusはcreating / pending / failed / succeeded / cancelled / needs_review。返金状態はrefundsで別管理する。
- `webhook_events`: `provider`, `event_id`, `event_type`, `object_id`, `event_created_at`, `event_data`, `status`, `payload_digest`, `attempt_count`, `next_attempt_at`, `processed_at`, `error_message`
- event_dataは検証済みの復旧用最小JSON。秘密値・カード情報・顧客個人情報は保存しない。statusはreceived / processed / ignored / failed / needs_review。
- 一意: `payments.order_id`, `payment_intent_id`, `creation_idempotency_key`, `(provider, event_id)`。再実行用Index: `webhook_events(status, next_attempt_at)`。

### refunds / platform_fees

- `refunds`: `order_id`, `payment_id`, nullableな`provider_refund_id`, `idempotency_key`, `reason`, `rate_bps`, `amount`, `status`, `attempt_count`, `next_attempt_at`, `lease_expires_at`, `last_error`
- statusはqueued / processing / succeeded / failed / needs_review。外部API成功が不明な状態も返金予定額に含め、同じrefund行で照合・再実行する。返金不可の申請（amount=0）は外部APIを呼ばず、理由を記録して完了扱いとする。
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

実行契約は[予約枠・決済の競合処理](09-capacity-payment-concurrency.md)を正とする。

1. Ver1.0は店舗行をFOR UPDATEでロックしてから期限切れhold解放・枠再計算・確保を行う。日別設定行がない場合もこのロックを使う。
2. 枠は非デモのconfirmed / in_production / ready / completed注文と、activeかつ期限内のholdだけを数える。確定holdとの二重集計はしない。
3. 採番は同じ店舗ロック内で対象日の全注文を基に行う。状態更新は期待する現在状態をWHERE条件に含める。
4. 期限切れ・取消後の成功決済は注文を復活させず、全額返金要求を保存する。返金APIはDBコミット後に実行する。
5. Webhook受信を永続化してから応答し、再実行処理が業務反映とprocessed更新を同一トランザクションで行う。単にevent IDが存在することを完了扱いにしない。

## 保持期限

- 未注文デザイン: 最終更新から 7 日後に削除。
- 注文済みデザイン: 受取日 30 日後に配置・共有情報を削除。
- 氏名・メール・アクセストークン: 保持期限後に匿名化または破棄。
- 金額・決済・返金・手数料・状態履歴: 会計・監査期間は保持。
- デザイン削除後も財務履歴を残すため、保持期限処理では `orders.design_id` を nullable / `SET NULL` とする。
- 画像印刷を採用するまでは顧客画像用の列・テーブルを作らない。
