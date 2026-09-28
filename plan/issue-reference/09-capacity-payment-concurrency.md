# 予約枠・決済の競合処理

2026-09-28、本チャットで順次進めている設計整理の第4項。実装・実DB検証・チーム全員のレビューは未完了。

## 採用する方針

Ver1.0は1店舗・日次5台を想定し、枠を変更するDBトランザクションでは店舗行をロックする。期限を過ぎたholdを決済成功によって復活させず、遅れて成立した決済は全額返金する。空き枠が残っていても同じ規則にする。購入者が別の注文を作った後に古い注文が復活するのを防ぐためである。

これは決済サービスの制約ではなく、このプロジェクトの業務方針。Webhook配送の遅延で、期限内に支払われた注文でも処理時点で期限切れなら返金となる。この結果を購入画面で説明する。

## 枠の計算と状態

```text
usedOrderPoints = 非デモかつ confirmed / in_production / ready / completed の注文数
heldPoints = status=active かつ expires_at > 判定時刻 のholdのpoints合計
available = max(0, effectiveCapacity - usedOrderPoints - heldPoints)
```

- Ver1.0は1注文1point。pendingはhold側だけで数え、confirmed holdは集計しない。製造開始・受取完了で枠を戻さない。
- hold状態はactive / confirmed / expired / released。期限切れはexpired、キャンセル・却下による解放はreleased。確定済み注文の取消時もholdをreleasedにする。
- 判定時刻は必要なロック取得後にDBの現在時刻から一度取得する。長いロック待ち以前のトランザクション開始時刻を期限判定に使わない。expires_atと同時刻は期限切れ。
- 同一designのactive holdは1件まで。`UNIQUE (design_id) WHERE status = 'active'`をmigration SQLで設ける。現在時刻を部分indexの条件に入れず、期限切れ行をexpiredへ更新してから作成する。
- 同じdesign・同じ日付への再送は認可後に既存holdを返し、15分を延長しない。注文に関連付け済みのholdは移動しない。注文前の日付変更は既存holdをreleasedにして新しいholdを作る操作を同一トランザクションで行う。
- 店休日・上限0では新規holdを作らない。店舗設定で既存の確保数を下回る上限にしたり、確保済みの日を休業にする更新は拒否し、注文取消等を別操作で行う。

## ロックと採番

全処理で次の順序を守る。対象が複数なら各段階で主キー順に取得する。

1. stores（`SELECT ... FOR UPDATE`）
2. designs
3. orders
4. capacity_holds
5. payments → refunds → webhook_events

- ロック対象が存在するstoresなので、daily_capacityに対象日の行がなくても安全に空き判定できる。日別上書きのない日は曜日設定を使用する。日別行を単にロック用として作成し、意図せず曜日設定を固定しない。
- 店舗内の日付をまたぐ処理も直列化する。低負荷のVer1.0では単純さを優先し、店舗・日付ごとの細粒度ロックへの変更は将来の最適化とする。
- hold作成・期限解放・注文作成・Webhook確定・キャンセル・容量設定・曜日設定・店舗停止は同じ店舗ロックを使う。画面の空き表示は予約保証ではなく、hold作成時に再判定する。
- 分離レベルはREAD COMMITTEDを基本に、ロック取得後に再読込する。注文時の価格・アレルゲン等のマスタ変更も店舗ロックへ参加させ、一貫したsnapshotを作る。Design単独編集はDesignロックのみを取得してよいが、そこから店舗ロックを後取りしない。
- 受取連番は店舗ロック中に対象日の全注文（キャンセル・期限切れを含む）から最大値+1を採番する。001〜999、上限超過は注文を作らずエラー。受取日が過ぎた日の新規注文は受け付けず、採番済み注文を保持期限前に物理削除しない。番号を再利用しない。
- デッドロック・直列化失敗はトランザクション全体を最大3回まで再試行し、期限と空きを再評価する。任意の一意制約違反を一律再試行しない。既存hold・注文・eventの重複はそれぞれ既存処理の結果として扱う。
- 外部APIはロック中に呼ばない。

## 決済成功と期限解放の競合

| ロック取得後の状態 | 処理 |
|---|---|
| pending、active hold、期限内、金額・通貨・注文対応が一致 | payment成功記録、orderをconfirmed、holdをconfirmed、状態履歴・通知予約を同一トランザクションで保存 |
| 同じpaymentで既にconfirmed以降 | 状態・枠・履歴・メールを増やさず既存結果を返す |
| active holdが期限切れ | holdをexpired、pendingをexpiredにし、支払い成功と全額返金要求を保存 |
| 注文がexpired / cancelled / rejected、またはhold解放済み | 元の注文状態を維持し、支払い成功と全額返金要求を保存。枠を再確保しない |
| DBのpaymentに記録されたものと別のPaymentIntentで成功 | eventをneeds_reviewとして記録。既存paymentのIDを上書きせず、注文・枠も変更しない。外部決済の帰属を確認して返金対応する |
| 金額・通貨・店舗・注文との対応が不一致 | 注文を確定せずneeds_reviewとして保存し、店舗に要対応表示。正しい帰属を確認できるまで自動返金しない |

期限解放はactiveかつ期限切れのholdと関連pending注文だけを変更する。確定済み状態をexpiredへ戻さない。決済成功処理も期待する現在状態を更新条件に含める。同じ店舗ロックを使うため、先にコミットした結果を後続処理が再読込する。

## PaymentIntent作成・再試行

- DBへ作成予定payment（status=creating、固定の作成冪等キー、amount、currency=jpy）を先に保存し、コミット後に外部APIを呼ぶ。PaymentIntent IDは作成結果保存前にはNULLを許容する。
- Ver1.0では1注文に1つのPaymentIntentを再利用する。payments.order_idを一意にする。カード入力の再試行を新しいPaymentIntent作成と混同しない。外部結果不明時も別キーで作り直さない。
- 作成キーは`payment-intent:{orderId}`。metadataにorderIdとpaymentIdを入れ、WebhookでDB側の作成予定行と照合する。保存よりWebhookが先行しても同じ行へIDを補完する。ID不一致はneeds_review。
- API呼び出し後にも注文・holdを再確認する。期限切れならclientSecretを新たに渡さず、未成立Intentはキャンセル要求をDBに記録して再試行する。キャンセルと成功が競合した場合は上表の返金へ進む。
- APIタイムアウトや冪等キーの有効期間を超える再試行では、外部側の状態を照合してから進める。存在を確認できないことだけを根拠に新しい支払いを作らない。解決できなければneeds_reviewで停止する。
- paymentのfailedは再入力可能な失敗を含む。成功後に遅れて来た失敗イベントでsucceededを上書きしない。

## Webhookの受信・再実行

1. raw bodyの署名を検証し、event IDは検証済み本文から取り出す。想定するStripeアカウント・テスト環境も確認する。
2. `(provider, event_id)`一意でreceived行を保存する。受信だけではprocessedにしない。保存失敗は非2xxで再送を求める。
3. 保存後に速やかに2xxを返す。DB上のreceived / failedを、定期実行と手動再実行の処理対象にする。レスポンス後のプロセスメモリ上の処理だけに依存しない。
4. 外部情報が必要ならDBロック前に取得し、店舗ロック下で現在の注文とpaymentを照合する。業務反映・通知/返金要求の保存・eventのprocessed更新を同じトランザクションでコミットする。
5. 失敗時は業務反映をロールバックし、別の短い処理でfailed、attempt_count、next_attempt_at、伏せ字化したerror_messageを保存する。失敗記録自体が失敗してもreceived行を再走査できる。

- 同じeventの再送はprocessed / ignoredなら既存結果を返す。received / failedは処理を続行し、単に行があることを理由に捨てない。needs_reviewは人の確認対象として残す。
- 別event IDでも同じpaymentの成功を重複反映しない。イベント到着順には依存せず、確定済み状態を古いイベントで巻き戻さない。
- 再実行のため、event_idに加えて対象object_id、event_created_atと検証済みの最小event_data（注文/payment識別子、金額、通貨、外部状態）を保存する。秘密値・カード情報・顧客個人情報・raw body全体は保存しない。payload_digestだけでは復旧できない。
- 長期滞留は店舗の要対応一覧に出す。Stripe通知の再送だけでなくDBからの再実行を必須とする。今回スケジューラーや外部サービスの設定は行っていない。

## 返金と通知の復旧

- 期限切れ後の成功は通常のキャンセル率ではなく100%返金。注文状態はexpired等のまま、refund状態を別表示する。
- 返金要求を同じDBトランザクションでqueued保存し、外部APIはコミット後に実行する。期限後成功のキーは`late-payment:{paymentId}`とし、再実行でも変更しない。
- refundsはqueued / processing / succeeded / failed / needs_reviewを持つ。processingにはlease期限を持たせ、期限後は外部状態を照合して復旧する。成功か不明な失敗を「未返金」とみなして別要求を作らない。
- 別の冪等キーによる同時要求にも備え、payment行のロック中に成功済み・処理待ち・処理中・結果不明の返金予定額を合算し、支払額を超える要求を拒否する。再試行は同じrefund行を使う。
- 外部で成功した後のDB保存失敗は、同じキーまたはprovider_refund_idによる照合で復旧する。手数料は成功返金の累計から再計算し、再実行で累積加算しない。
- 注文受付等のemail_deliveriesも状態変更と同じトランザクションで予約する。送信はコミット後に行い、失敗しても注文を巻き戻さない。メールの外部冪等性・再送方式は通知実装時に検証する。

## 実装時の必須検証

| ケース | 期待結果 |
|---|---|
| 最後の1枠へ同時に2件 | holdは1件だけ成立 |
| 同じdesignへ再送・日付違いの同時要求 | active holdは常に最大1件、再送で期限延長なし |
| daily_capacity行がない日 | 曜日設定で判定し、同時確保でも超過しない |
| hold期限ちょうど・ロック待ち中の期限到達 | expired扱い |
| 成功Webhookと期限解放の同時実行 | confirmedかexpired＋返金要求のどちらかに一貫する |
| 期限後成功、空き枠がある場合 | 復活させず全額返金 |
| 同じ/別event IDで同じ成功が再送 | 枠・注文履歴・通知予約は1回 |
| 受信保存後/業務コミット前/コミット直後の停止 | 再走査で復旧し、二重確定しない |
| PaymentIntent作成タイムアウト/ID保存前Webhook | 同じpayment行とIntentに収束する |
| 外部返金成功直後のDB障害/別キー同時返金 | 二重返金・支払額超過なし |
| 製造開始・受取完了/容量引下げとの競合 | 枠が勝手に戻らず、確保数以下の上限変更を拒否 |

この表は受入条件であり、実行結果ではない。

## 参考

行ロックによる更新の排他と、デッドロック時の扱いは[PostgreSQL公式](https://www.postgresql.org/docs/17/explicit-locking.html)を参照。Webhookの署名・再送・重複・順序は[Stripe公式Webhook資料](https://docs.stripe.com/webhooks)、外部要求の再試行は[Stripe公式冪等性資料](https://docs.stripe.com/api/idempotent_requests)を確認した。上記の期限後全額返金・店舗単位ロックは本プロジェクトの設計判断。
