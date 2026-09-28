# DB現状調査・設計レビュー

確認日: 2026-09-28  
対象: ローカル `chore/setup-ci` / `ffdcd40749f7696c3a13c93c7b04cacbd8a7db0e`

## 結論

Neon PostgreSQL + Prismaという採用方針を変更する理由は、今回の要件照合では見つからなかった。ただし、このチェックアウトはDB未実装であり、現在のDB設計書にも補完・整合修正が必要。そのまま確定スキーマとして実装できる状態ではない。

外部Neon上のDB作成状況、実テーブル、接続先、疎通、適用済みmigrationは未確認。`.env`系ファイルは読まず、接続情報の推測や外部DBへの操作も行っていない。「ローカルにDB実装がない」と「外部DBが存在しない」は別の判断である。

## 調査範囲

- プロジェクトのファイル一覧とルートディレクトリを確認。
- README、CONTRIBUTING、docs/development、plan直下5資料、issue-reference全9資料、ソース3ファイル、設定・CI・PRテンプレートを通読。
- package-lock.json全体をJSONとして読み込み、ルート依存とDB関連パッケージの有無を確認。
- memoのPNG全4点を目視確認。`memo/画面構成.md`は0バイト。
- 自動生成のnext-env.d.tsを確認。
- `.env`系、`.git`内部、node_modulesのライブラリ本体、`.next`とtsconfig.tsbuildinfoの生成物は内容の通読対象外。全ファイルの内容を読んだという意味ではない。
- リモートのIssue・PR状態は今回再取得していない。資料の2026-09-16時点の状況を現在の状況と断定しない。

## 現在あるもの・ないもの

| 領域 | 確認結果 |
|---|---|
| src/app | page.tsx、layout.tsx、globals.cssのみ。名称・キャッチコピーの静的表示 |
| plan / plan/issue-reference | 仕様・DB設計・ER図・関数契約・作業順の資料 |
| docs | 開発手順。DB未実装と明記 |
| memo | 画面参考画像4点と空のMarkdown |
| .github | CIとPRテンプレート。DB用サービスやmigration検証はない |
| package.json / lockfile | next、react、react-domが実行依存。Prisma・Neon・pgの導入は確認できない |
| prisma / prisma.config.ts | 存在しない。スキーマ・migration・seedなし |
| src/server / src/domain | 存在しない。DBクライアント・Repository・業務処理なし |
| DBテスト | 存在しない。VitestはpassWithNoTestsで、終了コード0だけでは検証済みにならない |

## 優先して修正する点

2026-09-28調査後の対応: 項目1の保存方式は本チャットで採用し、関連設計資料へ反映済み。parts.kind、placements.color、design_palette_colorsを使い、実配置だけを課金対象にする。以下の調査時点の記述は履歴として残す。形・配置上限等の未決事項、DB実装・実DB検証は引き続き残る。

以下は設計レビューであり、合意済み仕様への変更ではない。既存の[開発着手レビュー](../plan/development-readiness.md)のD1〜D5を再確認し、追加の不足も記載した。

### 1. 外周デコを保存・再計算できる項目が不足

根拠: [status 商品仕様](../plan/status.md)、[DB設計 designs / placements](../plan/issue-reference/04-database-design.md)、[価格関数契約](../plan/issue-reference/03-function-contracts.md)。

確定仕様は1個20円、実使用の白以外の色1色50円、パレット再利用。しかしplacementsには種別・各配置の色がなく、パレットの保存先もない。calculateQuoteの入力も通常飾りと外周デコを区別しない。復元時に色を失い、保存データから価格を再計算できない。

修正案: 通常飾りと外周デコの種別、配置色、デザイン単位のパレットを定義する。プリセットは個々の配置へ展開し、実配置から課金する。通常飾り上限12個との関係・形・配置範囲は未確定のため、列名だけ先に決めて実装しない。

### 2. パーツの提供可否が確定仕様と矛盾

2026-09-28対応済み: DB設計のparts.is_activeを削除し、indexをparts(store_id, sort_order)へ修正した。stores.is_activeは維持。以下は調査時点の記録。参照中パーツの削除制約・実DBへの適用は未完了。

根拠: [status](../plan/status.md)は在庫数・提供可否なし、[DB設計](../plan/issue-reference/04-database-design.md)はparts.is_activeと対応indexあり。

修正案: parts.is_activeをモデル案とindex案から除き、参照中パーツの削除可否を別途定義する。stores.is_activeとは区別する。

### 3. 注文内容を固定する時点と保存先が不明確

2026-09-28対応済み: pending作成時に注文・明細・snapshot・デザインロックを同一トランザクションで確定する設計へ更新した。座標はロック済みplacements、表示値・金額は注文snapshotを正とする。期限切れ・キャンセル後は複製して再注文する。以下は調査時点の記録。実装・競合テスト・詳細な削除制約は未完了。

根拠: status・企画書は「注文確定時」、関数契約・業務ロジックは「注文作成後」にデザインをロック。DB共通方針は色・メッセージ・税などもsnapshotとするが、ordersの列一覧にはそれらの保存先がない。

影響: 支払待ち中の変更で、決済金額と製造内容が一致しなくなる。マスタ更新後の名称・モデルと、配置番号に対応する指示書明細も保証できない。

修正案: pending作成時に価格・税率・色・メッセージ・配置・アレルゲンを同一トランザクションで固定する案を採用判断する。製造内容は不変のDesign参照または表示用snapshotのどちらを正とするか明記する。order_itemsとplacementのseq_noを結び付ける規則を決める。現行のorders.design_id一意を維持するなら、失敗・期限切れ後の再注文は複製を使う。

### 4. 予約枠・決済の競合処理は概念だけで、実行契約が不足

2026-09-28対応: [競合処理の実行契約](../plan/issue-reference/09-capacity-payment-concurrency.md)を追加。店舗行ロック、枠集計対象、1注文1Intent、期限後全額返金、未処理Webhook・返金の復旧と受入条件を関連資料へ反映した。以下は調査時点の指摘。実装・実DBテスト・外部サービス設定は未実施。

根拠: [DB設計 競合制御](../plan/issue-reference/04-database-design.md)、[業務ロジック](../plan/issue-reference/06-business-logic.md)、開発着手レビューD3。

- 店舗・日付のロック対象を具体化する。日別行がない場合の作成とロックも必要。
- 同一designへの重複active holdをどう防ぐか、期限切れ解放と新規作成の順序を定義する。
- 枠に算入する注文状態を列挙する。confirmedだけ数える実装では製造中へ進んだ注文の枠が戻ってしまう。
- hold期限後の決済成功は、枠を再確保できる場合と全額返金が必要な場合を分ける。
- WebhookはイベントID重複だけで成功扱いにしない。業務反映前に失敗したイベントを再処理可能にする。
- refundの異なる冪等キーでの同時申請でも過剰返金させない。成功額だけでなく処理中の返金も考慮する。

これらは列追加だけでは解決しない。トランザクション、状態条件付き更新、再試行と実DBでの同時実行テストが必要。

### 5. デモ・店舗設定・認証の保存項目が不足

根拠: [status デモ仕様](../plan/status.md)、[企画書5-B・5-D](../plan/kikaku.md)、DB設計のstores・orders。

- orders.is_demoが列一覧にない。個人情報のNULL許容、デモでの番号採番、決済・枠の対象外条件を定義する。
- storesの住所・電話・店舗注記・min_lead_days・max_advance_days・order_cutoff_timeが具体化されていない。
- 自前店舗ログインで企画書が指定するパスワードハッシュの列がない。ログイン識別子、セッションの失効方法も契約化する。署名Cookie方式なら必ずしもsessionテーブルは必要ではない。
- 店舗設定の値やハッシュを公開用店舗レスポンスへ混在させない。

### 6. 店舗をまたぐ参照を防ぐ制約が未定義

根拠: DB共通方針は店舗データにstore_id必須だが、子テーブルの一覧は親参照のみ。orders.store_idとdesigns.store_id、placementsのdesignとpart、holdとorderの所属一致の制約がない。

修正案: 親経由で所属を導出する表と、複合外部キーのためにstore_idを保持する表を明記する。たとえば(store_id, design_id)と(store_id, part_id)で同店舗参照を強制する案を検討する。refund.payment_idとrefund.order_idの対応も同様に保証する。

行内の金額・数量の範囲はCHECK、参照整合性は外部キー、複数行の集計はトランザクション等で扱う。PostgreSQLのCHECKでは他行・他テーブルを参照する整合性を保証できない。[PostgreSQL公式制約資料](https://www.postgresql.org/docs/18/ddl-constraints.html)

### 7. 削除方針とER図が一致しない

根拠: DB設計末尾はorders.design_idをnullable / SET NULLにするが、ER図はordersから必須のdesign参照を表す。capacity_holds.design_idの削除時動作も未定義。

修正案: FKごとにNULL許容とON DELETEを一覧化する。期限後は配置・共有情報・個人情報を消しても、orders・payments・refunds等の財務履歴は残す。holdの参照で清掃が失敗しないか確認する。snapshotやメール・状態履歴の自由記述に残る個人情報も清掃対象として検討する。

### 8. 座標・権限・アレルゲンの契約不足

- 座標: 担当資料はrot_y、DB/ERはXYZ回転。単位、原点、回転軸、scale範囲を統一する。
- 共有: share_token_hashはあるが編集権限の保存・検証がない。公開共有用識別子で更新できない設計にする。
- アレルゲン: 企画書のcontains_type（含む/同一設備）と店舗注記がDB詳細へ反映されていない。土台・クリーム・プレートも含めて、注文全体の原材料情報をどこに登録し集計するかを定義する。

### 9. 制約と一意性の細部

- 金額>=0、数量>0、scale>0、weekdayの範囲、rate_bpsの範囲、pickup_sequenceの001〜999と上限到達時の扱いを定義する。
- total=subtotal+tax、line_total=unit_price*quantityを保存時に保証する。明細合計と注文小計の一致は複数行の検証が必要。
- rate_limitsには採用する時間窓方式に対応した一意キーと、原子的なカウンタ更新を定義する。
- platform_feesが注文ごとの現在値か履歴かを決め、再計算の重複で集計が増えないようにする。
- webhook_eventsの一意性はDB文書では(provider,event_id)、ER属性ではevent_id単独UK。表記を統一する。
- DB列名は構成資料がcamelCase、DB資料がsnake_case。Prismaの@map/@@mapを使うかを決める。

## 画像資料との関係

会員機能画像は「追加機能案」。現在のゲスト注文のみという確定仕様には含めない。店舗画像の受取時刻・商品種別、買い手画像の価格内訳も、5号固定・日単位枠・現行料金と一致するとは限らない。画像を根拠にusersや時間帯枠を追加しない。空の画面構成.mdは現状の仕様根拠にはならない。

## DBを実装可能にする順序

1. 本レビューと既存D1〜D5について、保存形式・ロック時点・再注文・期限後決済の扱いを整理し、status/DB/ER/関数契約を整合させる。
2. Prismaの採用バージョン、generator、DBドライバー/adapterを選定し、package.jsonとlockfileの具体的な追加差分を確認する。
3. schema、DBクライアント、migration、seedを作成する。既存規約どおり.env系は担当者が管理する。
4. 分離した開発DBでmigration、CRUD、制約、削除、同時実行の検証を行う。既存DBがある場合は適用前に実スキーマと履歴を読み取り比較し、リセットを前提にしない。
5. 以下の受入条件を満たした後に接続済み・DB完成と扱う。

Prismaは未導入なので接続設定の実装はまだ検証できない。接続URLの設定場所はバージョンで異なり、v7ではPrisma config、v6ではschemaの方式を区別する。[Prisma公式Connection URLs](https://docs.prisma.io/docs/orm/v7/reference/connection-urls)

Vercel接続作業時は、未導入のCLIを`npm i -g vercel`で導入することを推奨する。今回はインストールしていない。env pullは.env系へ書き込むため、現在の禁止ルール下では実行しない。

## 受入条件

- 空の開発DBへmigrationを適用し、seedを再実行しても重複しない。
- デザイン保存→読み戻しで座標・色・外周デコが一致する。
- 他店舗パーツ参照、番号重複、不正金額・数量が拒否される。
- 最後の1枠を同時要求しても確保は1件だけになる。
- hold期限切れと決済成功が競合しても過剰予約・未処理の支払が残らない。
- Webhook重複・失敗後再送で注文確定・枠・履歴が二重化しない。
- 返金同時実行・外部成功後のDB更新失敗から復旧できる。
- 価格・名称・モデルのマスタ変更で既存注文の製造内容と金額が変わらない。
- 受取日30日後の清掃で個人情報が消え、財務履歴が残る。
- デモで個人情報、決済、本番容量を使用しない。
- 共有用リンクだけではデザインを編集できない。

## 今回の検証状況

ファイル・資料・画像の静的確認のみ。DB疎通、migration、seed、業務テスト、ビルドは未実行。アプリ実装の変更はなく、既存の仕様・依存関係・外部DBも変更していない。
