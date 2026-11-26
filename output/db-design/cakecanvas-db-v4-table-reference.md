# CakeCanvas 統合DB設計案 v4：テーブル・カラム説明書

作成日：2026-10-27

会員登録、DB改善案v2、公開ギャラリー・人気デザインのコピー機能をまとめた、全30テーブル・215カラムの役割を説明します。対象は設計案であり、実DBやアプリへの実装が完了したことを示す文書ではありません。

- [統合DBML](./cakecanvas-db-v4-unified.dbml)
- [統合DB図（PNG）](./cakecanvas-db-v4-unified.png)

## 共通の読み方

| 表記・型 | 意味 |
|---|---|
| PK | 主キー。レコードを識別するキー |
| FK | 他テーブルを参照する外部キー |
| UQ | 値の重複を許可しない一意制約 |
| NULL可：○ | 値が未設定でも保存できる |
| NULL可：— | 値が必須 |
| varchar / text | 文字列 |
| integer | 整数。金額は円単位の整数 |
| boolean | 真偽値 |
| timestamptz | 日時。原則UTCで保存 |
| date | 暦日。受取日は日本時間で扱う |
| double precision | 位置・回転・倍率などに使用する浮動小数点数 |
| jsonb | 構成などを保存するJSONデータ |
| enum相当の型名 | 指定した候補から選ぶ列挙型 |

複数の列にPKが付くテーブルは、その組み合わせで1行を識別する複合主キーです。単一列のUQと、複数列の組み合わせのUQは区別して掲載します。

## 目次

- 会員・認証・店舗
  - 1. [users](#table-users)
  - 2. [user_profiles](#table-user_profiles)
  - 3. [password_credentials](#table-password_credentials)
  - 4. [auth_sessions](#table-auth_sessions)
  - 5. [auth_action_tokens](#table-auth_action_tokens)
  - 6. [user_consents](#table-user_consents)
  - 7. [stores](#table-stores)
  - 8. [store_memberships](#table-store_memberships)
- 商品・編集・公開ギャラリー
  - 9. [designs](#table-designs)
  - 10. [design_publications](#table-design_publications)
  - 11. [placements](#table-placements)
  - 12. [parts](#table-parts)
  - 13. [allergens](#table-allergens)
  - 14. [part_allergens](#table-part_allergens)
  - 15. [design_likes](#table-design_likes)
- 注文・価格・確定スナップショット
  - 16. [orders](#table-orders)
  - 17. [order_design_snapshots](#table-order_design_snapshots)
  - 18. [order_contacts](#table-order_contacts)
  - 19. [order_items](#table-order_items)
  - 20. [order_status_logs](#table-order_status_logs)
  - 21. [order_access_tokens](#table-order_access_tokens)
- 予約枠・日別上限
  - 22. [store_weekly_capacity](#table-store_weekly_capacity)
  - 23. [daily_capacity](#table-daily_capacity)
  - 24. [capacity_holds](#table-capacity_holds)
- 決済・返金・通知
  - 25. [payments](#table-payments)
  - 26. [refunds](#table-refunds)
  - 27. [webhook_events](#table-webhook_events)
  - 28. [email_deliveries](#table-email_deliveries)
- 共通制御・展示
  - 29. [rate_limits](#table-rate_limits)
  - 30. [demo_sessions](#table-demo_sessions)

## 会員・認証・店舗

<a id="table-users"></a>

### 1. `users`

購入者と店舗スタッフに共通する、会員アカウントの基本情報と本人確認状態を管理します。プロフィールやパスワードは別テーブルで管理します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `email` | `varchar` | — | ○ | 登録メールアドレス。退会後の匿名化時に消去できるようNULL可とします。 |
| `email_key` | `varchar` | UQ | ○ | 登録メールを統一したルールで正規化した照合用の値。同じメールでの重複登録を防ぎます。 |
| `email_verified_at` | `timestamptz` | — | ○ | メールの本人確認が完了した日時。未確認ならNULL。 |
| `status` | `account_status` | — | — | アカウント状態。pending_verification＝メール確認待ち、active＝利用可能、suspended＝利用停止、withdrawn＝退会。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |
| `updated_at` | `timestamptz` | — | — | このレコードを最後に更新した日時。 |
| `withdrawn_at` | `timestamptz` | — | ○ | 退会した日時。未退会ならNULL。 |

利用中会員にはemailとemail_keyを必須とする設計です。DBMLでは退会匿名化に備えてNULL可としているため、状態に応じた必須条件はCHECK制約や登録処理で別途保証します。

<a id="table-user_profiles"></a>

### 2. `user_profiles`

マイページの表示情報や、注文フォームに初期入力する既定の連絡先を管理します。1会員につき最大1行です。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `user_id` | `varchar` | PK・FK | — | 対象会員。users.idを参照し、この列自体がプロフィールの主キーです。 |
| `nickname` | `varchar` | — | — | 会員のニックネーム。 |
| `full_name` | `varchar` | — | ○ | 注文時に使う氏名の既定値。公開作品の表示には使用しません。 |
| `phone` | `varchar` | — | ○ | 注文時に使う電話番号の既定値。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |
| `updated_at` | `timestamptz` | — | — | このレコードを最後に更新した日時。 |

**参照先**

- `user_id` → `users(id)`

プロフィールを変更しても、過去のorder_contactsの氏名・電話番号は変更しません。

<a id="table-password_credentials"></a>

### 3. `password_credentials`

メールとパスワードによるログインに必要な認証情報を管理します。1会員につき最大1行です。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `user_id` | `varchar` | PK・FK | — | 対象会員。users.idを参照します。 |
| `password_hash` | `varchar` | — | — | パスワードを専用の方式でハッシュ化した値。平文パスワードは保存しません。 |
| `password_changed_at` | `timestamptz` | — | — | パスワードを最後に設定・変更した日時。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |

**参照先**

- `user_id` → `users(id)`

通常のプロフィール取得で認証情報を扱わずに済むよう、usersやuser_profilesから分離します。ハッシュ方式・パラメーターは認証実装時に確定します。

<a id="table-auth_sessions"></a>

### 4. `auth_sessions`

誰がどのセッションでログインしているかを管理します。同じ会員がPCとスマートフォンを使うなど、1会員に複数行を持てます。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `user_id` | `varchar` | FK | — | ログインしている会員。users.idを参照します。 |
| `token_hash` | `varchar` | UQ | — | ログイン用秘密トークンのハッシュ。生トークンは保存しません。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |
| `last_seen_at` | `timestamptz` | — | ○ | このセッションを最後に利用した日時。 |
| `expires_at` | `timestamptz` | — | — | セッションの有効期限。 |
| `revoked_at` | `timestamptz` | — | ○ | ログアウトや強制失効を行った日時。未失効ならNULL。 |

**参照先**

- `user_id` → `users(id)`

期限内であることに加え、失効していないこと、会員が利用可能状態であることを処理側で確認します。

<a id="table-auth_action_tokens"></a>

### 5. `auth_action_tokens`

メール内の確認リンクなど、期限付き・一度限りの操作を管理します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `user_id` | `varchar` | FK | — | 操作対象の会員。users.idを参照します。 |
| `purpose` | `auth_token_purpose` | — | — | 用途。verify_email＝メール確認、reset_password＝パスワード再設定。 |
| `token_hash` | `varchar` | UQ | — | 操作用秘密トークンのハッシュ。 |
| `email_key_snapshot` | `varchar` | — | — | 発行時点のメール照合キー。メール変更後に古い確認リンクが使われることを防ぐ判定に使います。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |
| `expires_at` | `timestamptz` | — | — | このトークンを使用できる期限。 |
| `consumed_at` | `timestamptz` | — | ○ | 使用済みになった日時。未使用ならNULL。 |

**参照先**

- `user_id` → `users(id)`

auth_sessionsが継続的なログインを表すのに対し、こちらは特定操作の実行権限を表します。期限・用途・未使用状態を検証し、使用済みへの更新と対象操作を同じトランザクションで行います。

<a id="table-user_consents"></a>

### 6. `user_consents`

誰が、どの版の文書に、いつ同意したかを保存します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `user_id` | `varchar` | FK | — | 同意した会員。users.idを参照します。 |
| `document_type` | `varchar` | — | — | 文書の種類。利用規約などを区別します。 |
| `document_version` | `varchar` | — | — | 同意した文書のバージョン。 |
| `accepted_at` | `timestamptz` | — | — | 同意した日時。 |

**参照先**

- `user_id` → `users(id)`

**組み合わせの制約**

- 一意：`user_id, document_type, document_version`

同じ会員・文書・版を重複登録しません。必要な最新版への同意があるかは、文書版と照合して判断します。

<a id="table-stores"></a>

### 7. `stores`

店舗を管理します。商品、デザイン、注文、予約枠の所属先です。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `slug` | `varchar` | UQ | — | 店舗URLなどで使用する識別文字列。 |
| `name` | `varchar` | — | — | 店舗名。 |
| `timezone` | `varchar` | — | — | 店舗の業務時間を判断するタイムゾーン。例：Asia/Tokyo。 |
| `is_active` | `boolean` | — | — | 店舗を有効として扱うかどうか。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |
| `updated_at` | `timestamptz` | — | — | このレコードを最後に更新した日時。 |

<a id="table-store_memberships"></a>

### 8. `store_memberships`

会員と店舗を結び付け、店舗ごとの所属・権限を管理します。同じ会員が購入者とスタッフを兼ねたり、複数店舗に所属したりできます。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `store_id` | `varchar` | PK・FK | — | 所属する店舗。stores.idを参照します。 |
| `user_id` | `varchar` | PK・FK | — | 所属する会員。users.idを参照します。 |
| `role` | `store_role` | — | — | 店舗内の役割。owner＝所有者、manager＝管理者、staff＝スタッフ。 |
| `is_active` | `boolean` | — | — | この店舗での所属・権限が有効かどうか。 |
| `joined_at` | `timestamptz` | — | — | 店舗への所属を開始した日時。 |
| `updated_at` | `timestamptz` | — | — | このレコードを最後に更新した日時。 |

**参照先**

- `user_id` → `users(id)`
- `store_id` → `stores(id)`

**組み合わせの制約**

- 複合主キー：`store_id, user_id`

roleに応じた操作権限は、アプリケーション側で定義して各操作時に確認します。


## 商品・編集・公開ギャラリー

<a id="table-designs"></a>

### 9. `designs`

作成途中・保存済みの、利用者が編集するケーキデザインを管理します。公開作品からコピーした場合も、新しい行を作成します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `forked_from_publication_id` | `varchar` | FK | ○ | コピー元の公開作品。design_publications.idを参照します。自作開始ならNULL。 |
| `store_id` | `varchar` | FK | — | このデザインを提供する店舗。stores.idを参照します。 |
| `user_id` | `varchar` | FK | ○ | デザインの所有会員。users.idを参照します。ゲスト・デモ等ではNULL可。 |
| `sponge_color` | `varchar` | — | — | スポンジの色。#RRGGBB形式を想定します。 |
| `cream_color` | `varchar` | — | — | クリームの色。 |
| `message_text` | `varchar` | — | ○ | メッセージプレート等の文字原稿。 |
| `version` | `integer` | — | — | デザインの更新番号。同時編集による上書き競合の検出にも使います。 |
| `share_token_hash` | `varchar` | UQ | ○ | 限定共有用秘密トークンのハッシュ。未共有ならNULL。 |
| `updated_at` | `timestamptz` | — | — | このレコードを最後に更新した日時。 |
| `demo_session_id` | `varchar` | FK | ○ | 所属する展示体験。demo_sessions.idを参照します。通常利用ではNULL。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |

**参照先**

- `store_id` → `stores(id)`
- `user_id` → `users(id)`
- `demo_session_id` → `demo_sessions(id)`
- `forked_from_publication_id` → `design_publications(id)`

versionは編集データの更新番号です。公開版等のschema_versionはJSON形式の版であり、役割が異なります。共有権限と編集権限も区別します。

<a id="table-design_publications"></a>

### 10. `design_publications`

ギャラリーへ公開した時点のデザインを固定保存します。作者が元デザインを編集しても、公開作品の構成は変わらない設計です。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `store_id` | `varchar` | FK | — | 公開作品の対象店舗。stores.idを参照します。 |
| `source_design_id` | `varchar` | FK | ○ | 作者の元デザイン。designs.idを参照します。公開内容の表示・復元自体はこの参照に依存しません。 |
| `author_user_id` | `varchar` | FK | ○ | 公開した作者。users.idを参照します。 |
| `author_alias` | `varchar` | — | — | 公開用の作者表示名。注文者の本名や連絡先とは分離します。 |
| `title` | `varchar` | — | — | 公開作品のタイトル。 |
| `description` | `text` | — | ○ | 作品の説明文。 |
| `status` | `publication_status` | — | — | 公開状態。published＝公開中、hidden＝非表示、removed＝公開から取り下げ済み。 |
| `allow_remix` | `boolean` | — | — | 他の利用者が自分用にコピーできるかどうか。 |
| `schema_version` | `integer` | — | — | configurationに保存するJSON形式のバージョン。 |
| `configuration` | `jsonb` | — | — | 公開時点の色・文字・パーツ・配置・資産バージョンを保存するJSON。個人情報を除去した公開専用データです。 |
| `published_at` | `timestamptz` | — | — | 公開した日時。 |
| `hidden_at` | `timestamptz` | — | ○ | 非表示にした日時。 |

**参照先**

- `store_id` → `stores(id)`
- `source_design_id` → `designs(id)`
- `author_user_id` → `users(id)`

注文者情報・決済情報・秘密トークンを公開データへ含めません。構成を変更して再公開する場合は新しい公開IDを作る案です。

<a id="table-placements"></a>

### 11. `placements`

ケーキ上に置いた飾り1個ごとの位置・向き・大きさを管理します。苺を3個配置したら、通常は3行になります。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `design_id` | `varchar` | FK | — | 配置先デザイン。designs.idを参照します。 |
| `part_id` | `varchar` | FK | — | 配置したパーツ。parts.idを参照します。 |
| `seq_no` | `integer` | — | — | デザイン内の配置番号。製造指示書の番号との対応にも使います。 |
| `position_x` | `double precision` | — | — | X軸方向の位置。 |
| `position_y` | `double precision` | — | — | Y軸方向の位置。 |
| `position_z` | `double precision` | — | — | Z軸方向の位置。 |
| `rotation_x` | `double precision` | — | — | X軸周りの回転量。 |
| `rotation_y` | `double precision` | — | — | Y軸周りの回転量。 |
| `rotation_z` | `double precision` | — | — | Z軸周りの回転量。 |
| `scale` | `double precision` | — | — | パーツの拡大・縮小倍率。 |
| `color` | `varchar` | — | ○ | パーツ個別に指定した色。個別指定がない場合はNULL。 |

**参照先**

- `design_id` → `designs(id)`
- `part_id` → `parts(id)`

**組み合わせの制約**

- 一意：`design_id, seq_no`

座標の原点・単位、回転の単位、色未指定時の表示は、3Dモデルと描画処理で統一します。

<a id="table-parts"></a>

### 12. `parts`

選択・配置できる商品や飾りパーツと、その現在の価格・表示資産を管理するマスタです。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `store_id` | `varchar` | FK | — | パーツを提供する店舗。stores.idを参照します。 |
| `kind` | `varchar` | — | — | 本体・フルーツ・デコ等の分類。具体的な値は実装時に定義します。 |
| `name` | `varchar` | — | — | 現在のパーツ名。 |
| `unit_price_excl_tax` | `integer` | — | — | 現在の税抜単価。円単位の整数。 |
| `asset_key` | `varchar` | — | — | 対応する3Dモデルなどの表示資産を特定するキー。 |
| `asset_version` | `varchar` | — | — | 表示資産のバージョン。 |
| `is_active` | `boolean` | — | — | 新規の選択・注文に利用できる状態かどうか。 |

**参照先**

- `store_id` → `stores(id)`

マスタの価格や名称を変更しても、過去の注文はorder_itemsの保存値を使用します。

<a id="table-allergens"></a>

### 13. `allergens`

アレルゲンの種類を管理する共通マスタです。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `code` | `varchar` | UQ | — | アレルゲンを識別するコード。 |
| `name` | `varchar` | — | — | アレルゲンの表示名。卵・乳・小麦など。 |

<a id="table-part_allergens"></a>

### 14. `part_allergens`

1つのパーツに複数のアレルゲンを関連付けるための中間テーブルです。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `part_id` | `varchar` | PK・FK | — | 対象パーツ。parts.idを参照します。 |
| `allergen_id` | `varchar` | PK・FK | — | 関連するアレルゲン。allergens.idを参照します。 |

**参照先**

- `part_id` → `parts(id)`
- `allergen_id` → `allergens(id)`

**組み合わせの制約**

- 複合主キー：`part_id, allergen_id`

現在の構成は関連の有無を表します。「原材料に含む」「同一設備で扱う」などの区分は持っていません。

<a id="table-design_likes"></a>

### 15. `design_likes`

公開作品へのお気に入りを記録し、お気に入り一覧と人気順の集計に使います。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `publication_id` | `varchar` | PK・FK | — | お気に入りにした公開作品。design_publications.idを参照します。 |
| `user_id` | `varchar` | PK・FK | — | お気に入りにした会員。users.idを参照します。 |
| `created_at` | `timestamptz` | — | — | お気に入りに登録した日時。 |

**参照先**

- `publication_id` → `design_publications(id)`
- `user_id` → `users(id)`

**組み合わせの制約**

- 複合主キー：`publication_id, user_id`

1人が同じ公開作品を重複登録できません。人気順は、同じ店舗内の公開中作品について、現在のお気に入り件数を集計する案です。


## 注文・価格・確定スナップショット

<a id="table-orders"></a>

### 16. `orders`

誰が、どの店舗に、どの金額・受取日で注文したかを管理する注文の本体です。1注文につきケーキ1台です。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `store_id` | `varchar` | FK | — | 注文先店舗。stores.idを参照します。 |
| `user_id` | `varchar` | FK | ○ | 注文した会員。users.idを参照します。ゲスト注文や退会後等ではNULL可。 |
| `source_design_id` | `varchar` | FK | ○ | 注文に使用した編集デザイン。designs.idを参照します。 |
| `status` | `order_status` | — | — | 注文の進行状態。値の一覧は下記参照。 |
| `pickup_date` | `date` | — | — | 店頭受取日。日本時間の暦日として扱います。 |
| `pickup_sequence` | `integer` | — | ○ | 店舗・受取日ごとの受取連番。採番前はNULL可。 |
| `subtotal_excl_tax` | `integer` | — | — | 税抜小計。 |
| `tax_rate_bps` | `integer` | — | — | 適用した税率。1bps＝0.01%なので、8%なら800。 |
| `tax_amount` | `integer` | — | — | 注文時に確定した税額。 |
| `total_amount` | `integer` | — | — | 税込の請求総額。 |
| `is_demo` | `boolean` | — | — | デモ注文かどうか。 |
| `idempotency_key` | `varchar` | UQ | — | 同じ注文操作の再送を識別するキー。二重作成を防ぐ処理に使います。 |
| `allergen_confirmed_at` | `timestamptz` | — | ○ | 注文者がアレルゲン表示を確認した日時。確定待ちやデモではNULL可。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |
| `demo_session_id` | `varchar` | FK | ○ | 所属する展示体験。demo_sessions.idを参照します。 |
| `updated_at` | `timestamptz` | — | — | このレコードを最後に更新した日時。 |

**参照先**

- `store_id` → `stores(id)`
- `user_id` → `users(id)`
- `source_design_id` → `designs(id)`
- `demo_session_id` → `demo_sessions(id)`

**組み合わせの制約**

- 一意：`store_id, pickup_date, pickup_sequence`

source_design_idは一意ではなく、同じデザインから再注文できます。受取連番は店舗・日付・連番の組み合わせで一意にします。

| statusの値 | 意味 |
|---|---|
| `pending` | 決済等の確定待ち |
| `confirmed` | 注文確定 |
| `in_production` | 製造中 |
| `ready` | 受取可能 |
| `completed` | 引渡し完了 |
| `cancelled` | キャンセル |
| `rejected` | 店舗による却下 |
| `expired` | 確定待ちの期限切れ |

<a id="table-order_design_snapshots"></a>

### 17. `order_design_snapshots`

購入者が確定した製造内容を保存します。元デザインの編集やマスタ変更によって注文内容が変わらないようにするテーブルです。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `order_id` | `varchar` | PK・FK | — | 対象注文。orders.idを参照し、注文1件につき最大1行を持ちます。 |
| `schema_version` | `integer` | — | — | configurationに保存するJSON形式のバージョン。 |
| `configuration` | `jsonb` | — | — | 注文時点の色・文字・配置・パーツ・資産バージョン等を保存するJSON。 |
| `allergen_snapshot` | `jsonb` | — | — | 注文時点で表示・確認したアレルゲン情報。 |
| `captured_at` | `timestamptz` | — | — | 内容を固定保存した日時。 |

**参照先**

- `order_id` → `orders(id)`

design_publicationsが公開用の固定データなのに対し、こちらは注文・製造のための確定記録です。注文に必ず存在することは、注文作成処理でも保証します。

<a id="table-order_contacts"></a>

### 18. `order_contacts`

注文受付・受取確認・通知に使う、その注文時点の連絡先を保存します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `order_id` | `varchar` | PK・FK | — | 対象注文。orders.idを参照し、注文1件につき最大1行を持ちます。 |
| `name` | `varchar` | — | — | 注文時の氏名。 |
| `email` | `varchar` | — | — | 注文時の通知先メールアドレス。 |
| `phone` | `varchar` | — | — | 注文時の電話番号。 |
| `erase_after` | `timestamptz` | — | — | この注文連絡先を削除・匿名化する予定期限。 |

**参照先**

- `order_id` → `orders(id)`

会員プロフィールから初期入力しても、注文時には独立して保存します。本注文では必要とし、個人情報入力を省略するデモでは行を作らない運用を想定します。

<a id="table-order_items"></a>

### 19. `order_items`

ケーキ本体、飾り、プレート、色変更料金など、請求金額の内訳を保存します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `order_id` | `varchar` | FK | — | 所属する注文。orders.idを参照します。 |
| `line_no` | `integer` | — | — | 注文内の明細番号・表示順。 |
| `kind` | `varchar` | — | — | 本体・飾り・追加料金などの分類。 |
| `source_part_id` | `varchar` | FK | ○ | 元パーツ。parts.idを参照します。パーツに直接対応しない追加料金などはNULL可。 |
| `name_snapshot` | `varchar` | — | — | 注文時点の明細名。 |
| `unit_price_excl_tax` | `integer` | — | — | 注文時点の税抜単価。 |
| `quantity` | `integer` | — | — | 数量。色変更料金なら使用色数など、その明細の課金単位に対応します。 |
| `line_total_excl_tax` | `integer` | — | — | 明細の税抜金額。単価×数量。 |

**参照先**

- `order_id` → `orders(id)`
- `source_part_id` → `parts(id)`

**組み合わせの制約**

- 一意：`order_id, line_no`

苺3個なら、placementsは3行でも、料金明細は「苺・単価200円・数量3・合計600円」の1行にまとめられます。

<a id="table-order_status_logs"></a>

### 20. `order_status_logs`

注文がいつ、誰によって、どの状態へ変更されたかを記録します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `order_id` | `varchar` | FK | — | 対象注文。orders.idを参照します。 |
| `from_status` | `order_status` | — | ○ | 変更前の注文状態。最初の状態登録などではNULL可。 |
| `to_status` | `order_status` | — | — | 変更後の注文状態。orders.statusと同じ列挙値を使います。 |
| `actor_type` | `varchar` | — | — | 操作者の種類。会員・店舗スタッフ・システム等を区別する想定です。 |
| `actor_user_id` | `varchar` | FK | ○ | 操作した会員。users.idを参照します。システム操作等ではNULL。 |
| `reason` | `text` | — | ○ | 状態変更の理由・補足。 |
| `created_at` | `timestamptz` | — | — | 状態を変更した日時。 |

**参照先**

- `order_id` → `orders(id)`
- `actor_user_id` → `users(id)`

製造開始時刻やキャンセル経緯の確認に使います。デザインの編集履歴ではありません。注文状態の更新と履歴追加を同じトランザクションで行います。

<a id="table-order_access_tokens"></a>

### 21. `order_access_tokens`

会員ログインを使わず、秘密URLから注文照会などを行うための権限を管理します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `order_id` | `varchar` | FK | — | 照会・操作できる対象注文。orders.idを参照します。 |
| `token_hash` | `varchar` | UQ | — | 注文操作用秘密トークンのハッシュ。 |
| `scope` | `varchar` | — | — | 許可する操作の範囲。照会・キャンセル等の区分を定義する想定です。 |
| `expires_at` | `timestamptz` | — | — | 権限の有効期限。 |
| `revoked_at` | `timestamptz` | — | ○ | 権限を失効させた日時。 |

**参照先**

- `order_id` → `orders(id)`

受取番号とは別の秘密情報です。ログイン用auth_sessionsや、メール確認用auth_action_tokensとも用途を区別します。


## 予約枠・日別上限

<a id="table-store_weekly_capacity"></a>

### 22. `store_weekly_capacity`

「月曜日は5台、土曜日は10台」のような、曜日ごとの基本予約上限を管理します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `store_id` | `varchar` | PK・FK | — | 対象店舗。stores.idを参照します。 |
| `weekday` | `integer` | PK | — | 曜日を表す数値。0〜6を想定し、各数値と曜日の対応は実装で統一します。 |
| `capacity_points` | `integer` | — | — | その曜日の標準的な製造可能ポイント数。 |

**参照先**

- `store_id` → `stores(id)`

**組み合わせの制約**

- 複合主キー：`store_id, weekday`

<a id="table-daily_capacity"></a>

### 23. `daily_capacity`

曜日の基本上限を基にした日別の製造上限や、臨時休業を管理します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `store_id` | `varchar` | PK・FK | — | 対象店舗。stores.idを参照します。 |
| `pickup_date` | `date` | PK | — | 対象の受取日。 |
| `capacity_points` | `integer` | — | — | その日に受け付けられる製造ポイント数。 |
| `is_closed` | `boolean` | — | — | その日を受付不可・休業として扱うかどうか。 |

**参照先**

- `store_id` → `stores(id)`

**組み合わせの制約**

- 複合主キー：`store_id, pickup_date`

同時注文の枠判定では、この店舗・日付の行を排他制御の単位にする案です。曜日の設定値から必要日の行を用意し、日別値を確定して扱います。

<a id="table-capacity_holds"></a>

### 24. `capacity_holds`

決済中に予約枠を仮確保し、成功後に確定するためのテーブルです。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `order_id` | `varchar` | FK・UQ | — | 対象注文。orders.idを参照し、1注文につき最大1行を持ちます。 |
| `store_id` | `varchar` | FK | — | 枠を確保する店舗。pickup_dateと組み合わせてdaily_capacityを参照します。 |
| `pickup_date` | `date` | FK | — | 枠を確保する受取日。store_idと組み合わせてdaily_capacityを参照します。 |
| `points` | `integer` | — | — | この注文で消費する製造ポイント数。 |
| `status` | `varchar` | — | — | 仮確保・確定・解放・期限切れなどの状態。具体的な値は実装時に定義します。 |
| `expires_at` | `timestamptz` | — | ○ | 仮確保の期限。確定後はNULLにする案です。 |

**参照先**

- `order_id` → `orders(id)`
- `store_id, pickup_date` → `daily_capacity(store_id, pickup_date)`

予約上限は有効な仮確保と確定枠を合算して判定し、orders側の確定注文と二重加算しません。


## 決済・返金・通知

<a id="table-payments"></a>

### 25. `payments`

外部決済サービスでの支払い試行と結果を管理します。失敗後の再試行などを考慮し、1注文に複数行を持てます。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `order_id` | `varchar` | FK | — | 対象注文。orders.idを参照します。 |
| `provider` | `varchar` | — | — | 決済サービスの識別名。例：Stripe。 |
| `provider_payment_id` | `varchar` | — | ○ | 決済サービス側の決済ID。外部ID取得前はNULL可。 |
| `idempotency_key` | `varchar` | UQ | — | 同じ決済要求の再送を識別するキー。 |
| `status` | `varchar` | — | — | 決済処理中・成功・失敗等の状態。具体的な値は実装時に定義します。 |
| `amount` | `integer` | — | — | この決済で処理する金額。 |
| `currency` | `varchar` | — | — | 通貨。日本円ならJPYを想定します。 |
| `paid_at` | `timestamptz` | — | ○ | 決済が成功した日時。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |

**参照先**

- `order_id` → `orders(id)`

**組み合わせの制約**

- 一意：`provider, provider_payment_id`

注文状態と決済状態は別々に保持します。サービス側の決済IDはproviderとの組み合わせで一意にします。

<a id="table-refunds"></a>

### 26. `refunds`

決済に対する返金要求と処理結果を管理します。部分返金などを考慮し、1決済に複数行を持てます。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `payment_id` | `varchar` | FK | — | 返金元の決済。payments.idを参照します。 |
| `provider_refund_id` | `varchar` | — | ○ | 決済サービス側の返金ID。取得前はNULL可。 |
| `idempotency_key` | `varchar` | UQ | — | 同じ返金要求の再送を識別するキー。 |
| `status` | `varchar` | — | — | 返金の処理中・成功・失敗等の状態。 |
| `amount` | `integer` | — | — | この返金で返す金額。 |
| `reason` | `text` | — | — | 返金理由。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |
| `provider` | `varchar` | — | — | 返金を処理する決済サービス。 |

**参照先**

- `payment_id` → `payments(id)`

**組み合わせの制約**

- 一意：`provider, provider_refund_id`

返金元のサービスとproviderの一致、および成功・処理中の返金累計が元の決済額を超えないことを処理側で保証します。

<a id="table-webhook_events"></a>

### 27. `webhook_events`

決済成功等の外部通知を受信し、その処理状態を管理します。同じ通知の再送による二重処理防止に使います。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `provider` | `varchar` | — | — | イベントを送信したサービス。 |
| `event_id` | `varchar` | — | — | 外部サービス側のイベントID。 |
| `event_type` | `varchar` | — | — | 決済成功・返金更新などのイベント種別。 |
| `payment_id` | `varchar` | FK | ○ | 関連する決済。payments.idを参照します。関連付け前などではNULL可。 |
| `status` | `varchar` | — | — | 未処理・処理中・成功・失敗等の処理状態。 |
| `processed_at` | `timestamptz` | — | ○ | イベント処理が完了した日時。 |
| `received_at` | `timestamptz` | — | — | イベントを受信した日時。 |
| `last_error` | `text` | — | ○ | 最後の処理失敗内容。 |

**参照先**

- `payment_id` → `payments(id)`

**組み合わせの制約**

- 一意：`provider, event_id`

providerとevent_idを一意にします。重複記録の防止に加え、処理状態と注文・決済更新の整合も必要です。

<a id="table-email_deliveries"></a>

### 28. `email_deliveries`

注文受付・受取可能通知・会員確認など、メール送信の結果と再試行を管理します。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `order_id` | `varchar` | FK | ○ | 関連する注文。orders.idを参照します。会員確認メール等ではNULL可。 |
| `template` | `varchar` | — | — | 使用するメールの種類・テンプレート。 |
| `dedupe_key` | `varchar` | UQ | — | 同じ通知を識別するキー。重複した送信処理の作成防止に使います。 |
| `status` | `varchar` | — | — | 送信待ち・成功・失敗等の状態。 |
| `attempt_count` | `integer` | — | — | 送信を試みた回数。 |
| `sent_at` | `timestamptz` | — | ○ | 送信成功と判定した日時。受信者が読んだ日時ではありません。 |
| `user_id` | `varchar` | FK | ○ | 関連する会員。users.idを参照します。 |
| `recipient_email` | `varchar` | — | ○ | 送信時点の宛先スナップショット。保持期限後は破棄します。 |
| `created_at` | `timestamptz` | — | — | このレコードを作成した日時。 |

**参照先**

- `order_id` → `orders(id)`
- `user_id` → `users(id)`

作成時は注文または会員の少なくとも一方へ関連付ける設計です。後の匿名化・参照解除との整合も決めます。送信結果は管理しますが、開封状況や生の認証トークンは保存しません。


## 共通制御・展示

<a id="table-rate_limits"></a>

### 29. `rate_limits`

ログイン試行・注文照会等の回数を数え、一定期間の操作制限に使います。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `scope` | `varchar` | PK | — | 制限対象の操作。ログイン・注文照会・キャンセル等を区別します。 |
| `key_hash` | `varchar` | PK | — | 制限対象の識別値のハッシュ。IPやアカウント等から、操作に応じたキーを作ります。 |
| `window_started_at` | `timestamptz` | — | — | 現在の集計期間を開始した日時。 |
| `attempts` | `integer` | — | — | 現在の集計期間内の試行回数。 |
| `blocked_until` | `timestamptz` | — | ○ | 操作を停止する期限。停止中でなければNULL。 |

**組み合わせの制約**

- 複合主キー：`scope, key_hash`

何回で制限するか、何分間数えるかは、このテーブルに設定値としては保存せず、処理側のルールで決めます。

<a id="table-demo_sessions"></a>

### 30. `demo_sessions`

展示会で来場者ごとに体験を区切る場合に使う任意テーブルです。

| カラム | 型 | キー | NULL可 | 役割 |
|---|---|---|---|---|
| `id` | `varchar` | PK | — | このテーブルのレコードを識別するID。 |
| `started_at` | `timestamptz` | — | — | 展示体験を開始した日時。 |
| `expires_at` | `timestamptz` | — | — | 体験セッションの有効期限。 |
| `ended_at` | `timestamptz` | — | ○ | 体験を終了した日時。未終了ならNULL。 |

designsとordersから参照し、「この体験のデザイン・注文だけリセットする」といった処理に使います。セッションIDの存在だけでデモ機能を許可せず、サーバー側設定を確認します。

## 混同しやすいテーブル・カラム

| 対象 | 違い |
|---|---|
| users / user_profiles | アカウント・本人確認状態と、プロフィール・既定連絡先 |
| user_profiles / order_contacts | 今の会員情報と、注文時点で固定した連絡先 |
| auth_sessions / auth_action_tokens / order_access_tokens | 継続的なログイン、確認・再設定の一度限りの操作、特定注文のゲスト照会権限 |
| designs / design_publications / order_design_snapshots | 編集用、公開用の固定データ、注文・製造用の固定データ |
| designs.forked_from_publication_id / design_publications.source_design_id | 自分のコピー元の公開作品と、公開作品を作った作者の元デザイン |
| placements / order_items | 飾り1個ごとの配置と、請求金額の内訳 |
| orders.status / payments.status / refunds.status | 注文・製造の進行、決済処理の状態、返金処理の状態 |
| store_weekly_capacity / daily_capacity / capacity_holds | 曜日ごとの基本上限、具体的な日の上限、注文ごとの枠確保 |
| version / schema_version | 編集データの更新番号と、保存JSONの形式バージョン |

## 実装時に別途保証するルール

このDBMLは保存先と主要な関連を示す設計案です。カラムや通常の外部キーを置くだけで、以下の動作が自動的に保証されるわけではありません。

- 会員本人・所属店舗の操作権限を確認する。ゲストデザインの編集権限も別途定義する。
- 利用中会員のメール必須、メール正規化、本人確認済み状態を検証する。
- ログイン・確認・再設定トークンの期限、用途、使用済み・失効状態を確認する。
- 公開版と注文時のスナップショットを変更不可とする。configurationのJSON形式をschema_versionと合わせて定義する。
- 同じ店舗のデザイン・パーツ・公開作品・注文であることを、複合外部キーまたは処理内の検証で保証する。
- 数量は正、単価は非負、明細金額は単価×数量、注文合計は小計＋税とする。
- 明細合計と注文小計の一致、返金累計の上限、同時注文時の予約枠上限を、必要なロックとトランザクションで保証する。
- 注文状態の変更とorder_status_logsの追加を同じトランザクションで行う。許可する状態遷移を定義する。
- ゲスト注文を会員へ紐づける場合、メールアドレスの一致だけではなく注文の操作権限も確認する。
- 退会・保持期限に応じて個人情報を匿名化・削除する。注文・決済・監査履歴は個別の保持方針で扱う。
- DBMLでvarcharのままになっているstatus、kind、scope、actor_type等は、実装前に候補値と意味を定義する。

## 文書の範囲

- 対象：[cakecanvas-db-v4-unified.dbml](./cakecanvas-db-v4-unified.dbml)
- 説明対象：30テーブル・215カラム・41の外部キー
- 1注文1ケーキ・店頭受取、メール＋パスワード認証を想定。
- 配送住所、生年月日、SNSログイン、会員への月額課金などは今回の設計に含めていません。
