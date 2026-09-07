# CakeCanvas Issue実装リファレンス

このディレクトリは、GitHub Issue #27〜#83を実装するときの共通設計資料である。Issue本文だけで判断できない場合は、まず本索引から該当資料を確認する。

## 正典の優先順位

1. [`plan/status.md`](../status.md) — 確定仕様・保留事項・担当
2. このディレクトリ — 実装契約・構造・図
3. 各GitHub Issue — 作業範囲・開始条件・完了条件
4. [`plan/kikaku.md`](../kikaku.md) — 企画背景・発表上の説明

矛盾を見つけた場合、独断でコードへ合わせず、4人で合意して`plan/status.md`と関連資料を同じPRで更新する。

## 資料一覧

| 資料 | 参照する場面 |
|---|---|
| [`01-technical-stack.md`](./01-technical-stack.md) | 採用技術、責務、追加ライブラリの判断 |
| [`02-file-structure.md`](./02-file-structure.md) | 新しいファイルの配置、依存方向、命名 |
| [`03-function-contracts.md`](./03-function-contracts.md) | 関数名、引数、戻り値、エラー、トランザクション境界 |
| [`04-database-design.md`](./04-database-design.md) | テーブル、列、制約、インデックス、削除方針 |
| [`05-er-diagram.md`](./05-er-diagram.md) | テーブル間の参照関係 |
| [`06-business-logic.md`](./06-business-logic.md) | 価格、予約枠、注文、返金、期限の計算規則 |
| [`07-screen-flow.md`](./07-screen-flow.md) | 買い手・店舗・デモの画面遷移 |
| [`08-issue-map.md`](./08-issue-map.md) | 各Issueが読む資料と成果物 |

## 利用ルール

- 実装開始前に、Issue本文の「開始条件」と`08-issue-map.md`を確認する。
- 関数名やテーブル名を変える場合、コードだけでなく本資料も更新する。
- Mermaid図はGitHub上で表示確認する。
- `.env`系ファイルには触れず、必要な環境変数名だけREADME等へ記載する。
- `package.json`のdependencies変更は事前にチーム承認を得る。
- Productionへのデプロイは事前確認を得る。

## 用語

| 用語 | 意味 |
|---|---|
| Design | 注文前から存在するケーキ構成。色、飾り、メッセージを持つ |
| Placement | Design上に置かれた飾り1個の座標 |
| Order | 1台の5号ケーキ注文。確定時にDesignをロックする |
| Capacity hold | 決済中の15分間だけ製造枠を仮確保する記録 |
| Pickup code | 店頭照合用の`MMDD-日別3桁連番` |
| Access token | 注文照会用の32バイト秘密値。DBにはハッシュのみ保存 |
| Demo order | Stripe・個人情報・予約枠消費を伴わない展示用注文 |
