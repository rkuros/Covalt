# Unit 7: Googleカレンダー連携 -- ドメインモデル テスト計画

## 前提 Questions

### Q1: 使用するプログラミング言語とテストフレームワーク

[Question] Unit 7 のドメインモデルのテストに使用するプログラミング言語とテストフレームワークは何ですか？（例: TypeScript + Jest、Java + JUnit、Python + pytest など）

[Answer]

### Q2: テストのディレクトリ構造

[Question] テストファイルの配置先ディレクトリ構造はどのようになりますか？（例: `tests/unit/domain/`、`src/__tests__/`、ソースコードと同一ディレクトリに `.test.*` を配置、など）

[Answer]

---

## 参照ドキュメント

- `aidlc-docs/construction/unit7_google_calendar/docs/implementation_brief.md`
- `aidlc-docs/inception/units/unit7_google_calendar/spec.md`
- `aidlc-docs/inception/units/pacts/unit7-unit4-reservation-events.pact.json`

---

## Step 1: 値オブジェクト -- OAuthToken

対象: アクセストークン・リフレッシュトークン・有効期限をまとめた不変オブジェクト。

### 正常系

- [ ] 1-1. 有効なアクセストークン、リフレッシュトークン、有効期限を指定してインスタンスを生成できる
- [ ] 1-2. 生成後のプロパティ（accessToken, refreshToken, expiresAt）が渡した値と一致する
- [ ] 1-3. 不変オブジェクトであること -- 生成後にプロパティを変更できない

### 異常系

- [ ] 1-4. アクセストークンが空文字の場合、生成時にエラーとなる
- [ ] 1-5. リフレッシュトークンが空文字の場合、生成時にエラーとなる
- [ ] 1-6. 有効期限が null / undefined の場合、生成時にエラーとなる

### 境界値

- [ ] 1-7. 有効期限が現在時刻ちょうどの場合の期限切れ判定（期限切れとみなすか否か）
- [ ] 1-8. 有効期限が現在時刻の1秒後の場合、まだ有効と判定される
- [ ] 1-9. 有効期限が過去日時の場合、期限切れと判定される

### トークン管理関連（5.3 認証トークン管理）

- [ ] 1-10. トークンが期限切れか否かを判定するメソッドが正しく動作する
- [ ] 1-11. 同一の値を持つ OAuthToken 同士が等価と判定される（値オブジェクトの等価性）

---

## Step 2: 値オブジェクト -- CalendarId

対象: 連携対象のGoogleカレンダーを一意に識別するID。

### 正常系

- [ ] 2-1. 有効なカレンダーID文字列を指定してインスタンスを生成できる
- [ ] 2-2. 生成後のプロパティが渡した値と一致する

### 異常系

- [ ] 2-3. 空文字の場合、生成時にエラーとなる
- [ ] 2-4. null / undefined の場合、生成時にエラーとなる

### 境界値

- [ ] 2-5. 非常に長いカレンダーID文字列を指定した場合の挙動

[Question] CalendarId に文字列長の上限バリデーションは設けますか？Google Calendar API 側の仕様に準拠する形でしょうか？

[Answer]

### 等価性

- [ ] 2-6. 同一のカレンダーID値を持つインスタンス同士が等価と判定される
- [ ] 2-7. 異なるカレンダーID値を持つインスタンス同士が非等価と判定される

---

## Step 3: 値オブジェクト -- CalendarEventDetail

対象: Googleカレンダーに登録する予定の内容（タイトル、開始日時、終了日時、説明）。BR-2.4 に対応。

### 正常系

- [ ] 3-1. タイトル、開始日時、終了日時、説明を指定してインスタンスを生成できる
- [ ] 3-2. 予約情報（customerName, dateTime, durationMinutes）から CalendarEventDetail を構築できる
- [ ] 3-3. タイトルに顧客名が含まれること（BR-2.4: カレンダー予定に顧客名が記載される）
- [ ] 3-4. 開始日時が dateTime と一致すること
- [ ] 3-5. 終了日時が dateTime + durationMinutes と一致すること（BR-2.4: 予約日時が記載される）

### 異常系

- [ ] 3-6. タイトルが空文字の場合、生成時にエラーとなる
- [ ] 3-7. 開始日時が null の場合、生成時にエラーとなる
- [ ] 3-8. 終了日時が null の場合、生成時にエラーとなる
- [ ] 3-9. 終了日時が開始日時より前の場合、生成時にエラーとなる

### 境界値

- [ ] 3-10. durationMinutes が 0 の場合の挙動（開始日時と終了日時が同一）
- [ ] 3-11. durationMinutes が 1 の場合、終了日時が開始日時の1分後となる
- [ ] 3-12. durationMinutes が非常に大きい値（例: 1440 = 24時間）の場合の挙動

[Question] durationMinutes に上限・下限の制約はありますか？0分や負の値をどう扱うかの仕様確認が必要です。

[Answer]

---

## Step 4: エンティティ -- GoogleCalendarIntegration

対象: オーナーごとのGoogleカレンダー連携設定。OAuth認証情報・対象カレンダーID・連携状態（有効/無効）を保持する。BR-1 全般に対応。

### 正常系

- [ ] 4-1. ownerId を指定してインスタンスを生成できる（初期状態は無効）
- [ ] 4-2. OAuthToken と CalendarId を設定して連携を有効化できる（BR-1.1, BR-1.2）
- [ ] 4-3. 連携が有効な場合、isEnabled が true を返す
- [ ] 4-4. 連携解除を実行すると、連携状態が無効になる（BR-1.3）
- [ ] 4-5. 連携解除時に OAuthToken が無効化・削除される（BR-1.3: 保存済みの OAuthToken は無効化・削除される）
- [ ] 4-6. カレンダーID を変更（カレンダー再選択）できる（BR-1.2）
- [ ] 4-7. OAuthToken を更新（リフレッシュ後の新トークン設定）できる

### 異常系

- [ ] 4-8. ownerId が空文字の場合、生成時にエラーとなる
- [ ] 4-9. OAuthToken なしで連携を有効化しようとした場合、エラーとなる
- [ ] 4-10. CalendarId なしで連携を有効化しようとした場合、エラーとなる
- [ ] 4-11. 既に連携解除済みの状態で再度解除を実行した場合の挙動

### 境界値・状態遷移

- [ ] 4-12. 無効 -> 有効 -> 無効 -> 有効 の連携状態遷移が正しく行われる
- [ ] 4-13. 「要再認証」状態への遷移（リフレッシュトークン無効化時、5.3 準拠）
- [ ] 4-14. 「要再認証」状態では連携が無効として扱われる（同期処理がスキップされること）

### アクセス制御（5.1 個人情報保護）

- [ ] 4-15. ownerId によるアクセス制御 -- 他のオーナーIDでは情報にアクセスできないことの概念検証

[Question] 連携状態の種類は「有効」「無効」「要再認証」の3種類ですか？他に状態がある場合は仕様の確認が必要です。

[Answer]

---

## Step 5: エンティティ -- CalendarEventMapping

対象: 予約ID（reservationId）とGoogleカレンダーイベントIDの対応関係を管理する。冪等性保証に直結（5.2 準拠）。

### 正常系

- [ ] 5-1. reservationId と Google イベント ID を指定してインスタンスを生成できる
- [ ] 5-2. 生成後に reservationId と Google イベント ID を参照できる
- [ ] 5-3. マッピングを無効化（削除マーク）できる（reservation.cancelled 処理用）

### 異常系

- [ ] 5-4. reservationId が空文字の場合、生成時にエラーとなる
- [ ] 5-5. Google イベント ID が空文字の場合、生成時にエラーとなる
- [ ] 5-6. 既に無効化済みのマッピングを再度無効化した場合の挙動

### 冪等性（5.2 可用性・耐障害性）

- [ ] 5-7. 同一 reservationId に対して既にマッピングが存在する場合、重複作成を防止できる（存在チェック）
- [ ] 5-8. マッピングが存在しない reservationId に対する更新・削除要求時の挙動

[Question] CalendarEventMapping に「有効/無効」のステータスフィールドを持つか、それとも物理削除でレコードを消すかの方針確認が必要です（implementation_brief.md では「削除または無効化」と記載）。

[Answer]

---

## Step 6: サービス -- GoogleOAuthService

対象: Google OAuth 2.0 認可コードフローの実行（認可URL生成・トークン取得・トークンリフレッシュ）。BR-1.1, 5.3 に対応。

### 正常系

- [ ] 6-1. 認可URL が正しいエンドポイント（`https://accounts.google.com/o/oauth2/v2/auth`）で生成される
- [ ] 6-2. 認可URL に必要なスコープ（`calendar.events`, `calendar.readonly`）が含まれる
- [ ] 6-3. 認可コードからアクセストークンとリフレッシュトークンを取得できる（トークンエンドポイント呼び出し）
- [ ] 6-4. 取得したトークンが OAuthToken 値オブジェクトとして返却される
- [ ] 6-5. 期限切れのアクセストークンをリフレッシュトークンで自動更新できる（5.3 準拠）
- [ ] 6-6. リフレッシュ後に新しい OAuthToken が返却される

### 異常系

- [ ] 6-7. 無効な認可コードでトークン取得を試みた場合、エラーとなる
- [ ] 6-8. リフレッシュトークンが無効化（Google側で権限取り消し）されている場合、適切なエラーが返る（5.3 準拠）
- [ ] 6-9. リフレッシュトークン無効化時、連携状態を「要再認証」に遷移させる情報が呼び出し元に伝達される（5.3 準拠）
- [ ] 6-10. トークンエンドポイントへの通信が失敗した場合のエラーハンドリング

### 排他制御（5.3 認証トークン管理）

- [ ] 6-11. 並行リクエスト時にトークンリフレッシュが重複実行されないこと（排他制御の検証）

[Question] トークンリフレッシュの排他制御はドメインサービスレベルで行いますか、それともインフラストラクチャ層（リポジトリのロック機構等）で行いますか？テストのスコープに影響します。

[Answer]

---

## Step 7: サービス -- CalendarIntegrationService

対象: 連携設定のライフサイクル管理（連携開始・カレンダー選択・連携解除）。BR-1 全般に対応。

### 正常系

- [ ] 7-1. OAuth認証完了後、GoogleCalendarIntegration が生成され連携が開始される（BR-1.1）
- [ ] 7-2. カレンダー一覧から対象カレンダーを選択し、CalendarId が設定される（BR-1.2）
- [ ] 7-3. 連携解除を実行すると、GoogleCalendarIntegration が無効化され OAuthToken が削除される（BR-1.3）
- [ ] 7-4. 連携解除後に再度連携を開始できる

### 異常系

- [ ] 7-5. 存在しない ownerId で連携開始を試みた場合のエラーハンドリング
- [ ] 7-6. 既に連携済みのオーナーが再度連携開始を試みた場合の挙動
- [ ] 7-7. Google OAuth 認証に失敗した場合のエラーハンドリング
- [ ] 7-8. カレンダー一覧取得に失敗した場合のエラーハンドリング

### 境界値

- [ ] 7-9. カレンダー一覧が空（0件）の場合の挙動
- [ ] 7-10. オーナーが保有するカレンダーが1件のみの場合

---

## Step 8: サービス -- CalendarSyncService

対象: 予約イベント受信時のカレンダー同期処理を統括する。BR-2 全般、冪等性（5.2）、連携無効時のスキップ（BR-2.5）に対応。

### 正常系 -- 予約作成（reservation.created / BR-2.1）

- [ ] 8-1. reservation.created イベント受信時、連携が有効なオーナーのカレンダーにイベントが作成される
- [ ] 8-2. 作成されたカレンダーイベントに顧客名と予約日時が含まれる（BR-2.4）
- [ ] 8-3. 作成後、reservationId と Google イベント ID のマッピングが CalendarEventMapping に保存される

### 正常系 -- 予約変更（reservation.modified / BR-2.2）

- [ ] 8-4. reservation.modified イベント受信時、CalendarEventMapping から対応する Google イベント ID が取得される
- [ ] 8-5. 変更後の dateTime・durationMinutes・customerName でカレンダーイベントが更新される
- [ ] 8-6. CalendarEventMapping のマッピングは維持される（イベントIDは変わらない）

### 正常系 -- 予約キャンセル（reservation.cancelled / BR-2.3）

- [ ] 8-7. reservation.cancelled イベント受信時、CalendarEventMapping から対応する Google イベント ID が取得される
- [ ] 8-8. 対応するカレンダーイベントが削除される
- [ ] 8-9. CalendarEventMapping のレコードが削除または無効化される

### 連携無効時のスキップ（BR-2.5）

- [ ] 8-10. 連携が無効（未設定）のオーナーに対する reservation.created イベントは処理がスキップされる
- [ ] 8-11. 連携が無効（解除済み）のオーナーに対する reservation.modified イベントは処理がスキップされる
- [ ] 8-12. 連携が無効のオーナーに対する reservation.cancelled イベントは処理がスキップされる
- [ ] 8-13. 「要再認証」状態のオーナーに対するイベントは処理がスキップされる
- [ ] 8-14. スキップ時にエラーが発生せず、正常に処理が完了する

### 冪等性（5.2 可用性・耐障害性）

- [ ] 8-15. 同一 reservationId の reservation.created イベントが重複受信された場合、CalendarEventMapping の存在チェックにより二重作成が防止される
- [ ] 8-16. 同一 reservationId の reservation.modified イベントが重複受信された場合、既に最新状態であれば実害のない更新が行われる（冪等）
- [ ] 8-17. 同一 reservationId の reservation.cancelled イベントが重複受信された場合、既に削除済みであればエラーにならない（冪等）

### 異常系

- [ ] 8-18. Google Calendar API 呼び出し（イベント作成）が失敗した場合のエラーハンドリング
- [ ] 8-19. Google Calendar API 呼び出し（イベント更新）が失敗した場合のエラーハンドリング
- [ ] 8-20. Google Calendar API 呼び出し（イベント削除）が失敗した場合のエラーハンドリング
- [ ] 8-21. CalendarEventMapping に該当マッピングが存在しない状態で reservation.modified を受信した場合の挙動
- [ ] 8-22. CalendarEventMapping に該当マッピングが存在しない状態で reservation.cancelled を受信した場合の挙動
- [ ] 8-23. トークン期限切れ時に自動リフレッシュが試行され、成功した場合は同期処理が続行される
- [ ] 8-24. トークンリフレッシュにも失敗した場合のエラーハンドリング（連携状態を「要再認証」に遷移）

### リトライ（5.2 可用性・耐障害性）

- [ ] 8-25. Google Calendar API の一時的な障害（5xx エラー）時にリトライが実行される
- [ ] 8-26. レートリミット（HTTP 429）受信時にリトライが実行される
- [ ] 8-27. リトライ上限超過時にエラーログが記録される
- [ ] 8-28. リトライ上限超過時にオーナーへの同期失敗通知が行われる

[Question] リトライ処理（指数バックオフ）はドメインサービス内で行いますか、それともインフラストラクチャ層（API クライアントや非同期キュー）で行いますか？テストの責務分離に影響します。

[Answer]

---

## Step 9: サービス -- GoogleCalendarApiClient

対象: Google Calendar API との通信を担うインフラストラクチャサービス（イベントCRUD・カレンダー一覧取得）。

### 正常系

- [ ] 9-1. カレンダー一覧取得（GET /calendars）が正しいレスポンスを返す
- [ ] 9-2. イベント作成（POST /calendars/{calendarId}/events）が Google イベント ID を含むレスポンスを返す
- [ ] 9-3. イベント更新（PUT /calendars/{calendarId}/events/{eventId}）が成功する
- [ ] 9-4. イベント削除（DELETE /calendars/{calendarId}/events/{eventId}）が成功する

### 異常系

- [ ] 9-5. 無効な OAuthToken（期限切れ）で API 呼び出しを試みた場合、認証エラー（401）が適切にハンドリングされる
- [ ] 9-6. 存在しない calendarId を指定した場合、404エラーが適切にハンドリングされる
- [ ] 9-7. 存在しない eventId を指定した場合（更新・削除時）、404エラーが適切にハンドリングされる
- [ ] 9-8. Google Calendar API がサーバーエラー（500）を返した場合のエラーハンドリング
- [ ] 9-9. レートリミット（HTTP 429）を受信した場合のエラーハンドリング
- [ ] 9-10. ネットワークタイムアウトが発生した場合のエラーハンドリング

[Question] GoogleCalendarApiClient はインフラストラクチャ層のコンポーネントですが、ドメインテスト計画のスコープに含めますか？それとも統合テスト計画として別途策定しますか？

[Answer]

---

## Step 10: サービス -- ReservationEventHandler

対象: Unit 4 からの非同期イベントを購読し、CalendarSyncService へ処理を委譲するハンドラ。PACT契約 `unit7-unit4-reservation-events.pact.json` 準拠。

### 正常系

- [ ] 10-1. reservation.created イベントを受信し、CalendarSyncService の予約作成処理に委譲できる
- [ ] 10-2. reservation.modified イベントを受信し、CalendarSyncService の予約変更処理に委譲できる
- [ ] 10-3. reservation.cancelled イベントを受信し、CalendarSyncService の予約キャンセル処理に委譲できる

### PACT契約準拠のペイロード検証

- [ ] 10-4. reservation.created のペイロードが PACT で定義されたスキーマ（eventType, reservationId, ownerId, customerName, slotId, dateTime, durationMinutes, timestamp）と一致する
- [ ] 10-5. reservation.modified のペイロードが PACT で定義されたスキーマ（eventType, reservationId, ownerId, customerName, slotId, dateTime, previousDateTime, durationMinutes, timestamp）と一致する
- [ ] 10-6. reservation.cancelled のペイロードが PACT で定義されたスキーマ（eventType, reservationId, ownerId, customerName, slotId, dateTime, timestamp）と一致する
- [ ] 10-7. dateTime フィールドが ISO 8601 形式の正規表現パターン `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` にマッチする
- [ ] 10-8. durationMinutes フィールドが整数型である

### 異常系

- [ ] 10-9. 未知の eventType を持つイベントを受信した場合、エラーとせず無視またはログ出力する
- [ ] 10-10. 必須フィールド（reservationId, ownerId 等）が欠落したイベントを受信した場合のエラーハンドリング
- [ ] 10-11. ペイロードのJSON形式が不正な場合のエラーハンドリング
- [ ] 10-12. CalendarSyncService への委譲中にエラーが発生した場合のエラーハンドリング

### 境界値

- [ ] 10-13. dateTime フィールドがタイムゾーン付き（`+09:00`）の場合に正しくパースされる
- [ ] 10-14. dateTime フィールドが UTC（`Z`）の場合に正しくパースされる
- [ ] 10-15. customerName が非ASCII文字（日本語など、例: PACT例の「田中太郎」）の場合に正しく処理される

---

## ステップ間の依存関係

| ステップ | 依存する先行ステップ |
|---|---|
| Step 1 (OAuthToken) | なし |
| Step 2 (CalendarId) | なし |
| Step 3 (CalendarEventDetail) | なし |
| Step 4 (GoogleCalendarIntegration) | Step 1, Step 2 |
| Step 5 (CalendarEventMapping) | なし |
| Step 6 (GoogleOAuthService) | Step 1 |
| Step 7 (CalendarIntegrationService) | Step 4, Step 6 |
| Step 8 (CalendarSyncService) | Step 3, Step 4, Step 5 |
| Step 9 (GoogleCalendarApiClient) | Step 1, Step 2 |
| Step 10 (ReservationEventHandler) | Step 8 |

**推奨実装順序**: Step 1 -> Step 2 -> Step 3 -> Step 5 -> Step 4 -> Step 6 -> Step 9 -> Step 7 -> Step 8 -> Step 10

---

## Questions まとめ

| # | 所在 | Question | Answer |
|---|---|---|---|
| Q1 | 前提 | 使用するプログラミング言語とテストフレームワーク | |
| Q2 | 前提 | テストのディレクトリ構造 | |
| Q3 | Step 2 | CalendarId の文字列長上限バリデーションの有無 | |
| Q4 | Step 3 | durationMinutes の上限・下限の制約 | |
| Q5 | Step 4 | 連携状態の種類（「有効」「無効」「要再認証」以外があるか） | |
| Q6 | Step 5 | CalendarEventMapping の削除方針（物理削除 vs 論理削除） | |
| Q7 | Step 6 | トークンリフレッシュの排他制御の実装レイヤー | |
| Q8 | Step 8 | リトライ処理の実装レイヤー（ドメイン vs インフラ） | |
| Q9 | Step 9 | GoogleCalendarApiClient をドメインテスト計画のスコープに含めるか | |
