# 開発手順と基盤の残作業

## 現在の到達点

Next.js・TypeScript・Tailwind CSSの最小画面、ESLint・Vitest・PostCSS設定、package.json・lockfile、CIを作成済み。DB・業務ロジック・3D・購入画面・店舗画面は未実装。

[PR #86](https://github.com/fruehlingstee/HEW_2026/pull/86) は2026-09-16確認時点で未マージ。レビュー・統合と、Prisma導入を含む [#28](https://github.com/fruehlingstee/HEW_2026/issues/28) の完了を区別する。設計の確認案と作業依存関係は [開発着手レビュー](../plan/development-readiness.md) を参照する。

## ランタイムと起動

.node-versionと.nvmrcのNode.js 24.21.0を使用する。2026-09-16のローカル確認値はNode.js 24.21.0、npm 11.19.0。バージョンファイルだけではNodeはインストールされない。

基盤を含むブランチを取得後、リポジトリのルートで順に実行する。

```sh
node --version
npm --version
npm ci
npm run dev
```

http://localhost:3000 にCakeCanvasの名称とキャッチコピーが表示される。PowerShellでnpmの実行ポリシーエラーが出る場合は `npm.cmd` を使う。最小画面はDB・決済接続なしで起動できる。

## 導入済み・後続の依存関係

| 区分 | 導入済み |
|---|---|
| dependencies | next、react、react-dom |
| devDependencies | TypeScript、Node/Reactの型、ESLint、eslint-config-next、Vitest、Tailwind CSS、PostCSS関連 |

実際のバージョンはpackage.jsonとpackage-lock.jsonを参照する。既存依存関係の承認状況はPRレビューで確認する。

Prisma・DB接続関連は#28、Zodは#36、R3F/dreiは#41など、担当機能の着手時に必要分を追加する。パッケージ追加前に具体的な名前・バージョン・用途・差分を提示する。採用方針だけを追加承認の証跡にしない。

Vercel接続作業ではCLIの導入を推奨する（`npm i -g vercel`）。プロジェクトの依存関係とは別に導入する。接続情報の設定は担当者が行い、Codexは.env系ファイルを読み書きしない。

## ディレクトリ方針

[共通の構成](../plan/issue-reference/02-file-structure.md) を優先する。現時点の実装は `src/app/page.tsx`、`layout.tsx`、`globals.css` のみ。

- `src/app`: URL、ページの組み立て、Route Handler。
- `src/features`: customization、editor-3d、overview-svgなどの画面機能。
- `src/domain`: React・DB・外部SDKに依存しない型・純粋ロジック。
- `src/server`: actions、services、repositories、db、integrations。
- `src/components/ui`: 共通UI。
- `public/models`: モデルと由来・ライセンス。
- `prisma`: モデル、migration、seed。

将来用の空ディレクトリは作らない。import aliasは `@/* → src/*`。テストは対象の近くに `*.test.ts` を置く。現在のVitest設定はNode環境・`src/**/*.test.ts` が対象で、ReactコンポーネントのDOMテスト環境は未導入。

## 開発コマンド

| コマンド | 内容 |
|---|---|
| npm run dev | next dev |
| npm run build | next build |
| npm start | next start |
| npm run typecheck | next typegen && tsc --noEmit |
| npm run lint | eslint . |
| npm test | vitest run --passWithNoTests |
| npm run test:watch | vitest |

テスト本体は未作成。`--passWithNoTests` による正常終了をテストの実施・成功件数に数えない。最初の業務ロジックのテスト追加時にこのオプションを削除する。

## CIと検証

[ci.yml](../.github/workflows/ci.yml) はmain向けPR、mainへのpush、手動実行で起動し、Node固定版 → npm ci → 型チェック → ESLint → Vitest → ビルドを実行する。

PR #86のコミット `95a3d2befaf89cd28f121ef33386452980c1e229` は [CI成功](https://github.com/fruehlingstee/HEW_2026/actions/runs/34552046180)。PR本文にはローカルの型チェック・lint・ビルド・画面確認の報告がある。後続変更は対象コミットごとに検証する。

## #28の残作業

- [ ] 基盤PRのレビューと統合、依存関係の承認状況の確認。
- [ ] Prismaのバージョン、generator、接続方式、必要なアダプターを確認し、追加差分を提示する。
- [ ] 承認後にPrismaの最小構成を導入する。業務モデルは#29以降で扱う。
- [ ] #29が必要とするPrisma導入の開始条件を満たす。
- [ ] 別メンバーがREADMEからインストール・起動を再現する。

Prisma導入後のmigration・seed・DB制約テストは#34の成果物。基盤のCI成功だけで#27の設計合意や#34のDB検証を完了にしない。
