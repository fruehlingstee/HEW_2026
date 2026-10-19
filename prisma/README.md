# Prisma定義（レビュー用）

2026-10-19、既存の[database.dbml](../database.dbml)にある18テーブル・7列挙型をPrisma 7形式へ移した。パッケージ導入、Client生成、DB接続、migration適用は未実施。アプリからの保存・取得はまだ動かない。

## 作成したファイル

- `schema.prisma`: モデル・リレーション・一意制約・通常index。TypeScript側をPascalCase/camelCase、DB側を既存のsnake_caseに対応させた。
- `../prisma.config.ts`: schemaとmigrationの場所を指定する。接続先はプロセス環境の`DATABASE_URL`のみを使い、.envファイルは読み込まない。接続先未設定でも定義の検証・Client生成を行える構成。

IDはPrisma Client側の`cuid()`で生成する。DB側の自動採番ではないため、SQLを直接実行する場合は呼出側でIDを用意する。createdAt/updatedAtはDBML同様に呼出側で設定する。受取日はPostgreSQLのdate、監査日時はtimestamptz(6)、受付締切はtime(6)で表現する。仮の受付条件やversion初期値は追加していない。

## DBへ適用する前に必要な作業

[DB-01〜DB-09](../plan/open-questions.md)の未決事項を維持している。座標・共有/編集認証列、platform_fees・rate_limits・email_deliveriesは定義していない。現状のPlacementだけでは配置を復元できない。

削除動作が確定済みなのは注文のdesign参照のSetNullとパレットのCascade。それ以外には暫定NoActionを明示し、Prisma既定のSetNull/Cascadeを意図せず採用しないようにした。更新動作もNoActionとするが、最終的なFK方針はレビューで確定する。

DBMLのCHECK制約はschema内のコメントへ保持した。コメントは制約を実行しない。初回migration作成時にSQLへ追加し、実DBで拒否されることを確認する。activeなholdだけに適用する`UNIQUE(design_id) WHERE status = 'active'`も必要で、全holdへの通常の一意制約に置き換えない。

店舗・デザイン・受取日の一致、返金と決済の対応、デモへの決済混入防止、注文時ロック、明細合計の照合は単列FKだけでは保証されない。設計合意と実装・検証が済むまで`db push`やmigrationの作成・適用を行わない。

## パッケージ追加案（未実施）

| 区分 | パッケージ | 用途 |
|---|---|---|
| devDependencies | prisma@7.10.1 | 定義検証、Client生成、migration管理 |
| dependencies | @prisma/client@7.10.1 | 生成Clientのランタイム |
| dependencies | @prisma/adapter-pg@7.10.1 | PostgreSQL接続アダプター |
| dependencies | pg@8.23.1 | PostgreSQLドライバー |
| devDependencies | @types/pg@8.23.1 | 接続コードの型定義 |

2026-10-19にnpmレジストリでバージョンを確認した。latestタグは8.0.0-rc.23だったため、今回は7系の安定版を候補とする。package.json/lockfileへの追加は上記5パッケージを固定バージョンで追加する案として承認を得る。既存依存の更新、外部DBの新規作成や接続先の選定は含めない。

## 作成時の検証

- DBMLと同数の18モデル・7列挙型・184列を収録し、23参照の両側に46リレーションフィールドを定義。モデル内のフィールド名重複なし。
- TypeScriptの型チェック（`tsc --noEmit --incremental false`）成功。
- Prisma CLIの構文検証・Client生成・実DBテストはパッケージ導入後に実施する。

導入後、プロジェクト内のPrisma CLIで以下を実施する（DB接続・データ変更なし）。

```sh
npx --no-install prisma format
npx --no-install prisma validate
npx --no-install prisma generate
```

生成先は`src/generated/prisma`。生成物はGitに含めず、導入時に.gitignoreおよびCIのClient生成手順を追加する。その後、サーバー専用の接続モジュールを作成し、合意済み設計に対してmigration・seed・DB制約テストを進める。

形式の根拠: [Prisma 7 schema reference](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference)、[Prisma config reference](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)。
