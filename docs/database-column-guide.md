# CakeCanvas テーブル・カラム一覧

作成日: 2026-10-15  
対象: [database.dbml](../database.dbml)に定義した18テーブル。各カラムをDBMLと同じ順序で記載する。

この資料は現在の部分設計を説明する辞書であり、実DBの作成済み一覧ではない。未決事項は[DB-01〜DB-09](../plan/open-questions.md#dbml作成で具体化した未決事項2026-10-15)で管理する。DBMLにない座標列・共有権限列・保留中のテーブルは、確定したものとして追加しない。

## 読み方・共通用語

テーブルは同じ種類のデータを集める表、行は1件のデータ、カラムはそのデータの項目を表す。

| 表記・単語 | 意味 |
|---|---|
| `id` | identifier（識別子）。その行を一意に識別する内部ID。原則としてアプリでCUIDという文字列IDを生成する |
| 主キー（PK） | 行を一意に識別する列。複数列を組み合わせる場合もある |
| 外部キー（FK） | 別テーブルの行を参照する列。参照先が存在することをDBで保証する |
| 一意（UNIQUE） | 同じ値の重複を禁止する制約。複数列の組み合わせにも設定できる |
| `NULL`可 | DB上で「値がない」状態を保存できる。業務上、入力を省略できるとは限らない |
| `text` | 文字列。`varchar(7)`は最大7文字の文字列 |
| `integer` | 整数。金額は小数を使わず円単位で保存する |
| `boolean` | 真偽値。`true`は該当する・有効、`false`は該当しない・無効 |
| `timestamptz` | 時点を表す日時。UTCを基準に保存し、画面では必要に応じて日本時間へ変換する |
| `date` / `time` | 日付のみ／時刻のみ。受取日はJSTの暦日として扱う |
| `jsonb` | 複数の項目をまとめたJSONデータ。ここでは主に注文時の表示内容やイベント復旧情報に使う |
| enum | 許された文字列の中から1つを保存する型。値一覧は末尾に記載 |
| `*_id` | 対象を識別するID。すべてが外部キーとは限らず、外部サービスのIDや未確定の操作者IDもある |
| `*_at` | 何かが起きた日時。`created_at`は作成、`updated_at`は最終更新 |
| `hash` / `digest` | 元の値をそのまま保存しないために計算した値。照合・識別に使う。復号して元の値を取り出す暗号文ではない |
| `snapshot` | 注文時など、特定時点の内容を保存した控え。後からマスタが変わっても当時の内容を表示できる |
| `bps` | basis points（ベーシスポイント）。1bps = 0.01%。例: 800は8%、5000は50% |
| 冪等性キー | 同じ要求の再送を同一処理として扱い、決済・返金などの二重実行を防ぐ識別子 |
| セッション | ログインや展示利用のまとまり。ユーザーが操作を続ける間の認証・所有範囲を管理する |

以下の「NULL」欄は現在のDBML定義を示す。「不可」は`NOT NULL`、「可」はNULLを許容する。`updated_at`は列があるだけでは自動更新されず、更新処理側で値を更新する。

## テーブルの役割一覧

| テーブル | 名前の意味 | 1行が表すもの・役割 |
|---|---|---|
| [stores](#stores) | 店舗 | 1店舗の基本情報・受付設定・認証設定 |
| [store_sessions](#store_sessions) | 店舗のセッション | 店舗アカウントのログイン1件 |
| [demo_sessions](#demo_sessions) | デモのセッション | 展示利用1回分のデータ所有範囲 |
| [parts](#parts) | パーツ・部品 | 苺などの飾り1種類の名称・モデル・現在価格 |
| [allergens](#allergens) | アレルゲン | 卵・乳などのアレルゲン1品目 |
| [part_allergens](#part_allergens) | パーツのアレルゲン | 1種類のパーツと1品目のアレルゲンの関係 |
| [designs](#designs) | デザイン | 作成中、または注文で固定されたケーキデザイン1件 |
| [placements](#placements) | 配置 | デザイン上に置いた飾り1個 |
| [design_palette_colors](#design_palette_colors) | デザインのパレット色 | デザイン内で再利用するために登録した色1つ |
| [orders](#orders) | 注文 | 5号ケーキ1台の購入申し込み、またはデモ注文1件 |
| [order_items](#order_items) | 注文明細 | 注文金額を構成する本体・飾り・追加料金などの1明細 |
| [order_status_logs](#order_status_logs) | 注文状態の履歴 | 注文状態の作成・変更1回 |
| [store_weekly_capacity](#store_weekly_capacity) | 店舗の曜日別製造能力 | 1店舗の1曜日に対する標準製造枠 |
| [daily_capacity](#daily_capacity) | 日別製造能力 | 1店舗の特定日の枠上書き・店休日設定 |
| [capacity_holds](#capacity_holds) | 製造枠の仮確保 | 決済のために15分間仮確保する予約枠1件 |
| [payments](#payments) | 決済 | 1注文に対応する支払処理1件。再試行でも同じ行・Intentを使う |
| [webhook_events](#webhook_events) | Webhook通知イベント | 外部サービスから届いた通知1件の受信・処理記録 |
| [refunds](#refunds) | 返金 | 返金申請・実行1件。0円で返金不可の申請も記録する |

## stores

店舗を他のデータの所属先として識別し、購入者に見せる情報、受付日数、店舗共通アカウントの認証情報を管理する。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 店舗ID | text | 不可 | 店舗の主キー。他テーブルの`store_id`から参照される |
| `slug` | URL用の短い識別名 | text | 不可 | URLなどで店舗を識別する文字列。全店舗で一意 |
| `code` | 店舗コード | text | 不可 | 店舗共通アカウントのログイン識別子。全店舗で一意 |
| `name` | 店舗名 | text | 不可 | 画面などに表示する店舗の名前 |
| `timezone` | タイムゾーン | text | 不可 | 店舗の営業日・受付締切を判定する地域。Ver1.0は`Asia/Tokyo` |
| `is_active` | 有効かどうか | boolean | 不可 | 店舗の有効状態。認証時にも確認する。パーツの提供可否とは別 |
| `address` | 住所 | text | 可 | 店舗所在地。購入者の住所ではない。必須化はDB-09で確認 |
| `phone` | 電話番号 | text | 可 | 店舗への問い合わせ用電話番号。必須・任意は暫定 |
| `business_hours_text` | 営業時間の説明文 | text | 可 | 営業時間を表示する文章。時間帯別の予約枠は作らない |
| `pickup_instructions` | 受取案内 | text | 可 | 受取場所や来店時の注意事項などの説明 |
| `contamination_note` | 混入・同一設備に関する注記 | text | 可 | アレルゲンに関する店舗の注意書き。注文時の控えにもコピーする |
| `min_lead_days` | 最短準備日数 | integer | 不可 | 受付基点から最短受取日までの日数。0以上 |
| `max_advance_days` | 何日先まで受け付けるか | integer | 不可 | JST当日から予約できる最終日までの日数。最短準備日数以上 |
| `order_cutoff_time` | 注文受付の締切時刻 | time | 不可 | この時刻以上なら、最短受取日計算の受付基点を翌日にずらす |
| `password_hash` | パスワードのハッシュ | text | 可 | bcryptで処理したパスワード照合用の値。NULLならログイン拒否。公開しない |
| `auth_version` | 認証の版番号 | integer | 不可 | 初期値1。パスワード変更・店舗停止・全端末ログアウトなどで加算し、以前のセッションを無効にする |
| `password_changed_at` | パスワード変更日時 | timestamptz | 可 | パスワードを設定・変更した時点。未設定時はNULL |
| `created_at` | 作成日時 | timestamptz | 不可 | 店舗レコードを作成した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 店舗レコードを最後に更新した日時 |

受付設定の仮値（3日・60日・17:00）はDBの固定初期値にしていない。表示列のNULL許容はDB-09で確認する。

## store_sessions

店舗のログイン状態を管理する。1店舗に複数のセッションを持てる。スタッフ個人のアカウント管理ではない。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 店舗セッションID | text | 不可 | このログインを識別する主キー |
| `store_id` | 店舗ID | text | 不可 | ログイン先の`stores.id`を参照 |
| `token_hash` | トークンのハッシュ | text | 不可 | ブラウザが持つ秘密値の照合用。生トークンは保存しない。一意 |
| `auth_version` | 発行時の認証版番号 | integer | 不可 | セッション発行時点の店舗の認証版。現在の`stores.auth_version`と違えば無効 |
| `created_at` | 作成日時 | timestamptz | 不可 | セッションを発行した日時 |
| `expires_at` | 有効期限 | timestamptz | 不可 | この日時以降は利用できない |
| `revoked_at` | 失効日時 | timestamptz | 可 | ログアウトなどで明示的に無効化した日時。NULLでも期限切れや認証版不一致なら利用できない |

店舗・失効状態・期限による検索用indexがある。認証時は署名・期限・失効状態・店舗の有効状態・認証版を合わせて確認する。

## demo_sessions

展示利用者のデザインとデモ注文をまとめ、照会・リセットできる所有範囲を管理する。店舗管理用のログインとは別物。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | デモセッションID | text | 不可 | 展示利用のまとまりを識別する主キー |
| `store_id` | 店舗ID | text | 不可 | デモを行う`stores.id`を参照 |
| `token_hash` | トークンのハッシュ | text | 不可 | 展示利用者のブラウザを照合する秘密値のハッシュ。一意 |
| `created_at` | 作成日時 | timestamptz | 不可 | デモセッションを発行した日時 |
| `expires_at` | 有効期限 | timestamptz | 不可 | デモ操作を受け付ける期限 |
| `revoked_at` | 失効日時 | timestamptz | 可 | リセット等で無効化した日時。未失効ならNULL |

IDを知っているだけでは認可しない。寿命・削除の詳細はDB-03・DB-09。

## parts

飾りの種類を管理するマスタ。苺を3個置く場合、この表の苺は1行で、実際の3個は`placements`に3行作る。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | パーツID | text | 不可 | 飾りの種類を識別する主キー |
| `store_id` | 店舗ID | text | 不可 | パーツを登録する`stores.id`を参照 |
| `name` | パーツ名 | text | 不可 | 苺などの表示名 |
| `asset_key` | 素材の識別キー | text | 不可 | 対応する3Dモデルなどを参照する識別子。モデル本体のデータではない |
| `kind` | 種別 | part_kind | 不可 | 通常飾りか外周デコかを区別する |
| `unit_price` | 1個あたりの単価 | integer | 不可 | 現在の税抜価格。0円以上。外周デコは20円。色追加料金は含めない |
| `sort_order` | 並び順 | integer | 不可 | パーツ一覧などの表示順を指定する |
| `created_at` | 作成日時 | timestamptz | 不可 | パーツの種類を登録した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 名称・価格などを最後に更新した日時 |

在庫数・提供可否の列は持たない。参照中パーツの種別変更は拒否する。マスタ更新後も過去の注文は注文時の控えを使う。

## allergens

アレルゲンの品目マスタ。個々のパーツに何が含まれるかは`part_allergens`で関連付ける。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | アレルゲンID | text | 不可 | 品目を識別する主キー |
| `code` | 品目コード | text | 不可 | 品目をプログラム等で識別する一意なコード。具体的なマスタ値は別途登録する |
| `name` | 品目名 | text | 不可 | 卵・乳・小麦などの表示名 |
| `display_order` | 表示順 | integer | 不可 | 画面・指示書での並び順 |
| `created_at` | 作成日時 | timestamptz | 不可 | 品目を登録した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 品目情報を最後に更新した日時 |

分類列`category`はDB-05で保留中。

## part_allergens

パーツとアレルゲンを結ぶ中間テーブル。1つのパーツに複数品目を登録でき、1品目を複数パーツで共有できる。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `part_id` | パーツID | text | 不可 | 対象の`parts.id`を参照。複合主キーの一部 |
| `allergen_id` | アレルゲンID | text | 不可 | 対象の`allergens.id`を参照。複合主キーの一部 |
| `contains_type` | 含有の区分 | contains_type | 不可 | `contains`（含む）か`may_contain`（同一設備）かを保存 |

`(part_id, allergen_id)`を主キーとし、同じ組み合わせは1行だけにする。独立した`id`列はない。土台・クリーム・メッセージプレートの原材料情報の保存先はDB-05。

## designs

ケーキ全体の色・メッセージと配置をまとめる親データ。注文前から保存でき、注文作成時に内容を固定する。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | デザインID | text | 不可 | デザインを識別する主キー |
| `store_id` | 店舗ID | text | 不可 | 注文先となる`stores.id`を参照 |
| `demo_session_id` | デモセッションID | text | 可 | デモ専用なら`demo_sessions.id`を参照。通常デザインはNULL |
| `sponge_color` | スポンジの色 | varchar(7) | 不可 | `#RRGGBB`形式のスポンジ色 |
| `cream_color` | クリームの色 | varchar(7) | 不可 | `#RRGGBB`形式のクリーム色 |
| `message_text` | メッセージ本文 | text | 可 | メッセージプレートに表示する文。未使用時はNULLを許容 |
| `message_plate` | メッセージプレートの有無 | boolean | 不可 | プレートを使用するかどうか。価格やモデルIDではない |
| `version` | 編集版番号 | integer | 不可 | 読み込み後に他の更新が入っていないか照合し、古い内容による上書きを防ぐ。初期値はDB-09 |
| `locked_at` | ロック日時 | timestamptz | 可 | 注文内容として固定した日時。設定後は通常編集を拒否する |
| `created_at` | 作成日時 | timestamptz | 不可 | デザインを最初に保存した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | デザインの最終更新日時。未注文デザインの保持期限の基準にも使う |

通常注文は`pending`作成と同時にロックする。デモ注文でもスナップショット保存と同時にロックする。再注文・内容変更は複製して行う。共有・編集認証の列はDB-02で保留中。

## placements

デザインに置いた飾りを1個1行で管理する。通常飾りと外周デコを共通の表で扱い、種類は参照先`parts.kind`で判断する。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 配置ID | text | 不可 | 置いた飾り1個を識別する主キー |
| `design_id` | デザインID | text | 不可 | 飾りを置いた`designs.id`を参照 |
| `part_id` | パーツID | text | 不可 | 置いた飾りの種類として`parts.id`を参照 |
| `seq_no` | sequence number、通し番号 | integer | 不可 | デザイン内の配置番号。指示書や注文明細との対応に使う。採番・再利用はDB-01 |
| `color` | 配置の色 | varchar(7) | 可 | 外周デコは白を含め大文字`#RRGGBB`で必須。通常飾りはNULL |
| `created_at` | 作成日時 | timestamptz | 不可 | この飾りを配置データとして追加した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 配置データを最後に更新した日時 |

`(design_id, seq_no)`は一意。色はパレットへの参照ではなく、色コードそのものを保存する。**位置・回転・倍率の列はDB-01で保留中のため、現状の列だけでは配置を復元できない。**

## design_palette_colors

デザイン内で再利用する色を登録する。パレットにあるだけでは課金せず、実際に配置された色で料金を計算する。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | パレット色ID | text | 不可 | 登録した色の行を識別する主キー |
| `design_id` | デザインID | text | 不可 | 色を登録した`designs.id`を参照 |
| `color` | 色 | varchar(7) | 不可 | 大文字`#RRGGBB`で保存する再利用色 |
| `sort_order` | 並び順 | integer | 不可 | パレット内での表示順 |
| `created_at` | 作成日時 | timestamptz | 不可 | パレットへ色を登録した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 登録色や並び順を最後に更新した日時 |

`(design_id, color)`は一意。デザイン削除時は一緒に削除する。パレットの色変更・削除によって既存配置の色が勝手に変わることはない。

## orders

注文の中心となる表。受取日、購入者、現在の注文状態、注文時点の金額・表示内容を保持する。1注文は5号ケーキ1台。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 注文ID | text | 不可 | 注文を識別する内部主キー。店頭の受取番号とは別 |
| `store_id` | 店舗ID | text | 不可 | 受注する`stores.id`を参照 |
| `design_id` | デザインID | text | 可 | 注文対象の`designs.id`を参照。一意で1デザイン1注文。作成時は必須、保持期限後の削除でNULLになる |
| `is_demo` | デモ注文かどうか | boolean | 不可 | サーバーが決定する通常注文／展示注文の区別 |
| `demo_session_id` | デモセッションID | text | 可 | デモ注文の所有元`demo_sessions.id`。通常注文はNULL、デモは必須 |
| `pickup_date` | 受取日 | date | 不可 | JSTの受取営業日。デモでは展示用の日付 |
| `pickup_sequence` | 受取日の通し番号 | integer | 可 | 店舗・受取日ごとの1〜999の連番。表示時に3桁へ整形して`MMDD-023`等にする。デモはNULL |
| `status` | 注文状態 | order_status | 不可 | 支払待ち・確定・製造中など、現在の状態 |
| `customer_name` | 購入者氏名 | text | 可 | 通常注文作成時は必須。デモ・個人情報清掃後はNULL |
| `customer_phone` | 購入者電話番号 | text | 可 | 通常注文作成時は必須。連絡や受取照合に使用。デモ・清掃後はNULL |
| `customer_email` | 購入者メールアドレス | text | 可 | 通常注文作成時は必須。注文通知などに使用。デモ・清掃後はNULL |
| `access_token_hash` | 照会用トークンのハッシュ | text | 可 | 注文照会等の認証用。通常注文作成時は必須で一意。デモ・清掃後はNULL。受取番号で代用しない |
| `pii_erased_at` | 個人情報の消去日時 | timestamptz | 可 | PIIは個人を識別する情報。通常注文の個人情報を消した日時。未清掃・デモはNULL |
| `subtotal` | 小計 | integer | 不可 | 注文時の税抜合計。0円以上 |
| `tax_rate_bps` | 税率のベーシスポイント値 | integer | 不可 | 注文時の税率。0〜10000。例: 800は8% |
| `tax` | 税額 | integer | 不可 | 注文時に計算した消費税額。0円以上 |
| `total` | 総額 | integer | 不可 | 税込合計。`subtotal + tax`と一致させる。決済はこの保存済み金額を使う |
| `design_snapshot` | デザイン表示内容の控え | jsonb | 不可 | サイズ・色・プレート・メッセージ・書体などの注文時の値。座標は含めない。清掃時はメッセージ等を消去 |
| `allergen_snapshot` | アレルゲン表示内容の控え | jsonb | 不可 | 注文確認時の品目・含有区分・店舗注記。現在のマスタから作り直さない |
| `allergen_confirmed_at` | アレルゲン確認日時 | timestamptz | 可 | 購入者が表示内容を確認した日時。通常注文では必須、デモではNULL |
| `created_at` | 作成日時 | timestamptz | 不可 | 注文の申し込みを保存した日時。決済成功日時とは別 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 状態変更・清掃などで注文行を最後に更新した日時 |

`(store_id, pickup_date, pickup_sequence)`は一意。通常注文・デモ・清掃後の個人情報条件はCHECK制約で区別する。デモは個人情報・決済・予約枠を使用しない。JSONの厳密な構造はDB-08、表をまたぐ店舗・デモの整合保証はDB-04。

## order_items

注文時の料金内訳と飾りの表示情報を保存する。後でパーツの価格・名前・モデルが変わっても、注文した内容を維持する。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 注文明細ID | text | 不可 | 明細1行を識別する主キー |
| `order_id` | 注文ID | text | 不可 | この明細が属する`orders.id`を参照 |
| `kind` | 明細種別 | text | 不可 | 本体・通常飾り・外周デコ・プレート・色追加料金などの区別。保存する文字列の一覧はDB-08 |
| `placement_seq_no` | 配置の通し番号 | integer | 可 | 飾りの明細を元の`placements.seq_no`に対応させる。本体・プレート・色料金はNULL |
| `name_snapshot` | 名称の控え | text | 不可 | 注文時点の明細名・パーツ名 |
| `asset_key_snapshot` | 素材キーの控え | text | 可 | 注文時点の版付きモデル参照。モデルの内容は上書きせず保存期間中は保持する |
| `color_snapshot` | 色の控え | varchar(7) | 可 | 注文時点の配置色、または色追加料金の対象色。色が不要な明細はNULLを許容 |
| `unit_price` | 単価 | integer | 不可 | 注文時点の税抜単価。現在のパーツ価格ではない。0円以上 |
| `quantity` | 数量 | integer | 不可 | この明細の数量。1以上。配置明細は1個1行なので1 |
| `line_total` | 明細行の合計 | integer | 不可 | `unit_price × quantity`。0円以上 |
| `created_at` | 作成日時 | timestamptz | 不可 | 注文明細を保存した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 明細行の最終更新日時。監査用の列であり、注文後の内容変更を許可する意味ではない |

`(order_id, placement_seq_no)`は一意。配置番号は清掃後も履歴として残すため、`placements`への外部キーにはしない。明細合計と注文小計の一致は、複数行を扱う保存処理で確認する。

## order_status_logs

注文がいつ、誰の操作・処理で、どの状態へ変わったかを記録する。現在の状態は`orders.status`、過去の経緯はこの表で確認する。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 状態履歴ID | text | 不可 | 状態変更1回を識別する主キー |
| `order_id` | 注文ID | text | 不可 | 履歴の対象となる`orders.id`を参照 |
| `from_status` | 変更前の状態 | order_status | 可 | 直前の注文状態。注文作成時の初期履歴には前の状態がないためNULL |
| `to_status` | 変更後の状態 | order_status | 不可 | 今回の処理で到達した注文状態 |
| `actor_type` | 操作者・処理主体の種別 | text | 不可 | 店舗側操作・購入者側操作・自動処理などを区別するための項目。保存値はDB-08 |
| `actor_id` | 操作主体の識別子 | text | 可 | 操作主体を特定する識別子。何を保存するか・必須条件はDB-08。現状FKなし |
| `reason` | 変更理由 | text | 可 | キャンセル・却下などの理由。自由文に含まれる個人情報の清掃はDB-03 |
| `created_at` | 記録日時 | timestamptz | 不可 | 状態変更の履歴を保存した日時 |

店舗アカウントは共通なので、この履歴だけでスタッフ個人を特定できるとは扱わない。

## store_weekly_capacity

店舗の曜日ごとの標準製造枠を保存する。時間帯別の予約枠ではない。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 曜日別枠設定ID | text | 不可 | 設定行の主キー |
| `store_id` | 店舗ID | text | 不可 | 設定対象の`stores.id`を参照 |
| `weekday` | 曜日 | integer | 不可 | 対象曜日を数値で保存する。何番が何曜日かはDB-09で未決 |
| `capacity_points` | 製造可能ポイント数 | integer | 不可 | その曜日の標準上限。0以上。現行では5号1台が1ポイント |
| `created_at` | 作成日時 | timestamptz | 不可 | 曜日設定を作成した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 曜日設定を最後に変更した日時 |

`(store_id, weekday)`は一意。初期5ポイントは設定データとして投入する。

## daily_capacity

特定の日だけ、曜日別の標準枠を上書きしたり、店休日にしたりするための設定。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 日別枠設定ID | text | 不可 | 日別設定の主キー |
| `store_id` | 店舗ID | text | 不可 | 設定対象の`stores.id`を参照 |
| `pickup_date` | 受取日 | date | 不可 | 上書き対象となるJSTの営業日 |
| `capacity_points` | 製造可能ポイント数 | integer | 不可 | この日に適用する上限。0以上 |
| `is_closed` | 店休日かどうか | boolean | 不可 | この日を受取不可の休業日として扱うか |
| `created_at` | 作成日時 | timestamptz | 不可 | 日別設定を作成した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 日別設定を最後に変更した日時 |

`(store_id, pickup_date)`は一意。残り枠そのものを保存する表ではなく、上限を設定する表。

## capacity_holds

決済中に他の注文へ枠を取られないよう、15分間仮確保する。期限内の`active`だけを未確定の消費枠として数える。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 仮確保ID | text | 不可 | 仮確保1件を識別する主キー |
| `store_id` | 店舗ID | text | 不可 | 枠を確保する`stores.id`を参照 |
| `design_id` | デザインID | text | 不可 | 仮確保の対象となる`designs.id`を参照。清掃時の削除制約はDB-03 |
| `order_id` | 注文ID | text | 可 | 注文作成後に`orders.id`を関連付ける。一意。注文作成前はNULL |
| `pickup_date` | 受取日 | date | 不可 | 枠を確保するJSTの営業日 |
| `points` | 仮確保ポイント数 | integer | 不可 | 確保する製造枠の量。正の整数。現行5号は1 |
| `status` | 仮確保状態 | hold_status | 不可 | 有効・注文確定済み・期限切れ・解放済みの区別 |
| `expires_at` | 仮確保の有効期限 | timestamptz | 不可 | 仮確保開始から15分後の日時 |
| `created_at` | 作成日時 | timestamptz | 不可 | 仮確保を作成した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 注文関連付けや状態変更で最後に更新した日時 |

同一デザインの`active`は1件までにする部分一意indexが別途必要。確定注文と確定holdを二重に枠へ計上しない。店舗・デザイン・受取日の一致保証はDB-04。

## payments

注文に対する支払処理と外部決済サービスとの対応を記録する。Ver1.0では1注文1PaymentIntentを再利用する。返金は別の`refunds`で管理する。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 決済ID | text | 不可 | アプリ内部の決済レコードの主キー |
| `order_id` | 注文ID | text | 不可 | 支払対象の`orders.id`を参照。一意で、1注文につき1行 |
| `provider` | 決済提供元 | text | 不可 | 決済を行う外部サービスの識別子。現行方針はStripe |
| `payment_intent_id` | PaymentIntentのID | text | 可 | Stripe側の支払処理を識別するID。一意。作成前はNULL |
| `creation_idempotency_key` | 作成要求の冪等性キー | text | 不可 | 外部決済の作成を再送しても重複作成しないための固定キー。一意 |
| `status` | 決済状態 | payment_status | 不可 | 作成中・支払待ち・成功・失敗など、アプリ側の処理状態 |
| `amount` | 決済金額 | integer | 不可 | 保存済み注文総額をもとに外部サービスへ要求する金額。0円以上 |
| `currency` | 通貨 | text | 不可 | 決済する通貨の識別子。保存する文字列の表記は実装で統一する |
| `paid_at` | 支払完了日時 | timestamptz | 可 | 支払いが成功した日時。未完了時はNULL |
| `cancel_requested_at` | 決済取消の要求日時 | timestamptz | 可 | 外部の支払処理を取り消す要求を記録した日時。注文状態の取消とは別に管理 |
| `cancel_completed_at` | 決済取消の完了日時 | timestamptz | 可 | 外部決済の取消完了を記録した日時 |
| `next_attempt_at` | 次回処理予定日時 | timestamptz | 可 | 復旧・再試行処理を次に実行する予定時刻 |
| `last_error` | 最後のエラー | text | 可 | 直近の処理失敗内容。調査・再試行判断に使う |
| `created_at` | 作成日時 | timestamptz | 不可 | 決済管理行を作った日時。外部Intent作成より前の場合がある |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 決済状態や再試行情報を最後に更新した日時 |

デモ注文には作らない。外部APIの結果が不明でも別のIntentを作らず、同じキー・行で照合する。

## webhook_events

外部サービスから届いた通知を受信記録として保存する。通知を受け取ったことと、注文への反映が完了したことを分け、重複通知と失敗後の再処理に対応する。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 受信イベント内部ID | text | 不可 | アプリ内の受信記録の主キー |
| `provider` | 通知の提供元 | text | 不可 | 通知を送った外部サービスの識別子 |
| `event_id` | 外部イベントID | text | 不可 | 外部サービスが発行した通知ID。`provider`との組み合わせで重複を判定 |
| `event_type` | イベントの種類 | text | 不可 | 決済成功など、何が起きたか。例: `payment_intent.succeeded` |
| `object_id` | 対象オブジェクトID | text | 不可 | 通知が対象にするPaymentIntent等の外部ID。通知そのものの`event_id`とは別 |
| `event_created_at` | 外部イベント発生日時 | timestamptz | 不可 | 外部サービス側でイベントが作られた日時。アプリの受信日時とは異なる |
| `event_data` | イベントのデータ | jsonb | 不可 | 署名検証済みの復旧に必要な最小情報。秘密値・カード情報・顧客個人情報は保存しない |
| `status` | イベント処理状態 | webhook_status | 不可 | 受信済み・処理済み・無視・失敗・要確認の区別 |
| `payload_digest` | 通知内容の要約ハッシュ | text | 不可 | 通知内容を識別・比較するために計算した値。通知本文そのものではない |
| `attempt_count` | 処理試行回数 | integer | 不可 | 業務反映処理を試行した回数。0以上 |
| `next_attempt_at` | 次回処理予定日時 | timestamptz | 可 | 失敗した通知などを再処理する予定時刻 |
| `processed_at` | 処理完了日時 | timestamptz | 可 | 業務への反映処理が完了した日時。単なる受信時刻ではない |
| `error_message` | エラー内容 | text | 可 | イベント処理の失敗内容を記録する |
| `created_at` | 受信記録作成日時 | timestamptz | 不可 | アプリのDBへ受信記録を保存した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 処理状態や再試行情報を最後に更新した日時 |

`(provider, event_id)`は一意。イベントIDの存在だけで処理済みと判断しない。業務反映と処理済みへの更新は同じトランザクションで行う。

## refunds

返金申請、返金額の判断、外部APIの実行結果・復旧状況を記録する。1注文に複数の返金記録があり得るため、合計が支払額を超えないよう処理中の金額も含めて管理する。

| カラム | 名前の意味 | 型 | NULL | 保存する内容・役割 |
|---|---|---|---|---|
| `id` | 返金ID | text | 不可 | アプリ内部の返金処理1件を識別する主キー |
| `order_id` | 注文ID | text | 不可 | 返金対象の`orders.id`を参照 |
| `payment_id` | 決済ID | text | 不可 | 返金元の`payments.id`を参照。注文との対応保証はDB-04 |
| `provider_refund_id` | 外部サービスの返金ID | text | 可 | 外部サービスで作られた返金処理の識別子。一意。未作成時などはNULL |
| `idempotency_key` | 冪等性キー | text | 不可 | 同じ返金の再試行による二重返金を防ぐ固定キー。一意 |
| `reason` | 返金理由 | text | 不可 | 返金申請・返金判断の理由。0円で返金不可の場合も理由を残す |
| `rate_bps` | 返金率のベーシスポイント値 | integer | 不可 | 適用した返金率。0〜10000。5000は50%、10000は100% |
| `amount` | 返金額 | integer | 不可 | 今回返金する円単位の金額。0以上。0円では外部APIを呼ばない |
| `status` | 返金処理状態 | refund_status | 不可 | 待機・実行中・成功・失敗・要確認の区別 |
| `attempt_count` | 実行試行回数 | integer | 不可 | 返金処理の試行回数。0以上 |
| `next_attempt_at` | 次回実行予定日時 | timestamptz | 可 | 再実行・結果照合を行う予定時刻 |
| `lease_expires_at` | 処理担当権の期限 | timestamptz | 可 | ワーカーが処理を担当する一時的な権利の期限。処理停止時に他の処理が引き継ぐ判断に使う |
| `last_error` | 最後のエラー | text | 可 | 直近の返金処理の失敗内容 |
| `created_at` | 作成日時 | timestamptz | 不可 | 返金申請・要求をDBへ保存した日時 |
| `updated_at` | 最終更新日時 | timestamptz | 不可 | 返金状態や再試行情報を最後に更新した日時 |

結果不明の処理も返金予定額に含める。`lease_expires_at`は返金申請自体の有効期限ではない。

## enumの値一覧

以下は保存できる値の意味。状態遷移の許可条件は別途アプリで検証する。

| 型 | 値 | 意味 |
|---|---|---|
| `part_kind` | `standard` | 通常の飾り |
| `part_kind` | `border_decoration` | 外周デコ |
| `contains_type` | `contains` | 原材料として含む |
| `contains_type` | `may_contain` | 同一設備で扱う区分 |
| `order_status` | `pending` | 注文作成済み・決済待ち |
| `order_status` | `confirmed` | 注文確定。通常は決済成功を反映した状態。デモは直接この状態で作成 |
| `order_status` | `in_production` | 製造中 |
| `order_status` | `ready` | 受取可能 |
| `order_status` | `completed` | 受取完了 |
| `order_status` | `cancelled` | キャンセル済み |
| `order_status` | `rejected` | 店舗による却下 |
| `order_status` | `expired` | 決済待ちの期限切れ |
| `hold_status` | `active` | 仮確保中。有効性には期限内であることも必要 |
| `hold_status` | `confirmed` | 注文確定に伴い確定済み |
| `hold_status` | `expired` | 仮確保の期限切れ |
| `hold_status` | `released` | 仮確保を解放済み |
| `payment_status` | `creating` | 外部決済の作成処理中 |
| `payment_status` | `pending` | 決済完了待ち |
| `payment_status` | `failed` | 決済失敗 |
| `payment_status` | `succeeded` | 決済成功 |
| `payment_status` | `cancelled` | 決済取消済み |
| `payment_status` | `needs_review` | 自動処理で確定できず確認が必要 |
| `webhook_status` | `received` | 受信・保存済みで業務処理は未完了 |
| `webhook_status` | `processed` | 業務処理完了 |
| `webhook_status` | `ignored` | 処理不要として扱った通知 |
| `webhook_status` | `failed` | 業務処理失敗 |
| `webhook_status` | `needs_review` | 内容や処理結果の確認が必要 |
| `refund_status` | `queued` | 返金処理の待機中 |
| `refund_status` | `processing` | 返金処理中 |
| `refund_status` | `succeeded` | 返金処理完了。0円申請を外部APIなしで完了扱いにする場合もある |
| `refund_status` | `failed` | 返金処理失敗 |
| `refund_status` | `needs_review` | 外部結果などの確認が必要 |

## 今回の一覧に含めない保留中の定義

| 対象 | 想定される役割 | 保留理由 |
|---|---|---|
| `platform_fees` | 返金後に残る金額をもとに手数料を記録する | 現在値1行か計算履歴かが未決（DB-06） |
| `rate_limits` | 操作回数・時間窓・制限状態を保存する | 時間窓方式と一意キーが未決（DB-07） |
| `email_deliveries` | メール送信結果・再送・重複防止を管理する | 状態・再送・重複判定の契約が未決（DB-08） |
| `placements`の位置・回転・倍率 | 飾りの配置を再現する | 座標契約が未決（DB-01） |
| `designs`の共有・編集権限 | URLによる閲覧と編集の権限を分ける | 識別子・保存方式・期限等が未決（DB-02） |
| `allergens.category`等 | アレルゲンの分類や商品全体の原材料管理 | 必要性・情報源・値が未決（DB-05） |

## 参照資料

- [DBML本体](../database.dbml)
- [DB設計・業務上の保存契約](../plan/issue-reference/04-database-design.md)
- [予約枠・決済の競合処理](../plan/issue-reference/09-capacity-payment-concurrency.md)
- [現在の仕様](../plan/status.md)
- [未確定事項一覧](../plan/open-questions.md)
- [4人レビュー用メモ](../memo/未決事項.md)
