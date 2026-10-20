# Prisma定義（レビュー用）

2026-10-19、既存の[database.dbml](../database.dbml)をPrisma 7形式へ移し、承認された5パッケージの導入・構文検証・Client生成まで完了した。3方針の反映後は19テーブル・7列挙型・197列。DB接続、migration適用は未実施。アプリからの保存・取得はまだ動かない。

## 作成したファイル

- `schema.prisma`: モデル・リレーション・一意制約・通常index。TypeScript側をPascalCase/camelCase、DB側を既存のsnake_caseに対応させた。
- `../prisma.config.ts`: schemaとmigrationの場所を指定する。接続先はプロセス環境の`DATABASE_URL`のみを使い、.envファイルは読み込まない。接続先未設定でも定義の検証・Client生成を行える構成。
- `../src/server/db/prisma.ts`: サーバー用の`getPrisma()`。呼出時にClientを生成し、同じプロセス内で再利用する。実DBの接続確認は未実施。

IDはPrisma Client側の`cuid()`で生成する。DB側の自動採番ではないため、SQLを直接実行する場合は呼出側でIDを用意する。createdAt/updatedAtはDBML同様に呼出側で設定する。受取日はPostgreSQLのdate、監査日時はtimestamptz(6)、受付締切はtime(6)で表現する。仮の受付条件やversion初期値は追加していない。

## DBへ適用する前に必要な作業

[DB-01〜DB-09](../plan/open-questions.md)の残項目を維持している。座標5列・実測半径・共有ハッシュ・通常編集セッションは2026-10-19に追加済み。配置保存・復元と認可の処理は未実装。platform_fees・rate_limits・email_deliveriesはまだ定義していない。

削除動作は注文・holdのdesign参照をSetNull、配置・パレットをCascade、参照中Part・Store・通常編集セッションをRestrictとする。active holdのdesign非NULLとDesignの通常/デモ所有セッション排他条件はCHECK設計で補う。その他は暫定NoActionを明示し、FK全件の残レビューを行う。更新動作はNoAction。

DBMLのCHECK制約はschema内のコメントへ保持した。コメントは制約を実行しない。初回migration作成時にSQLへ追加し、実DBで拒否されることを確認する。activeなholdだけに適用する`UNIQUE(design_id) WHERE status = 'active'`も必要で、全holdへの通常の一意制約に置き換えない。

店舗・デザイン・受取日の一致、返金と決済の対応、デモへの決済混入防止、注文時ロック、明細合計の照合は単列FKだけでは保証されない。設計合意と実装・検証が済むまで`db push`やmigrationの作成・適用を行わない。

## 導入済みパッケージ

| 区分 | パッケージ | 用途 |
|---|---|---|
| devDependencies | prisma@7.10.1 | 定義検証、Client生成、migration管理 |
| dependencies | @prisma/client@7.10.1 | 生成Clientのランタイム |
| dependencies | @prisma/adapter-pg@7.10.1 | PostgreSQL接続アダプター |
| dependencies | pg@8.23.1 | PostgreSQLドライバー |
| devDependencies | @types/pg@8.23.1 | 接続コードの型定義 |

2026-10-19にnpmレジストリでバージョンを確認した。latestタグは8.0.0-rc.23だったため、7系の安定版を採用した。上記5パッケージを固定バージョンでpackage.json/lockfileへ追加済み。既存のlockfileにあるパッケージのバージョン変更はない。外部DBは作成していない。

## 作成時の検証

- 当初18モデル・184列から、3方針反映後はDBMLと同数の19モデル・7列挙型・197列、24参照の両側に48リレーションフィールドを定義。
- TypeScriptの型チェック（`tsc --noEmit --incremental false`）成功。
- Prisma CLIのformat・validate・generate成功（Client 7.10.1）。
- ESLint成功。生成物はESLintとGitの対象外に設定済み。
- 実DBテスト・Next.jsビルドは未実施。.env系ファイルの自動読み込みを避け、型確認はNext.jsコマンドを経由せずtscを直接実行した。
- npm auditは既存のNext.js・ESLint関連などに9件（high 8、critical 1）を報告した。今回追加した5パッケージは報告対象に含まれない。既存依存の更新・audit fixは実施していない。

新規チェックアウトでは`npm ci`後、以下を実施する（DB接続・データ変更なし）。

```sh
npm run db:format
npm run db:validate
npm run db:generate
```

生成先は`src/generated/prisma`。生成物はGitに含めず、CIでは依存インストール後、型チェック前にvalidateとgenerateを実行する。次に合意済み設計に対してmigration・seed・DB制約テストを進める。

## アプリからの利用

Node.jsで動くServer Components、Server Actions、Repositoryから次のように使う。接続先の設定とDBへのテーブル作成が済んだ後の例であり、現段階ではまだ画面へ組み込んでいない。

```ts
import { getPrisma } from "@/server/db/prisma";

const store = await getPrisma().store.findUnique({
  where: { slug: storeSlug },
  select: { id: true, name: true },
});
```

`server-only`でClient Componentsからの取り込みを防ぐ。Next.jsが内部で処理するマーカーのため追加パッケージは不要（[公式説明](https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning)）。VitestではNodeテスト用にこのマーカーだけをNext.js内蔵の空モジュールへ解決する。ブラウザー向けビルドでの境界検証は今回未実施。

`getPrisma()`はプロセス環境の`DATABASE_URL`を利用する。.envファイルはこのモジュールから読み込まない。未設定・不正URLは固定メッセージで通知し、入力URLをエラーメッセージへ含めない。クエリログは有効化していない。

接続プールは1プロセス最大5接続、接続待ち10秒、アイドル30秒とする初期設定。プロセス数に応じて合計接続数が増えるため、DB接続先が決まった時点で上限と照合する。SSLは接続URL・ドライバーの設定に従い、証明書検証を無効化しない。接続先や生成スキーマを変更した場合はサーバーを再起動する。リクエストごとに`$disconnect()`しない。

接続モジュールの6テストは、実Clientを使って遅延生成・再利用・不正設定の拒否を確認する。クエリ・`$connect()`は呼んでおらず、DBへの到達性・認証・SQL実行を検証したものではない。Vitestの.env自動読み込みも無効化している。

形式の根拠: [Prisma 7 schema reference](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference)、[Prisma config reference](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)。
