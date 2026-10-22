# #27・#28の再開確認（2026-10-22）

## 確認基準

- GitHub main: `bc300a5e05de46f1c3765fb439887624928f878c`。DB設計・ER図・package.json・ファイル一覧を直接取得して確認。
- ローカル: `fix/node-security-update`、確認開始時HEAD `64ad26b`、作業ツリーに変更なし。
- PR #86と#90はマージ済み。mainのstatus.mdに残る「#86未マージ」は古い。
- PR #91はマージ済み。作成・注文はPC、注文受付後の購入者向け画面はPC・スマホ対応。
- PR #92は未完成のためマージしない。ビルド成功は2026-10-22のユーザー報告。今回のローカル検証対象には含めていない。

## GitHubとローカルの差

| 項目 | GitHub main | ローカルの確認結果 |
|---|---|---|
| Prisma基盤 | 未導入 | 7.10.1、Client生成、遅延生成するgetPrisma、CI生成手順あり |
| 配置座標 | DB資料はXYZ回転 | PrismaはposX/posY/posZ/rotY/scale。担当間レビューが必要 |
| パーツの提供可否 | parts.is_activeが残る | 削除済み。登録済みパーツを常に利用可能とする方針 |
| 共有と編集 | share_token_hashはあるが権限保存先が不十分 | DesignEditSessionと共有ハッシュを分離。認可処理は未実装 |
| 外周デコ | 詳細な保存定義なし | PartKind、配置色、DesignPaletteColorを定義 |
| 店舗・注文対応 | 単列参照中心 | DB-04の複合FK5本と親側複合一意制約4本を定義済み |
| 実DB | 今回アクセスなし | migration・seed・実DB受入テストは未実施 |

GitHubに未統合であることと、ローカルで未実装であることを区別する。ローカルの導入を最初からやり直さず、mainとの差分をレビューして取り込む。

## 実コードで確認できたDB-04

- Placement → Design: (designId, storeId)
- Placement → Part: (partId, storeId)
- Design → DemoSession: (demoSessionId, storeId)
- Order → DemoSession: (demoSessionId, storeId)
- Refund → Payment: (paymentId, orderId)

Prismaの構文検証成功は、実DB上での拒否確認ではない。Order/Holdの店舗・日付・Design一致、デモ決済禁止、所属等の更新禁止、CHECK、active holdの部分一意indexは引き続きSQL実装・実DBテストが必要。

## 次の作業と完了条件

1. **#27のレビュー**: GitHubのDB設計・ER図へローカルの採用方針を反映する差分を準備する。4人合意は未完了として維持。DB-04の制約トリガー案、DB-05〜09の未決事項を順に確定する。ここでいうDB-04はopen-questions.md内の論点番号であり、Issue #30のタスク名と混同しない。
2. **#28の基盤統合**: Prisma設定、Client、テスト、CI、導入手順をmainとの差分としてレビューする。既存ブランチにはNode更新等も含まれるため、ブランチ全体をそのまま基盤変更としてマージしない。dependenciesの新規変更は今回行っていない。
3. **接続設定の契約を整える**: 現在のprisma.config.tsはDATABASE_URLを参照するが、企画ではmigration用DIRECT_URLとアプリ用DATABASE_URLを分離する。migration着手前に設定コードと手順を一致させる。.env系ファイルへはアクセスしない。
4. **DB構築**: 設計が揃ってから開発用DBにmigration・seedを適用し、正常保存・不正参照拒否・清掃・競合を確認する。現段階でdb pushは実施しない。

## 今回の検証

- `npm.cmd run db:validate`: 成功。
- `npm.cmd run db:generate`: 成功（Prisma Client 7.10.1）。
- `npm.cmd test`: 1ファイル・6テスト成功。接続モジュールの検証であり実DB接続なし。
- `npm.cmd run lint`: 成功。
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: 成功。
- Next.jsビルドは未実行。.envの自動読み込みを避けて直接tscを使用。#92のビルド成功をこのブランチの検証結果に流用しない。

参照: [#27](https://github.com/fruehlingstee/HEW_2026/issues/27)、[#28](https://github.com/fruehlingstee/HEW_2026/issues/28)、[DB整合性案](db-integrity-contract.md)、[Prisma導入記録](../prisma/README.md)。
