# 工程1：最新mainの取得・起動確認と担当者

あなたも、自分のPCで実行します。開発する4人全員が、それぞれの環境で起動・チェックできることを確認する作業です。他の人が実行しても、自分のPCの確認にはなりません。

すでに同じ最新コミットで確認済みなら、重ねて実行する必要はありません。

## 誰が何をするか

| 人物 | 自分のPCで行うこと | 取りまとめ・担当者だけの作業 |
|---|---|---|
| あなた | 下記1〜5を実行し、結果を記録 | ①に該当する場合は全員の結果も取りまとめる |
| ① fruehlingstee（バックエンド・進行） | 下記1〜5 | 全員の結果、mainのCI、未解決エラーを確認 |
| ② buna-bunaa（店舗側） | 下記1〜5 | 自分の結果を①へ報告 |
| ③ koyou（3D・デザイン） | 下記1〜5 | 自分の結果を①へ報告 |
| ④ kobayashishuu0（買い手側） | 下記1〜5 | 自分の結果を①へ報告 |

「あなた」は①〜④のいずれかに当たる本人を指し、5人目という意味ではありません。

## 実行コマンド一覧

Git Bashを使います。コマンドは上から順番に実行し、エラーが出たらそこで止めて結果を共有してください。

| 順番 | 実行する人物 | コマンド・操作 | 確認すること |
|---|---|---|---|
| 1 | 全員、各自のPC | `cd`でプロジェクトへ移動 → `git status` | 作業場所と未コミット変更 |
| 2 | 全員、各自のPC | `git fetch origin` → `git switch main` → `git pull --ff-only origin main` | 最新mainを取得 |
| 3 | 全員、各自のPC | `node --version` → `npm --version` → `npm ci` | Nodeの指定版と依存パッケージの導入 |
| 4 | 全員、各自のPC | `npm run dev` → ブラウザで画面確認 → `Ctrl + C` | 最小アプリの起動・停止 |
| 5 | 全員、各自のPC | `npm run typecheck` → `npm run lint` → `npm test` → `npm run build` | 各チェックの結果 |
| 6 | ①が取りまとめ、全員が報告 | `git rev-parse --short HEAD`、GitHubのActions画面確認 | 確認したコミット・各PCの結果・mainのCI |

### 1. プロジェクトへ移動する

あなたのPCでは次を実行します。


```bash
cd ~~~/Customizable_cake_service
git status
```

他のメンバーは、自分がリポジトリを保存した場所へ移動してください。上のパスをそのまま使う必要はありません。

未コミットの作業がある場合は、内容を確認して保存してからブランチを切り替えます。変更を消す操作はしないでください。この手順書を新規作成した直後は、このMarkdown自体も未追跡ファイルとして表示されます。

### 2. 最新mainを取得する

```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

ローカルにmainがない場合だけ、`git switch main`の代わりに次を実行します。

```bash
git switch -c main --track origin/main
```

`--ff-only`でエラーが出た場合は、ローカルとリモートの履歴が分かれている可能性があります。強制更新せず、エラーを共有してください。

### 3. バージョン確認と依存パッケージの導入

```bash
node --version
npm --version
cat .node-version
npm ci
```

Nodeは取得したmainの`.node-version`に合わせます。この手順書作成時の指定は24.21.0です。異なる場合はNodeの環境を揃えてから`npm ci`へ進みます。

`npm ci`は登録済みの依存パッケージをlockfileに従って導入する作業です。新しい依存関係を追加する`npm install パッケージ名`とは異なります。

### 4. 起動と画面確認

```bash
npm run dev
```

ターミナルに表示されたLocalのURL（通常は http://localhost:3000 ）をブラウザで開きます。「CakeCanvas」「ケーキを、あなたらしく。」が表示されれば、現在の最小画面として正常です。

確認後はターミナルで`Ctrl + C`を押して停止します。この起動確認にはDB・Stripeの接続設定は不要です。

### 5. チェックする

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

それぞれの結果を確認します。現在はテスト本体が未作成のため、`npm test`がテスト0件で正常終了しても「機能テスト済み」とは記録しません。

### 6. 結果を記録・共有する

```bash
git rev-parse --short HEAD
```

全員が次の形式で①へ結果を報告し、①が最新mainに対応するGitHub ActionsのCI結果と合わせて取りまとめます。

```text
担当・名前：
確認したコミット：
Node / npm：
画面表示：成功 / 失敗
型チェック：成功 / 失敗
lint：成功 / 失敗
テスト：成功○件 / テスト0件 / 失敗
ビルド：成功 / 失敗
エラーがあれば内容：
```

