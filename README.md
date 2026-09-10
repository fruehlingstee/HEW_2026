# CakeCanvas

5号ケーキの色と飾りを指定し、3Dプレビューと店舗向け製造指示書を同じ配置データから生成する、HEW 2026向けのセミオーダーケーキサービスです。Ver1.0は1店舗・1注文1台・店頭受取で開発します。

## 現在の状態

仕様書を最新決定に統一し、開発手順・PRテンプレート・CIひな形を整備しています。**アプリとpackage.jsonはまだありません。依存パッケージ追加の確認後に初期化します。現時点ではnpm ci / npm run devを実行できません。**

## 最初に読む資料

- [最新の決定・進捗](plan/status.md)
- [企画・機能仕様](plan/kikaku.md)
- [担当・技術の境界](plan/technical-assignments.md)
- [開発手順・構成・初期化案](docs/development.md)
- [共同開発のルール](CONTRIBUTING.md)

最新決定はstatus.mdを優先し、仕様変更は4人全員の合意後に本文へ反映します。リポジトリ名の方針はHEW_2026、サービス名はCakeCanvasです。

## 開発環境

Node.js **24.21.0 LTS**とnpmを使用します。`.node-version` / `.nvmrc` に同じバージョンを記録しています。npmはNode同梱版を基準にし、初期化時に実際の版を記録します。

Node.jsのLTS状態とバージョンは[公式リリース情報](https://nodejs.org/en/about/previous-releases)で2026-09-10に確認しました。

アプリ初期化後の手順は次のとおりです。package.jsonとpackage-lock.jsonが揃ってから実行してください。

```sh
npm ci
npm run dev
```

起動後は http://localhost:3000 を開きます。最初の画面は外部サービスに依存しない構成にする予定です。DB・決済接続の導入手順はその担当作業で追記します。

## チェック(アプリ初期化後)

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

CIの原案は [.github/workflows/ci.yml.example](.github/workflows/ci.yml.example) です。アプリ初期化・ローカル検証後に `ci.yml` として有効化します。現在はGitHub Actionsで実行されません。

## ファイル構成

```text
plan/                         企画、最新決定、担当分担
docs/development.md           開発手順と初期化案
memo/                        既存の参考画像
.github/pull_request_template.md
.github/workflows/ci.yml.example
CONTRIBUTING.md
```

アプリ初期化後に作るsrc配下の構成は [開発手順](docs/development.md#ディレクトリ方針) を参照してください。

## 担当

| 担当 | アカウント |
|---|---|
| バックエンド・進行 | fruehlingstee |
| 店舗側・バックエンド | buna-bunaa |
| 3D・デザイン | koyou |
| 買い手側・3D連携 | kobayashishuu0 |

## 作業上の約束

- `.env` 系ファイルにCodexは触れません。秘密情報をリポジトリ・PR・Discordへ貼り付けません。
- package.jsonのdependenciesは無断で変更しません。
- 本番デプロイ前に確認を取ります。Local・Preview・Productionを分け、PreviewとProductionのDBを共有しません。
