# 開発手順と初期構成

## 今回の到達点

README、共同開発ルール、PRテンプレート、CIひな形を用意した。アプリ・package.json・lockfileの作成と依存関係のインストールは確認待ち。DB・決済接続と本番公開は後続の作業で行う。

## ランタイム

Node.js 24.21.0 LTSを使用する。.node-versionと.nvmrcに固定し、CIも.node-versionを参照する。npmはNode同梱版を基準にし、初期化時に実行環境の版を記録する。

Windowsは対応するバージョン管理ツール、またはNode.jsの公式配布を利用する。バージョンファイルがあるだけではNode自体はインストールされない。

確認コマンド:

```sh
node --version
npm --version
```

## 追加するパッケージ案(確認待ち)

| 区分 | パッケージ | 用途 |
|---|---|---|
| dependencies | next、react、react-dom | App Routerと画面の最小構成 |
| devDependencies | typescript、@types/node、@types/react、@types/react-dom | 型チェック |
| devDependencies | eslint、eslint-config-next | コードチェック |
| devDependencies | vitest | 単体テスト実行 |
| devDependencies | tailwindcss、@tailwindcss/postcss、postcss | 採用済みCSS基盤 |

Next.jsは公式ドキュメントで確認した16.3.4を候補に、React等との互換性とレジストリの公開版を初期化時に確認する。解決した版をpackage.json・package-lock.jsonへ記録する。

Prisma、Stripe、Resend、R3F、drei、Zustand、Zod、react-hook-form、date-fns/date-fns-tz、shadcn/uiの各部品は、担当機能の着手時に必要分を追加する。採用方針は維持するが、今回の最小画面では使用しない。

## ディレクトリ方針

アプリ初期化時に次の構成を作る。空の将来用ディレクトリは、最初のファイルが必要になった時点で追加する。

```text
src/
  app/
    layout.tsx       共通レイアウト
    page.tsx         起動確認用の最小ページ
    globals.css      共通CSS
    api/             WebhookなどのRoute Handlers(導入時)
  components/
    ui/              shadcn/ui等の共通部品(導入時)
  features/
    buyer/           買い手画面・状態(④)
    editor/          3Dと配置操作(③④)
    store/           店舗画面・指示書(②)
    orders/          注文・予約・決済処理(①②)
  lib/               共通処理、サーバー側DB接続(導入時)
  types/             複数機能で共有する型(①が調整)
public/
  models/            GLB(③が追加)
prisma/
  schema.prisma      DB設計レビュー後
  migrations/        Prisma Migrateで作成
```

テストは対象の近くに `*.test.ts` を置く。アプリ内は `@/* → src/*` のimport aliasを使う。Server Componentsでデータ取得、Server Actionsでアプリ内の更新を基本とし、Webhook等をRoute Handlersで受ける。秘密情報を使う処理はクライアントへimportしない。

## 初期化後のnpm scripts

| コマンド | 中身 | 目的 |
|---|---|---|
| npm run dev | next dev | 開発サーバー |
| npm run build | next build | ビルド |
| npm start | next start | ビルド済みアプリの起動 |
| npm run typecheck | tsc --noEmit | 型チェック |
| npm run lint | eslint . | ESLint |
| npm test | vitest run --passWithNoTests | テスト |
| npm run test:watch | vitest | テスト監視 |

最小の起動用画面だけの段階ではテストは未作成と明記する。空テストで成功扱いにしない。`--passWithNoTests` は初期構築中のみ許容し、最初の業務ロジックのテスト追加時に外す。

初期化後、メンバーはリポジトリを取得して `npm ci` → `npm run dev` を実行する。現時点ではpackage.jsonがないため、この手順は実行不可。

## CIの有効化と検証

`.github/workflows/ci.yml.example` は実行可能な構成のひな形で、まだGitHub Actionsには読み込まれない。初期化後に以下を行う。

1. package.json、package-lock.json、TypeScript/ESLint/Vitest/PostCSS設定、最小画面を作る。
2. npm ci、型チェック、lint、Vitest、ビルドをローカルで実行する。
3. 起動して最小画面を確認する。
4. ひな形を `.github/workflows/ci.yml` に変更し、PRでCI実行結果を確認する。
5. GitHubのルール設定でレビュー1人以上、squash merge、CI通過を必要条件にする。

ひな形の実行内容は checkout → Node固定版 → npm ci → 型チェック → ESLint → Vitest → ビルド。テスト・ビルド用に本番DBや本番秘密情報を渡さない。DB接続導入後はCI用のテスト環境とマイグレーション方針を別途整備する。

## 完了条件

- 別のメンバーがREADMEだけを見てインストール・起動できる。
- 初期ページが表示される。
- 型チェック・lint・ビルドが通り、Vitestの実行状態が明確になっている。
- PRにレビュー依頼と検証結果があり、GitHub Actionsが実際に通る。

ドキュメントの準備だけでは「アプリ初期構築完了」としない。

## 参照した公式資料

- [Node.jsのリリースとLTS](https://nodejs.org/en/about/previous-releases)
- [Next.jsのインストール](https://nextjs.org/docs/app/getting-started/installation)
- [Vitestの導入](https://vitest.dev/guide/)

確認日: 2026-09-10。
