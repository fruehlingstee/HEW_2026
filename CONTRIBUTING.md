# 共同開発のルール

## IssueからPRまで

1. GitHub Projectsで既存Issueの担当、完了条件、blocked-byを確認する。
2. mainを更新し、`feature/<Issue番号>-<説明>` ブランチを作る。Issue番号は実在するものを使う。
3. 作業開始時にIn Progress、PR提出時にReviewへ移す。
4. 関連する仕様と実装を更新し、ローカルチェックの結果をPRへ記録する。
5. 少なくとも1人のレビューを受けてsquash mergeする。必要なGitHub設定は管理者が別途有効化する。
6. 完了報告後にDoneへ移す。技術的に詰まったら完成前にも共有する。

Projectsの列は Backlog → Ready → In Progress → Review → Done。
#24を親Issue、#4〜#23を直接の子Issueとする。親子関係は作業の包含、blocked-byは作業順序を表す。重複Issueを作る前に既存Issueを確認する。

## コミットとレビュー

Conventional Commitsを使用する。例:

```text
docs: 開発手順と担当資料を更新
chore: CIの型チェックを追加
feat: 注文一覧を表示
fix: 仮確保の期限切れ判定を修正
```

PRは変更理由、変更後の動作、検証結果、関連Issueを記載する。画面変更はスクリーンショットまたは利用可能なPreview URLで確認できるようにする。

①のDB設計と決済確定処理は②(buna-bunaa)が必ずレビューする。3D座標は③④、API・共通型は①④、俯瞰SVGと製造指示書の番号は②④で合わせる。

## 開発規約

- TypeScriptを使用し、安易にanyへ逃げない。コメントは日本語でよい。
- 改行LF、UTF-8、インデント2スペースを基本とする。
- package.jsonのdependencies追加・更新は先に承認を得る。承認後はpackage-lock.jsonも同じPRで更新する。
- npmを使う。メンバー・CIはpackage-lock.jsonを基にnpm ciする。
- 必要なテストを追加する。実装と同じことを繰り返すだけのテストや、空のテストを用意しない。
- アプリ初期化後は型チェック、ESLint、Vitest、Next.jsビルドを確認する。未実行・テスト未作成の場合はそのまま記録する。
- 秘密情報をソースやレビューへ貼らない。`.env` 系ファイルはCodexの対象外。
- 本番へのデプロイは事前に確認する。

## 仕様と進捗

仕様・優先順位は4人全員の合意後に確定し、合意できなければ現在の仕様を維持する。status.mdの決定を更新するときは、企画書・担当分担表の関連する本文も合わせる。過去の決定履歴と現行仕様を混同しない。

毎週金曜30分で進捗・次の作業・ブロッカーを確認し、plan/status.mdに記録する。時間の記録は行わない。
