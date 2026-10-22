# DB-04：店舗・注文・決済の対応を守る設計案

> 2026-10-22確認: ローカルのPrismaには本資料の複合FK5本と親側一意制約4本が既に定義されている。以下の「Prisma未反映」は作成時点の記録。制約トリガー・更新ガード・実DB検証・4人レビューは未完了。[照合結果](db-readiness-2026-10-22.md)を参照。

2026-10-19。状態: 実装前の具体案。DBML・Prismaへの反映、migration作成、DB適用、4人レビューは未実施。

目的は、別店舗のパーツを配置する、別注文の決済を返金へ紐づける、展示注文に本物の決済を作る、といった対応間違いを防ぐこと。既存の商品仕様は変えない。

## 1. 何を一致させるか

| 対象 | 必ず一致させる内容 | 防ぐ例 |
|---|---|---|
| 配置とパーツ | Placement・Design・Partの店舗 | 店舗Aのケーキへ店舗Bの苺を配置 |
| デモと店舗 | Design/OrderとDemoSessionの店舗 | 店舗Aの展示セッションに店舗Bの注文を作成 |
| 注文とデザイン | 店舗、通常/デモ区分、デモなら同じsession | 通常注文へ展示用Designを流用 |
| 仮確保とデザイン | 店舗、通常Designであること | デモで本番の枠を消費 |
| 仮確保と注文 | 店舗、受取日、Design、通常注文であること | 10月25日の枠で10月26日の注文を確定 |
| 決済と注文 | 通常注文であること | デモ注文にPaymentIntent作成予定行を追加 |
| 返金と決済 | Refund.order_idとPayment.order_id | 注文Aの取消を注文Bの決済から返金 |

APIではこれに加えて本人の編集権限・店舗ログイン権限を確認する。DBで店舗の対応が一致しても、操作した人に権限があるとは限らない。

## 2. store_idを持たせる範囲

全テーブルへ一律に店舗IDを追加せず、次のように分ける案。

| 区分 | 対象 | 方針 |
|---|---|---|
| 店舗の基点・直接所属 | stores、parts、designs、orders、capacity_holds、各capacity、store_sessions、demo_sessions | 既存のstore_idを維持 |
| 2つの親の店舗を照合 | placements | store_idを追加し、DesignとPartの両方へ複合FKを張る |
| 親から店舗を導出 | design_palette_colors、order_items、order_status_logs、payments、refunds、part_allergens | store_idを追加せず、親への参照を通して認可・検索条件を絞る |
| 共通または別の用途 | allergens、design_edit_sessions、webhook_events | 店舗IDを機械的に追加しない |

design_edit_sessionsはブラウザーの編集者であり、店舗スタッフのログインとは別。対象Designとその店舗は操作ごとに確認する。webhook_eventsは受信イベントであり、署名確認・対象アカウント確認後、Payment/Orderを解決してから店舗を特定する。URLやイベント内の申告storeIdだけで決定しない。

## 3. 複合外部キーで保証するもの

複合FKは「IDだけ」ではなく「IDと所属等の組」を参照する仕組み。同じstore_id列を2本のFKで使うことで、DesignとPartの店舗が必ず一致する。

| 子の列 → 親の列 | 削除動作 | 親に追加する一意制約 |
|---|---|---|
| placements(design_id, store_id) → designs(id, store_id) | CASCADE | designs(id, store_id) |
| placements(part_id, store_id) → parts(id, store_id) | RESTRICT | parts(id, store_id) |
| designs(demo_session_id, store_id) → demo_sessions(id, store_id) | NO ACTION | demo_sessions(id, store_id) |
| orders(demo_session_id, store_id) → demo_sessions(id, store_id) | NO ACTION | 同上 |
| refunds(payment_id, order_id) → payments(id, order_id) | NO ACTION | payments(id, order_id) |

既存の単列FKを該当する複合FKへ置き換える。ID単体の主キー・既存一意制約は残す。親のid自体が一意でも、参照先の列の組として一意制約を定義する。子側はFK照合・親削除時の探索に使うindexを確認する。

通常Design/Orderではdemo_session_idがNULLのため、その複合FKは照合対象外となる。ここは通常/デモの同一行内CHECKと組み合わせる。NULLを含めれば何でも許可できるという意味ではない。

## 4. NULLを含む注文・holdの対応は専用の制約で扱う

orders.design_idとcapacity_holds.design_idは、既存方針どおりDesign清掃時にSET NULLとなる。そのため、この2本は単列FKを維持する。

安易に(store_id, design_id)の複合FKへSET NULLを設定すると、清掃時に必須のstore_idまでNULLへする問題がある。また、holdとOrderの複合FKにnullableなdesign_idを含めると、清掃後はそのFKで店舗・受取日の照合まで省略され得る。

この部分はPostgreSQLの制約トリガーで行間の一致を検証する案。Prismaのschemaだけでは完結しないため、採用後のmigration SQLと実DBテストで実装する。他テーブルを参照するCHECK関数で代用しない。

### 検証条件

- Order作成時はdesign_id必須。Designと同店舗、通常/デモ区分一致、デモの場合は同じdemo_session_idを要求する。
- Hold作成時はdesign_id必須。同店舗で通常Designであることを要求する。activeの非NULL CHECKは既存設計を維持する。
- Holdにorder_idがあれば、店舗とpickup_dateが一致し、Orderが通常であることを要求する。
- HoldとOrderのdesign_idは`IS NOT DISTINCT FROM`で照合する。通常時は同じID、清掃完了時は両方NULLが条件。片方だけNULLは拒否する。
- Payment作成時は通常Orderだけを参照可能とする。Refundは複合FKでそのPaymentとOrderの組を保証する。

### 清掃との両立

Order/Holdの行間検証は遅延可能な制約トリガーとし、トランザクションの最終状態を確認する。Design削除によりOrder→NULL、Hold→NULLと順に更新される途中の状態で誤って失敗させない。

トリガーはイベント発生時のNEWだけを使わず、対象IDから最終行を再取得して検証する。行自体が削除済みならその行の検証を終了する。Orderの変更時も関連Holdを検証対象にし、Hold側の変更だけを監視する不完全な実装にしない。

清掃後も店舗・受取日の一致は検証し続ける。Designが消えた後の遅延決済は、Order・Payment・Holdの残るIDを使い、既存の期限後全額返金フローへ進める。

作成時必須の検証はINSERT時に行う。後でNULLにできることを、新規Order/HoldをNULLで作る許可にはしない。

## 5. 後から所属を書き換えて抜け道を作らない

作成後に次の値を変更しない。別の所属・注文内容が必要なら、新しいデータを作る。APIの検証に加えてDBの更新ガードでも拒否する案。

| 対象 | 変更不可とする列・関係 |
|---|---|
| 店舗所属データ | store_id（店舗間の移動機能は提供しない） |
| Design | 通常/デモ区分を決めるedit_session_id / demo_session_id |
| Order | store_id / is_demo / demo_session_id / pickup_date |
| Payment | order_id |
| Refund | order_id / payment_id |
| 注文へ紐づいたHold | order_id / store_id / pickup_date |

Order/Holdのdesign_idは既存IDから別IDへの付け替えとNULLからの復活を拒否する。非NULLからNULLへの変更は保持期限清掃のために残し、APIでは清掃以外へ公開しない。注文後のDesign変更は既存方針どおり複製して新しい注文として扱う。

親の所属・区分を不変にすることで、子の検証後に親を別店舗やデモへ変更する抜け道を防ぐ。親行の存在はFKで保証し、関連付けを変更する処理は既存ロック順に従う。返金の金額・状態やOrderの業務状態は、この不変項目とは別に更新する。

## 6. デモに作らないデータ

デモはcapacity_holds・payments・refunds・platform_fees・email_deliveriesを持たない。Holdは通常Design/Orderだけ、Paymentは通常Orderだけ、RefundはそのPaymentだけという条件で混入を防ぐ。

platform_fees・email_deliveriesはまだ未定義なので、DB-06・DB-08で追加するときに同じ通常Order限定のDB検証を必須にする。将来テーブルの制約まで今回実装済みとは扱わない。

## 7. 保存処理側にも残る責務

DB制約があっても、店舗・所有者の認可や業務条件は保存処理で確認する。store_idは認証済み店舗または取得済みDesignから求め、利用者の入力値をそのまま保存しない。

枠・注文・決済の処理は[既存ロック順](../plan/issue-reference/09-capacity-payment-concurrency.md)のstores→designs→orders→capacity_holds→payments→refunds→webhook_eventsを守る。制約トリガー内で独自の逆順ロックを追加しない。親の所属・区分はDBで不変、作成・関連付け・清掃は同一店舗のロック下で行う前提を、並行トランザクションのテストで検証する。

Order/Hold/Paymentの関係を途中まで保存して外部APIへ進めず、DBトランザクションをコミットしてから外部操作へ進む。コミット時の遅延制約違反も失敗として扱い、外部APIを呼ばない。価格一致・期限・注文状態・返金上限・署名検証はこの対応関係の制約だけでは保証されない。

## 8. 実DBで確認する受入条件

これは未実行のテスト計画。Prismaのvalidate成功や接続モジュールの6テストでは代用できない。

| ケース | 結果 |
|---|---|
| 同店舗のDesignとPartで配置を作る | 成功 |
| 別店舗のPartを配置する | FK違反で失敗 |
| 別店舗のdemo sessionでDesign/Orderを作る | FK違反で失敗 |
| 注文Aの返金に注文BのPaymentを指定する | FK違反で失敗 |
| 同店舗だが別Design・別受取日のOrderへHoldを紐づける | コミット失敗 |
| デモDesignにHoldを作る | 失敗 |
| デモOrderにPaymentを作る | 失敗 |
| Orderを通常からデモへ変更する | 失敗 |
| 参照中Design/Part/DemoSessionのstore_idを変更する | 失敗 |
| active HoldがあるDesignを削除する | CHECKで失敗、全体ロールバック |
| 保持期限後にDesignを削除しOrder・終端Holdの両参照をNULLにする | 成功。店舗・日付・決済履歴は残る |
| 片方だけdesign_idをNULLにしてコミットする | 失敗 |
| 清掃後に別店舗・別日付のOrderへHoldを付け替える | 不変条件または行間検証で失敗 |
| 清掃と注文作成を別接続から同時実行する | 有効な一方に直列化。壊れた参照は残らない |
| 正常な同一トランザクションでOrder作成→Hold関連付けを行う | 成功。途中状態だけを理由に拒否しない |

## 9. 反映順序

1. この方式をレビューし、DB-03の清掃条件との整合を確認する。
2. DBML・Prismaへplacements.store_id、親4テーブルの複合一意制約、複合FKを反映する。列辞書・ER図も同時更新する。
3. migration着手条件が揃ったら、生成SQLへCHECK・部分一意index・制約トリガー・更新ガードを追加する。Prismaだけで表現できない制約を明記する。
4. 開発用PostgreSQLで上記ケースと並行実行を確認する。後続migrationで手書き制約が消えないことも検証する。

DB-04は具体案の作成まで。スキーマ反映・SQL実装・DB検証・4人合意の完了にはしない。

技術的な根拠: [PostgreSQL 17の制約](https://www.postgresql.org/docs/17/ddl-constraints.html)（複合FK、NULL時の照合、列を指定するSET NULL、他テーブルを参照するCHECKの制約）。制約トリガーの実装時は[CREATE CONSTRAINT TRIGGERではなくCREATE TRIGGERのCONSTRAINT構文](https://www.postgresql.org/docs/17/sql-createtrigger.html)を使用し、実行タイミングを実DBで確認する。
