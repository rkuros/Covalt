# Unit 7: Googleカレンダー連携 — 実装ブリーフ

## 1. コンポーネント一覧

### エンティティ

| エンティティ | 説明 |
|---|---|
| GoogleCalendarIntegration | オーナーごとのGoogleカレンダー連携設定。OAuth認証情報・対象カレンダーID・連携状態（有効/無効）を保持する |
| CalendarEventMapping | 予約ID（reservationId）とGoogleカレンダーイベントIDの対応関係を管理する。更新・削除時に対象イベントを特定するために使用 |

### 値オブジェクト

| 値オブジェクト | 説明 |
|---|---|
| OAuthToken | アクセストークン・リフレッシュトークン・有効期限をまとめた不変オブジェクト |
| CalendarId | 連携対象のGoogleカレンダーを一意に識別するID |
| CalendarEventDetail | Googleカレンダーに登録する予定の内容（タイトル、開始日時、終了日時、説明） |

### サービス

| サービス | 説明 |
|---|---|
| CalendarIntegrationService | 連携設定のライフサイクル管理（連携開始・カレンダー選択・連携解除） |
| CalendarSyncService | 予約イベント受信時のカレンダー同期処理を統括する。イベント種別に応じて予定の追加・更新・削除を実行 |
| GoogleOAuthService | Google OAuth 2.0 認可コードフローの実行（認可URL生成・トークン取得・トークンリフレッシュ） |
| GoogleCalendarApiClient | Google Calendar API との通信を担うインフラストラクチャサービス（イベントCRUD・カレンダー一覧取得） |
| ReservationEventHandler | Unit 4 からの非同期イベントを購読し、CalendarSyncService へ処理を委譲するハンドラ |

---

## 2. 購読イベント

Unit 4（予約管理）が発行する3種類の予約イベントを購読する。PACT契約: `unit7-unit4-reservation-events.pact.json`

### 2.1 reservation.created（予約作成）

**ペイロード:**

| フィールド | 型 | 説明 |
|---|---|---|
| eventType | string | `"reservation.created"` 固定 |
| reservationId | string | 予約ID |
| ownerId | string | オーナーID（連携設定の特定に使用） |
| customerName | string | 顧客名（カレンダー予定に記載） |
| slotId | string | スロットID |
| dateTime | string (ISO 8601) | 予約日時 |
| durationMinutes | integer | 予約時間（分） |
| timestamp | string (ISO 8601) | イベント発生日時 |

**処理内容:**
1. ownerId から該当オーナーの連携設定（GoogleCalendarIntegration）を取得
2. 連携が有効な場合、customerName・dateTime・durationMinutes から CalendarEventDetail を構築
3. Google Calendar API で対象カレンダーにイベントを作成
4. reservationId と生成された Google イベント ID の対応を CalendarEventMapping に保存

### 2.2 reservation.modified（予約変更）

**ペイロード:**

| フィールド | 型 | 説明 |
|---|---|---|
| eventType | string | `"reservation.modified"` 固定 |
| reservationId | string | 予約ID |
| ownerId | string | オーナーID |
| customerName | string | 顧客名 |
| slotId | string | 変更後のスロットID |
| dateTime | string (ISO 8601) | 変更後の予約日時 |
| previousDateTime | string (ISO 8601) | 変更前の予約日時 |
| durationMinutes | integer | 予約時間（分） |
| timestamp | string (ISO 8601) | イベント発生日時 |

**処理内容:**
1. reservationId から CalendarEventMapping を検索し、対応する Google イベント ID を取得
2. 連携が有効な場合、変更後の dateTime・durationMinutes・customerName で CalendarEventDetail を再構築
3. Google Calendar API で既存イベントを更新

### 2.3 reservation.cancelled（予約キャンセル）

**ペイロード:**

| フィールド | 型 | 説明 |
|---|---|---|
| eventType | string | `"reservation.cancelled"` 固定 |
| reservationId | string | 予約ID |
| ownerId | string | オーナーID |
| customerName | string | 顧客名 |
| slotId | string | スロットID |
| dateTime | string (ISO 8601) | 予約日時 |
| timestamp | string (ISO 8601) | イベント発生日時 |

**処理内容:**
1. reservationId から CalendarEventMapping を検索し、対応する Google イベント ID を取得
2. 連携が有効な場合、Google Calendar API で該当イベントを削除
3. CalendarEventMapping のレコードを削除または無効化

---

## 3. ビジネスルール

以下は spec.md のアクセプタンスクライテリアから抽出したビジネスルールである。

### BR-1: 連携設定（US-O14）

| # | ルール |
|---|---|
| BR-1.1 | オーナーはWeb管理画面からGoogleアカウントでOAuth認証を行い、連携を開始できる |
| BR-1.2 | 認証完了後、オーナーは同期先のGoogleカレンダーを一覧から選択できる |
| BR-1.3 | オーナーは連携をいつでも解除できる。解除時、保存済みの OAuthToken は無効化・削除される |

### BR-2: 自動同期（US-O15）

| # | ルール |
|---|---|
| BR-2.1 | 予約作成時、連携が有効なオーナーの対象カレンダーに予定が自動追加される |
| BR-2.2 | 予約変更時、対応するカレンダー予定の日時が自動更新される |
| BR-2.3 | 予約キャンセル時、対応するカレンダー予定が自動削除される |
| BR-2.4 | カレンダー予定には予約日時および顧客名が記載される |
| BR-2.5 | 連携が無効（未設定または解除済み）のオーナーに対するイベントは、処理をスキップする |

---

## 4. 外部システム連携

### 4.1 Google OAuth 2.0 認証フロー

| 項目 | 内容 |
|---|---|
| フロー種別 | Authorization Code Flow（サーバーサイド） |
| スコープ | `https://www.googleapis.com/auth/calendar.events`（カレンダーイベントの読み書き）、`https://www.googleapis.com/auth/calendar.readonly`（カレンダー一覧取得） |
| トークン管理 | アクセストークンとリフレッシュトークンを暗号化して保存。アクセストークン期限切れ時はリフレッシュトークンで自動更新 |
| 認可エンドポイント | `https://accounts.google.com/o/oauth2/v2/auth` |
| トークンエンドポイント | `https://oauth2.googleapis.com/token` |
| コールバックURL | Web管理画面側で受け取り、認可コードをサーバーへ送信 |

### 4.2 Google Calendar API

| 操作 | APIエンドポイント | 用途 |
|---|---|---|
| カレンダー一覧取得 | `GET /calendars` (CalendarList.list) | 連携先カレンダーの選択肢表示 |
| イベント作成 | `POST /calendars/{calendarId}/events` (Events.insert) | 予約作成時の予定追加 |
| イベント更新 | `PUT /calendars/{calendarId}/events/{eventId}` (Events.update) | 予約変更時の予定更新 |
| イベント削除 | `DELETE /calendars/{calendarId}/events/{eventId}` (Events.delete) | 予約キャンセル時の予定削除 |

---

## 5. 横断的関心事

### 5.1 個人情報保護（US-S06 準拠）

- OAuthトークン（アクセストークン・リフレッシュトークン）は暗号化して保存する
- Google Calendar API との通信はすべて HTTPS で行う
- オーナーは自身の連携設定・カレンダー情報のみアクセス可能とし、他オーナーの情報には一切アクセスできない（ownerId によるアクセス制御）
- カレンダーイベントに記載する顧客名は、当該オーナーの顧客情報に限定される

### 5.2 可用性・耐障害性（US-S07 準拠）

- Google Calendar API 呼び出しに失敗した場合、リトライ処理を行う（指数バックオフ推奨）
- リトライ上限超過時はエラーログを記録し、オーナーへ同期失敗を通知する手段を設ける
- イベント処理の冪等性を保証する。同一 reservationId に対する重複イベント受信時に二重作成が発生しないよう、CalendarEventMapping で存在チェックを行う
- Google側の一時障害やレートリミット（HTTP 429）に対応するため、キューベースの非同期処理を検討する

### 5.3 認証トークン管理

- リフレッシュトークンが無効化された場合（ユーザーによるGoogle側での権限取り消し等）、連携状態を「要再認証」に遷移させ、オーナーに再連携を促す
- トークンリフレッシュ処理は排他制御し、並行リクエスト時のトークン競合を防止する

---

## 6. 依存関係

### 6.1 ユニット間依存

| 依存先 | 連携方式 | 連携ID | 内容 |
|---|---|---|---|
| Unit 4（予約管理） | 非同期イベント購読 | E4, E5, E6 | `reservation.created` / `reservation.modified` / `reservation.cancelled` イベントを受信 |
| Unit 1（認証） | 同期 API | A1 | `POST /api/auth/verify` による認証トークン検証（Web管理画面からの連携設定操作時） |

### 6.2 外部サービス依存

| 外部サービス | 用途 |
|---|---|
| Google OAuth 2.0 | オーナーのGoogleアカウント認証・認可 |
| Google Calendar API | カレンダーイベントのCRUD操作、カレンダー一覧取得 |

### 6.3 PACT契約

| 契約ファイル | Consumer | Provider | 内容 |
|---|---|---|---|
| `unit7-unit4-reservation-events.pact.json` | Unit 7 | Unit 4 | 予約イベント（created / modified / cancelled）のメッセージ契約 |

### 6.4 前提条件

- イベント配信基盤（メッセージブローカー）の選定は Elaboration フェーズで決定される（integration_definition.md 備考より）
- Unit 7 は MoSCoW 分類で **Could**（あれば望ましい）に位置づけられており、Unit 4 の予約管理が先行して稼働している前提で構築する
