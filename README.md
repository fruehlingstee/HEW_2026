# CakeCanvas

5号ケーキの色と飾りを指定し、3Dプレビューと店舗向け製造指示書を同じ配置データから生成する、HEW 2026向けのセミオーダーケーキサービスです。Ver1.0は1店舗・1注文1台・店頭受取で開発します。

## 現在の状態

Next.js・TypeScript・Tailwind CSSの最小画面と開発コマンドを作成済みです。DB・3D・購入・店舗画面は未実装です。

基盤の [PR #86](https://github.com/fruehlingstee/HEW_2026/pull/86) は2026-09-16確認時点で未マージです。利用するブランチにpackage.json、package-lock.json、.github/workflows/ci.ymlが揃っていることを確認してください。

直近の作業・設計確認案・開始条件は [開発着手レビュー](plan/development-readiness.md) にまとめています。設計案はチーム合意前であり、確定仕様と区別します。

## 最初に読む資料

- [最新の決定・進捗](plan/status.md)
- [企画・機能仕様](plan/kikaku.md)
- [担当・技術の境界](plan/technical-assignments.md)
- [開発手順と基盤の残作業](docs/development.md)
- [共同開発のルール](CONTRIBUTING.md)

最新決定はstatus.mdを優先し、仕様変更は4人全員の合意後に本文へ反映します。リポジトリ名はHEW_2026、サービス名はCakeCanvasです。

## 開発環境と起動

Node.js **24.21.0**を.node-versionと.nvmrcに固定しています。2026-09-16のローカル確認値はNode.js 24.21.0、npm 11.19.0です。

基盤を含むブランチを取得し、リポジトリのルートで実行します。

```sh
npm ci
npm run dev
```

http://localhost:3000 を開くとCakeCanvasの名称とキャッチコピーが表示されます。この最小画面はDB・決済接続を必要としません。Windows PowerShellでnpmの実行ポリシーエラーが出る場合は `npm.cmd ci`、`npm.cmd run dev` を使用してください。

## チェック

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

CIは [.github/workflows/ci.yml](.github/workflows/ci.yml) で定義し、main向けPR・mainへのpush・手動実行に対応しています。[PR #86のCI](https://github.com/fruehlingstee/HEW_2026/actions/runs/34552046180) は成功済みです。これは当該コミットの結果であり、後続変更の成功を保証するものではありません。

テスト本体は未作成です。`npm test` は `--passWithNoTests` によりテスト0件でも正常終了します。最初の業務ロジックのテスト追加時にこのオプションを外します。

## ファイル構成

```text
plan/                         企画、最新決定、担当分担、設計案
docs/development.md           開発手順と基盤の残作業
src/app/                      最小画面、共通レイアウト、CSS
package.json                  開発コマンドと依存関係
package-lock.json             npm ci用の固定依存関係
memo/                         既存の参考画像
.github/pull_request_template.md
.github/workflows/ci.yml
CONTRIBUTING.md
```

後続機能の配置は [ファイル構造と依存方向](plan/issue-reference/02-file-structure.md) を参照してください。将来用ディレクトリは必要なファイルを作る時点で追加します。

## 担当

| 担当 | アカウント |
|---|---|
| バックエンド・進行 | fruehlingstee |
| 店舗側・バックエンド | buna-bunaa |
| 3D・デザイン | koyou |
| 買い手側・3D連携 | kobayashishuu0 |

## 作業上の約束

- .env系ファイルにCodexは触れません。秘密情報をリポジトリ・PR・Discordへ貼り付けません。
- package.jsonのdependenciesは無断で変更しません。
- 本番デプロイ前に確認を取ります。Local・Preview・Productionを分け、PreviewとProductionのDBを共有しません。
