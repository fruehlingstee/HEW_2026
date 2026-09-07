# Issue 参照マップ

各 Issue に着手するときは、まず [README.md](./README.md) の優先順位を確認し、この表から必要な設計資料へ進む。Issue 本文と設計資料が食い違う場合は `plan/status.md` を優先し、判断結果を Issue に記録する。

略記:

- TS: [技術スタック](./01-technical-stack.md)
- FS: [ファイル構造](./02-file-structure.md)
- FN: [関数契約](./03-function-contracts.md)
- DB: [DB設計](./04-database-design.md)
- ER: [ER図](./05-er-diagram.md)
- BL: [業務ロジック](./06-business-logic.md)
- UI: [画面遷移](./07-screen-flow.md)

## Phase 0: DB・基盤

| Issue | 参照 | 完了時の成果物 |
|---|---|---|
| #27 DB-01 ドメイン・ER・状態 | DB, ER, BL | 用語、ER、状態遷移の合意 |
| #28 DB-02 Next/TS/Prisma 基盤 | TS, FS, DB | 起動可能な基盤と Prisma 接続 |
| #29 DB-03 店舗・パーツ・アレルゲン | DB, ER | Prisma models、制約、CRUD確認 |
| #30 DB-04 designs / placements | FN, DB, ER | モデル、配置順制約、ロック |
| #31 DB-05 orders / snapshot / status | FN, DB, BL | 注文・明細・履歴、価格snapshot |
| #32 DB-06 capacity / hold | FN, DB, BL | 容量モデルと15分hold |
| #33 DB-07 payments / refunds / logs | FN, DB, BL | 決済・Webhook・返金・送信履歴 |
| #34 DB-08 migration / seed / tests | DB, ER, TS | migration、seed、DBテスト |

## Phase 1: アプリ骨格・購入導線

| Issue | 参照 | 完了時の成果物 |
|---|---|---|
| #35 APP-01 routes / layout / tokens | TS, FS, UI | App Router骨格と共通UI |
| #36 DATA-01 Zod / pricing / tax | FN, BL | schema、価格計算、単体テスト |
| #37 BUY-01 静的購入フロー | FS, UI | 画面間を通せる静的プロトタイプ |
| #38 DESIGN-01 design CRUD / share | FN, DB, UI | 作成・保存・ロック・共有取得 |
| #39 BUY-02 実データ購入画面 | FN, BL, UI | CRUD接続済み購入導線 |

## Phase 2: 3D・SVG

| Issue | 参照 | 完了時の成果物 |
|---|---|---|
| #40 3D-01 GLB | TS, FS, UI | 軽量GLBと読み込み確認 |
| #41 3D-02 R3F | TS, FS, UI | R3Fシーン、カメラ、照明 |
| #42 3D-03 drag placement | FN, BL, UI | ドラッグ・回転・拡縮・上限制御 |
| #43 3D-04 DB persistence | FN, DB, ER | 配置保存・復元・競合処理 |
| #44 SVG-01 top view | FS, FN, UI | 3D状態と同期する上面図 |
| #45 3D-05 Go/NoGo | UI, TS, BL | 性能判定とフォールバック決定 |

## Phase 3: 注文・決済

| Issue | 参照 | 完了時の成果物 |
|---|---|---|
| #46 ORDER-01 availability | FN, DB, BL, UI | JST基準の空き日API/UI |
| #47 ORDER-02 15m hold | FN, DB, BL | 競合安全なhold・期限解放 |
| #48 ORDER-03 guest / snapshot | FN, DB, BL, UI | ゲスト注文と全snapshot |
| #49 ORDER-04 pickup / access / rate | FN, DB, BL | 受取連番、token hash、制限 |
| #50 PAY-01 Stripe / webhook | FN, DB, BL | PaymentIntent、署名・冪等Webhook |
| #51 PAY-02 complete / email | FN, BL, UI | 完了画面と受付メール |

## Phase 4: 店舗管理

| Issue | 参照 | 完了時の成果物 |
|---|---|---|
| #52 STORE-01 auth | TS, FS, UI | 店舗ログインとtenant境界 |
| #53 STORE-02 orders / status | FN, DB, BL, UI | 一覧・詳細・状態更新・履歴 |
| #54 STORE-03 parts CMS | DB, BL, UI | パーツ・価格・asset管理 |
| #55 STORE-04 capacity calendar | FN, DB, BL, UI | 曜日枠・日別上書き画面 |
| #56 PRINT-01 instruction sheet | DB, BL, UI | 色・配置・message・allergen指示書 |

## Phase 5: 運用機能

| Issue | 参照 | 完了時の成果物 |
|---|---|---|
| #57 LOOKUP-01 access link | FN, BL, UI | 安全なゲスト照会 |
| #58 REFUND-01 decision engine | FN, BL | 返金判定と境界値テスト |
| #59 REFUND-02 Stripe / fees | FN, DB, BL | 冪等返金と手数料再計算 |
| #60 NOTIFY-01 emails | FN, DB, BL | テンプレート、履歴、再送 |
| #61 PRIVACY-01 cleanup | FN, DB, BL | 匿名化・期限削除処理 |
| #62 DEMO-01 demo / reset | BL, UI | 決済・PII・本番枠なしのデモ |
| #63 SHARE-01 QR / image | FN, BL, UI | 個人情報なし共有、QR、画像保存 |

## Phase 6: テスト・品質

| Issue | 参照 | 完了時の成果物 |
|---|---|---|
| #64 TEST-01 unit | FN, BL, TS | 価格・税・日付・状態・返金テスト |
| #65 TEST-02 concurrency / integration | FN, DB, BL | hold・採番・Webhook競合テスト |
| #66 QA-01 E2E | UI, BL | 購入・決済・店舗処理のE2E |
| #67 QA-02 performance / a11y / security | TS, UI, BL | 3D性能、a11y、tenant/token検証 |
| #68 RC-01 freeze | 全資料 | 2027-01-31凍結、残件分類、RC |

## Phase 7: 任意機能・展示

| Issue | 参照 | 完了時の成果物 |
|---|---|---|
| #69 OPT-01 image print decision | BL, DB, UI | 2027-01-15採否、著作権・保存方針 |
| #70 EX-01 dual display | UI, FS | PC 1台 + モニター2台の展示構成 |
| #71 EX-02 offline fallback | UI, BL | SVG・静止画・録画への切替 |
| #72 EX-03 docs / presentation | 全資料 | 操作手順、説明資料、発表資料 |
| #73 EX-04 rehearsal | UI, BL | 通しリハーサルと修正一覧 |
| #74 EX-05 event / cleanup | BL, DB | 当日運用、デモデータ清掃報告 |

## Epic・Roadmap

| Issue | 対象 |
|---|---|
| #75 | #27–#34: DB・基盤 |
| #76 | #35–#39: アプリ骨格・購入導線 |
| #77 | #40–#45: 3D・SVG |
| #78 | #46–#51: 注文・決済 |
| #79 | #52–#56: 店舗管理 |
| #80 | #57–#63: 運用機能 |
| #81 | #64–#68: テスト・品質 |
| #82 | #69–#74: 任意機能・展示 |
| #83 | 全体ロードマップ。本ディレクトリの入口もここから参照する |

## Issue 本文へ最低限書くこと

- 参照資料へのリンク
- 目的と非目的
- 入出力または対象画面
- DB変更と migration の有無
- 正常系・異常系・境界値
- 完了条件と確認方法
- 担当、レビュー担当、依存 Issue
- 仕様判断が発生した場合の結論と日付
