# Unit 5: 通知 -- ドメインモデル テスト計画

## 未決事項

[Question] 使用するプログラミング言語とテストフレームワークは何ですか？
[Answer]

[Question] テストのディレクトリ構造はどのようにしますか？（例: `tests/unit/`, `tests/integration/` など）
[Answer]

---

## Step 1: 値オブジェクト -- NotificationType

NotificationType は通知種別の列挙（confirmation / modification / cancellation / reminder）を表す。

### 正常系

- [ ] `confirmation` を指定して NotificationType を生成できる
- [ ] `modification` を指定して NotificationType を生成できる
- [ ] `cancellation` を指定して NotificationType を生成できる
- [ ] `reminder` を指定して NotificationType を生成できる
- [ ] 同じ種別を持つ NotificationType 同士は等価と判定される

### 異常系

- [ ] 定義されていない種別文字列（例: `"unknown"`）を指定した場合、エラーとなる
- [ ] 空文字列を指定した場合、エラーとなる
- [ ] null / undefined を指定した場合、エラーとなる

---

## Step 2: 値オブジェクト -- RecipientType

RecipientType は受信者種別（customer / owner）を表す。

### 正常系

- [ ] `customer` を指定して RecipientType を生成できる
- [ ] `owner` を指定して RecipientType を生成できる
- [ ] 同じ種別を持つ RecipientType 同士は等価と判定される

### 異常系

- [ ] 定義されていない種別文字列（例: `"admin"`）を指定した場合、エラーとなる
- [ ] 空文字列を指定した場合、エラーとなる
- [ ] null / undefined を指定した場合、エラーとなる

---

## Step 3: 値オブジェクト -- ReservationEvent

ReservationEvent は Unit 4 から受信するイベントペイロードを表す不変オブジェクトである。

### 正常系 -- reservation.created

- [ ] Pact サンプル（`unit5-unit4-reservation-events.pact.json` の `reservation.created`）に準拠したペイロードから ReservationEvent を生成できる
- [ ] 生成された ReservationEvent の各フィールド（eventType, reservationId, ownerId, customerId, customerName, lineUserId, ownerLineUserId, slotId, dateTime, timestamp）が正しく保持される
- [ ] 生成後にフィールドを変更できない（不変性）

### 正常系 -- reservation.modified

- [ ] Pact サンプルに準拠した `reservation.modified` ペイロードから ReservationEvent を生成できる
- [ ] 追加フィールド（previousDateTime, modifiedBy）が正しく保持される
- [ ] `modifiedBy` が `"customer"` の場合に正しく保持される
- [ ] `modifiedBy` が `"owner"` の場合に正しく保持される

### 正常系 -- reservation.cancelled

- [ ] Pact サンプルに準拠した `reservation.cancelled` ペイロードから ReservationEvent を生成できる
- [ ] 追加フィールド（cancelledBy）が正しく保持される
- [ ] `cancelledBy` が `"customer"` の場合に正しく保持される
- [ ] `cancelledBy` が `"owner"` の場合に正しく保持される

### 異常系

- [ ] 必須フィールド（reservationId）が欠落している場合、エラーとなる
- [ ] 必須フィールド（ownerId）が欠落している場合、エラーとなる
- [ ] 必須フィールド（customerId）が欠落している場合、エラーとなる
- [ ] 必須フィールド（lineUserId）が欠落している場合、エラーとなる
- [ ] 必須フィールド（ownerLineUserId）が欠落している場合、エラーとなる
- [ ] 必須フィールド（dateTime）が欠落している場合、エラーとなる
- [ ] 必須フィールド（timestamp）が欠落している場合、エラーとなる
- [ ] `eventType` が未知の値（例: `"reservation.unknown"`）の場合、エラーとなる
- [ ] `reservation.modified` イベントで `previousDateTime` が欠落している場合、エラーとなる
- [ ] `reservation.modified` イベントで `modifiedBy` が欠落している場合、エラーとなる
- [ ] `reservation.cancelled` イベントで `cancelledBy` が欠落している場合、エラーとなる

### 境界値

- [ ] `dateTime` が ISO 8601 形式だがタイムゾーンオフセット付き（`+09:00`）の場合、正しくパースされる
- [ ] `timestamp` が ISO 8601 UTC 形式（末尾 `Z`）の場合、正しくパースされる
- [ ] `dateTime` が不正な日付形式（例: `"not-a-date"`）の場合、エラーとなる
- [ ] `lineUserId` が Pact 定義の形式（`U` + 16桁以上の hex）に合致する場合、正しく受理される

---

## Step 4: 値オブジェクト -- NotificationMessage

NotificationMessage は送信メッセージ本文を組み立てた結果を保持する不変オブジェクトである。

### 正常系

- [ ] メッセージ種別（`"text"` または `"flex"`）と本文テキストを指定して生成できる
- [ ] 生成後にフィールドを変更できない（不変性）
- [ ] 種別が `"text"` の場合、text フィールドに本文が保持される

### 異常系

- [ ] メッセージ本文が空文字列の場合、エラーとなる
- [ ] メッセージ本文が null / undefined の場合、エラーとなる
- [ ] メッセージ種別が `"text"` でも `"flex"` でもない場合、エラーとなる

---

## Step 5: 値オブジェクト -- SendResult

SendResult は送信成功/失敗とメッセージ ID またはエラー種別を保持する。

### 正常系

- [ ] 送信成功時: success=true, messageId が設定された SendResult を生成できる
- [ ] 送信失敗（USER_BLOCKED）時: success=false, error=`"USER_BLOCKED"` の SendResult を生成できる
- [ ] 送信失敗（その他エラー）時: success=false とエラー種別を保持する SendResult を生成できる

### 異常系

- [ ] success=true なのに messageId が欠落している場合、エラーとなる
- [ ] success=false なのに error が欠落している場合、エラーとなる

---

## Step 6: エンティティ -- NotificationRecord

NotificationRecord は送信済み通知の記録であり、通知種別・送信先・送信日時・送信結果を保持する。

### 正常系

- [ ] 通知種別（NotificationType）、受信者種別（RecipientType）、送信先 lineUserId、送信日時、送信結果（SendResult）を指定して NotificationRecord を生成できる
- [ ] 送信成功の NotificationRecord を生成した場合、送信結果に messageId が含まれる
- [ ] 送信失敗（USER_BLOCKED）の NotificationRecord を生成した場合、送信結果にエラー種別が含まれる
- [ ] reservationId が正しく関連付けられる

### 異常系

- [ ] 通知種別が null の場合、エラーとなる
- [ ] 受信者種別が null の場合、エラーとなる
- [ ] 送信先 lineUserId が空の場合、エラーとなる

---

## Step 7: サービス -- NotificationTemplateResolver

NotificationTemplateResolver は通知種別と受信者種別からテンプレートを選択し、イベントペイロードのフィールドを埋め込んでメッセージ本文を生成する。

### 正常系 -- 顧客向けテンプレート選択

- [ ] NotificationType=confirmation, RecipientType=customer の場合、予約確定通知テンプレートが選択される（US-C10）
- [ ] 生成されたメッセージに予約 ID（reservationId）が含まれる
- [ ] 生成されたメッセージに予約日時（dateTime）が含まれる
- [ ] NotificationType=modification, RecipientType=customer の場合、予約変更通知テンプレートが選択される（US-C11）
- [ ] 生成されたメッセージに変更前の日時（previousDateTime）が含まれる
- [ ] 生成されたメッセージに変更後の日時（dateTime）が含まれる
- [ ] NotificationType=cancellation, RecipientType=customer の場合、予約キャンセル通知テンプレートが選択される（US-C12）
- [ ] 生成されたメッセージに予約 ID（reservationId）が含まれる
- [ ] 生成されたメッセージにキャンセルされた予約の日時（dateTime）が含まれる
- [ ] NotificationType=reminder, RecipientType=customer の場合、リマインダー通知テンプレートが選択される（US-C13）
- [ ] 生成されたメッセージに予約 ID（reservationId）が含まれる
- [ ] 生成されたメッセージに予約日時（dateTime）が含まれる

### 正常系 -- オーナー向けテンプレート選択

- [ ] NotificationType=confirmation, RecipientType=owner の場合、新規予約通知テンプレートが選択される（US-O12）
- [ ] 生成されたメッセージに予約日時（dateTime）が含まれる
- [ ] 生成されたメッセージに顧客名（customerName）が含まれる
- [ ] NotificationType=modification, RecipientType=owner の場合、予約変更通知テンプレートが選択される（US-O13）
- [ ] 生成されたメッセージに変更後の日時（dateTime）が含まれる
- [ ] 生成されたメッセージに変更前の日時（previousDateTime）が含まれる
- [ ] 生成されたメッセージに顧客名（customerName）が含まれる
- [ ] NotificationType=cancellation, RecipientType=owner の場合、予約キャンセル通知テンプレートが選択される（US-O13）
- [ ] 生成されたメッセージにキャンセルされた予約の日時（dateTime）が含まれる
- [ ] 生成されたメッセージに顧客名（customerName）が含まれる

### 異常系

- [ ] NotificationType=reminder, RecipientType=owner の組み合わせ（仕様上オーナー向けリマインダーテンプレートは定義されていない）の場合の挙動

[Question] オーナー向けリマインダーテンプレートは仕様上定義されていませんが、この組み合わせが渡された場合はエラーとすべきですか、それとも無視すべきですか？
[Answer]

### 境界値

- [ ] テンプレートに埋め込む customerName が非常に長い文字列（例: 256文字）の場合、メッセージが正しく生成される
- [ ] テンプレートに埋め込む dateTime が異なるタイムゾーンオフセットを持つ場合、表示形式が正しい

---

## Step 8: サービス -- ReservationEventHandler

ReservationEventHandler は予約イベント（created/modified/cancelled）を購読し、適切な通知処理を振り分ける。

### 正常系

- [ ] `reservation.created` イベント受信時に NotificationDispatcher へ顧客向け・オーナー向けの通知送信を依頼する
- [ ] `reservation.created` イベント受信時に ReminderScheduler へ予約日前日のスケジュール登録を依頼する
- [ ] `reservation.modified` イベント受信時に NotificationDispatcher へ顧客向け・オーナー向けの変更通知送信を依頼する
- [ ] `reservation.modified` イベント受信時に ReminderScheduler へ既存スケジュール削除と新スケジュール登録を依頼する（BR-3）
- [ ] `reservation.cancelled` イベント受信時に NotificationDispatcher へ顧客向け・オーナー向けのキャンセル通知送信を依頼する
- [ ] `reservation.cancelled` イベント受信時に ReminderScheduler へスケジュール削除を依頼する（BR-2）
- [ ] オーナーが変更した場合（modifiedBy=`"owner"`）でも顧客向け通知が送信される（BR-5）
- [ ] 顧客が変更した場合（modifiedBy=`"customer"`）でもオーナー向け通知が送信される（BR-6）
- [ ] オーナーがキャンセルした場合（cancelledBy=`"owner"`）でも顧客向け通知が送信される（BR-5）
- [ ] 顧客がキャンセルした場合（cancelledBy=`"customer"`）でもオーナー向け通知が送信される（BR-6）

### 異常系

- [ ] 未知の eventType を持つイベントを受信した場合の挙動（エラーハンドリング）
- [ ] イベントペイロードが不正（必須フィールド欠落）な場合の挙動
- [ ] NotificationDispatcher が例外を投げた場合、イベント処理全体が中断しないことの確認

### 境界値

- [ ] 同一 reservationId のイベントが短時間に複数回到着した場合、それぞれ独立して処理される

---

## Step 9: サービス -- NotificationDispatcher

NotificationDispatcher は受信者種別に応じて顧客向け・オーナー向けの通知をそれぞれ生成・送信する。

### 正常系

- [ ] reservation.created イベントに対して、顧客向け（lineUserId 宛）と オーナー向け（ownerLineUserId 宛）の 2 通の通知を送信する
- [ ] NotificationTemplateResolver を呼び出して適切なテンプレートでメッセージを生成する
- [ ] LineMessageSender を呼び出してメッセージを送信する
- [ ] 送信成功時に NotificationRecord を生成して記録する
- [ ] 顧客向け送信が失敗しても、オーナー向け送信は独立して実行される（横断的関心事: 可用性）
- [ ] オーナー向け送信が失敗しても、顧客向け送信は独立して実行される（横断的関心事: 可用性）

### 異常系 -- ブロック済みユーザー（BR-7）

- [ ] 顧客が LINE アカウントをブロック済み（USER_BLOCKED）の場合、エラーを記録し処理を正常終了とする
- [ ] ブロック済みユーザーへの送信失敗時にリトライしない
- [ ] 顧客がブロック済みでもオーナー向け送信は正常に実行される

### 異常系 -- 一時的エラー（BR-8）

- [ ] ネットワークエラー等の一時的な送信失敗の場合、リトライ処理が行われる

[Question] 一時的エラーのリトライ回数やリトライ間隔の仕様はどうなっていますか？（BR-8 では「リトライ処理を行う」とありますが、具体的な回数・間隔は未定義です）
[Answer]

---

## Step 10: サービス -- ReminderScheduler

ReminderScheduler は予約日の前日にリマインダー通知を発火するスケジューリングを管理する。

### 正常系

- [ ] 予約作成時（reservation.created）にスケジュールが登録される
- [ ] 登録されるスケジュールの発火日時が予約日の前日である（BR-4）
- [ ] 予約変更時（reservation.modified）に既存スケジュールが削除され、新しい予約日時の前日で再登録される（BR-3）
- [ ] 予約キャンセル時（reservation.cancelled）に登録済みスケジュールが削除される（BR-2）

### 異常系 -- キャンセル済みリマインダー抑止（BR-1, BR-2）

- [ ] キャンセル済み予約のリマインダースケジュールが削除されている場合、リマインダー通知は発火されない
- [ ] スケジュール削除時に対象スケジュールが存在しない場合（二重キャンセル等）、エラーにならず正常終了する

### 境界値

- [ ] 予約日時が翌日（前日リマインダーの発火日時が本日）の場合、スケジュールが即時に近い形で登録される

[Question] 予約日時が本日または過去の場合（前日リマインダーの発火日時が過去になる場合）、スケジュール登録はスキップすべきですか、それともエラーとすべきですか？
[Answer]

---

## Step 11: サービス -- LineMessageSender

LineMessageSender は Unit 2 Messaging API（`POST /api/line/messages/push`）を呼び出してメッセージを送信し、送信結果を返す。

### 正常系

- [ ] Pact 定義に準拠したリクエスト（ownerId, lineUserId, messages）を送信し、成功レスポンス（200, success=true, messageId）を受け取った場合、成功の SendResult を返す
- [ ] lineUserId が `U` + 32桁 hex の形式（Pact の matchingRules: `^U[0-9a-f]{32}$`）で送信される
- [ ] messages 配列に 1 件以上のメッセージが含まれる
- [ ] メッセージ種別が `"text"` の場合、text フィールドが含まれる

### 異常系 -- ブロック済みユーザー

- [ ] レスポンスが 422 かつ `error: "USER_BLOCKED"` の場合、USER_BLOCKED を示す SendResult を返す（BR-7）
- [ ] USER_BLOCKED エラー時にリトライしない（BR-7）

### 異常系 -- 一時的エラー

- [ ] ネットワークエラー（タイムアウト等）の場合、リトライ処理が行われる（BR-8）
- [ ] リトライ上限を超えた場合、失敗の SendResult を返す

### 境界値

- [ ] messages 配列が空（0件）の場合の挙動

[Question] messages 配列が空の場合、LineMessageSender 側でバリデーションエラーとすべきですか、それとも Unit 2 API に委ねるべきですか？（Pact では `min: 1` が定義されています）
[Answer]

---

## Step 12: 統合テスト観点 -- イベント受信から通知送信までの一連のフロー

各コンポーネントを組み合わせた統合テスト観点を以下に列挙する。

### 正常系

- [ ] reservation.created イベント受信 -> テンプレート選択 -> 顧客向け送信成功 + オーナー向け送信成功 -> NotificationRecord 2 件記録
- [ ] reservation.modified イベント受信 -> テンプレート選択 -> 顧客向け変更通知送信成功 + オーナー向け変更通知送信成功 -> リマインダー再登録
- [ ] reservation.cancelled イベント受信 -> テンプレート選択 -> 顧客向けキャンセル通知送信成功 + オーナー向けキャンセル通知送信成功 -> リマインダー削除

### 異常系

- [ ] reservation.created イベント受信 -> 顧客がブロック済み -> 顧客向け送信は USER_BLOCKED で記録、オーナー向け送信は成功
- [ ] reservation.created イベント受信 -> オーナーがブロック済み -> オーナー向け送信は USER_BLOCKED で記録、顧客向け送信は成功
- [ ] reservation.created イベント受信 -> 顧客・オーナー両方がブロック済み -> 両方とも USER_BLOCKED で記録、処理は正常終了
- [ ] reservation.cancelled イベント受信後にリマインダーが発火しないことの確認（BR-1, BR-2）

### 境界値

- [ ] 1 つの予約に対して created -> modified -> cancelled の順にイベントが発生した場合、リマインダースケジュールが最終的に削除されている
