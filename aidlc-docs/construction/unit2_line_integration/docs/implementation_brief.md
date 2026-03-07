# Unit 2: LINE連携基盤 -- 実装ブリーフ

## 1. コンポーネント一覧

### 1.1 エンティティ

| エンティティ | 属性 | 責務 |
|---|---|---|
| **LineChannelConfig** | `ownerId`, `channelAccessToken`, `channelSecret`, `liffId`, `webhookUrl`, `isActive` | オーナーごとのLINE公式アカウント接続設定を保持する。Messaging API・LIFF・Webhookの認証情報を一元管理する |
| **LineFriendship** | `ownerId`, `lineUserId`, `displayName`, `status` (active / blocked), `followedAt`, `unfollowedAt` | 友だち追加状態を管理する。follow / unfollow イベントに応じてステータスを遷移させる |

### 1.2 値オブジェクト

| 値オブジェクト | 属性 | 責務 |
|---|---|---|
| **LineUserId** | `value` (正規表現: `^U[0-9a-f]{32}$`) | LINE ユーザーIDの形式を保証する不変オブジェクト |
| **LiffAccessToken** | `value` | LIFF SDK から取得したアクセストークンを表す。検証前の値を型安全に扱う |
| **PushMessage** | `type` (`text` \| `flex`), `text`, `altText` | LINE Messaging API へ送信するメッセージ1件分の構造を表す |
| **WebhookEvent** | `eventType`, `timestamp`, `source` | LINE Platform から受信した Webhook イベントの共通構造 |

### 1.3 ドメインサービス

| サービス | 責務 |
|---|---|
| **LiffTokenVerificationService** | LIFF アクセストークンを LINE Platform に問い合わせて検証し、対応する `lineUserId` と `displayName` を返却する |
| **MessagePushService** | `ownerId` に紐づくチャネルアクセストークンを用いて LINE Messaging API 経由でプッシュメッセージを送信する。ブロック済みユーザーへの送信エラーをハンドリングする |
| **WebhookReceiveService** | LINE Platform からの Webhook リクエストを受信し、署名検証を行い、イベント種別ごとにディスパッチする |
| **FriendFollowService** | 友だち追加 (follow) イベントを処理する。`LineFriendship` の作成、ウェルカムメッセージの送信、`line.friend_added` イベントの発行を行う |
| **ChannelConfigService** | LINE チャネル設定の CRUD と接続テスト（疎通確認）を提供する |
| **RichMenuService** | リッチメニューの作成・設定を LINE Platform に対して行う。LIFF URL の埋め込みを管理する |

---

## 2. Provider API 仕様サマリ

Unit 2 が Provider として公開する同期 API は以下の通り。

### 2.1 LIFF アクセストークン検証 (A2)

| 項目 | 値 |
|---|---|
| **Consumer** | Unit 4 (予約管理) |
| **Method / Path** | `POST /api/line/liff/verify` |
| **Request Body** | `{ "accessToken": string }` |
| **成功レスポンス (200)** | `{ "lineUserId": string, "displayName": string }` |
| **エラーレスポンス (401)** | `{ "error": "INVALID_LIFF_TOKEN", "message": "LIFFアクセストークンが無効です" }` |
| **Provider State** | LINE連携が設定済みである |

### 2.2 LINE プッシュメッセージ送信 (A9)

| 項目 | 値 |
|---|---|
| **Consumer** | Unit 5 (通知) |
| **Method / Path** | `POST /api/line/messages/push` |
| **Request Body** | `{ "ownerId": string, "lineUserId": string, "messages": [{ "type": "text"\|"flex", "text": string }] }` |
| **成功レスポンス (200)** | `{ "success": true, "messageId": string }` |
| **エラーレスポンス (422)** | `{ "success": false, "error": "USER_BLOCKED", "message": "ユーザーがアカウントをブロックしているため送信できません" }` |
| **Provider State (正常)** | LINE連携が設定済みである |
| **Provider State (エラー)** | LINE ユーザーがブロック済みである |

### 2.3 Webhook エンドポイント (LINE Platform -> Unit 2)

| 項目 | 値 |
|---|---|
| **呼び出し元** | LINE Platform |
| **Method / Path** | `POST /api/line/webhook` |
| **処理概要** | LINE Platform からのイベント (follow, unfollow, message 等) を受信し、署名検証後にドメインロジックへディスパッチする |

---

## 3. 発行イベント

### 3.1 `line.friend_added` (E7)

友だち追加 Webhook を受信した際に発行する非同期イベント。

| フィールド | 型 | ルール | 説明 |
|---|---|---|---|
| `eventType` | string | 固定値: `line.friend_added` | イベント種別 |
| `ownerId` | string | 任意文字列 | 友だち追加された LINE 公式アカウントを保有するオーナーの ID |
| `lineUserId` | string | 正規表現: `^U[0-9a-f]{32}$` | 友だち追加した LINE ユーザーの ID |
| `displayName` | string | 任意文字列 | LINE ユーザーの表示名 |
| `timestamp` | string (ISO 8601) | 正規表現: `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$` | イベント発生日時 (UTC) |

**Consumer**: Unit 6 (顧客情報管理) -- 顧客自動登録トリガーとして使用

**ペイロード例**:
```json
{
  "eventType": "line.friend_added",
  "ownerId": "owner-001",
  "lineUserId": "U1234567890abcdef1234567890abcdef",
  "displayName": "田中太郎",
  "timestamp": "2024-01-10T09:00:00Z"
}
```

---

## 4. ビジネスルール

spec のアクセプタンスクライテリアから抽出したビジネスルールを以下に整理する。

### BR-01: 友だち追加と顧客自動登録

- QR コードまたはリンクからの友だち追加を受け付ける
- 友だち追加時に LINE ユーザー ID と表示名をシステムに自動登録する (`line.friend_added` イベント発行)
- 友だち追加完了時にウェルカムメッセージを自動送信する
- ウェルカムメッセージにはシステム利用方法の簡単な案内を含める

### BR-02: リッチメニュー

- トーク画面下部にリッチメニューを常時表示する
- 「予約する」タップ時に LIFF アプリ（予約画面）を起動する
- 「予約確認」タップ時に予約一覧を表示する
- 「予約履歴」タップ時に過去の予約履歴を表示する

### BR-03: LIFF アプリ起動と認証

- リッチメニューまたはメッセージ内リンクから LIFF アプリを起動できる
- LINE の認証情報を自動的に引き継ぎ、追加ログインを不要とする
- LIFF アプリ起動時に LINE ユーザー情報（ユーザー ID、表示名）を取得する

### BR-04: LINE 公式アカウント接続設定

- Messaging API のチャネルアクセストークン・チャネルシークレットを設定できる
- LIFF アプリの ID を設定できる
- Webhook URL を発行し、LINE Developers Console に設定する情報を表示する
- 接続テスト（疎通確認）を実行できる

### BR-05: ブロック済みユーザーへの送信制御

- ブロック済みユーザーへのプッシュメッセージ送信時は `USER_BLOCKED` エラー (422) を返却する

---

## 5. 外部システム連携

Unit 2 は LINE Platform の以下 3 つのインターフェースと連携する。

### 5.1 Messaging API

| 連携ポイント | 方向 | 用途 |
|---|---|---|
| Push Message API | Unit 2 -> LINE Platform | 顧客へのプッシュメッセージ送信（予約確認、リマインダー等） |
| Rich Menu API | Unit 2 -> LINE Platform | リッチメニューの作成・ユーザーへのリンク |
| Get Profile API | Unit 2 -> LINE Platform | LINE ユーザーの表示名取得（友だち追加時） |

- `ownerId` に紐づく `channelAccessToken` を Authorization ヘッダに設定して呼び出す
- メッセージタイプは `text` および `flex` をサポートする

### 5.2 LIFF SDK

| 連携ポイント | 方向 | 用途 |
|---|---|---|
| LIFF Init / Login | クライアント (LIFF アプリ) -> LINE Platform | LIFF アプリの初期化と LINE ログイン |
| LIFF Access Token | クライアント -> Unit 2 | LIFF アクセストークンの送信・サーバー側検証 |
| Verify API | Unit 2 -> LINE Platform | LIFF アクセストークンの正当性を LINE Platform に問い合わせ検証 |

- LIFF アプリ起動時に `liffId` を指定して初期化する
- 取得した LIFF アクセストークンを `POST /api/line/liff/verify` で検証し、`lineUserId` と `displayName` を返却する

### 5.3 Webhook

| 連携ポイント | 方向 | 用途 |
|---|---|---|
| Webhook 受信 | LINE Platform -> Unit 2 | follow / unfollow / message 等のイベント受信 |

- LINE Platform が `POST /api/line/webhook` にイベントを送信する
- リクエストヘッダの `x-line-signature` を `channelSecret` で HMAC-SHA256 検証し、正当性を確認する

---

## 6. 横断的関心事

### 6.1 Webhook 署名検証

- LINE Platform からの Webhook リクエストは `x-line-signature` ヘッダを用いて HMAC-SHA256 署名検証を行う
- 検証失敗時はリクエストを拒否する (400/403)

### 6.2 Webhook リトライ対応 (US-S07)

- LINE Platform は Webhook 送信失敗時にリトライを行う
- 同一イベントの重複受信に対して冪等性を保証する（`webhookEventId` による重複排除）
- Webhook エンドポイントは迅速に 200 応答を返し、重い処理は非同期で実行する

### 6.3 個人情報保護 (US-S06)

- 顧客の個人情報（LINE ユーザー ID、表示名等）は暗号化して保存する
- API 通信はすべて HTTPS 経由で行う
- オーナーは自分の顧客情報のみアクセス可能とし、他オーナーの情報へのアクセスを禁止する（マルチテナント分離）

### 6.4 エラーハンドリング (US-S07)

- LINE Platform API 呼び出し失敗時は適切なリトライ・フォールバック処理を行う
- システムエラー発生時は顧客にエラーメッセージを表示し、オーナーに通知する

### 6.5 チャネルアクセストークン管理

- `channelAccessToken` および `channelSecret` は暗号化して保存する
- API 呼び出し時のみ復号して使用する

---

## 7. 依存関係

### 7.1 Unit 2 が Provider となる連携 (他ユニットから呼ばれる)

| Consumer | 連携 ID | インターフェース | 種別 |
|---|---|---|---|
| Unit 4 (予約管理) | A2 | `POST /api/line/liff/verify` | 同期 API |
| Unit 5 (通知) | A9 | `POST /api/line/messages/push` | 同期 API |
| Unit 6 (顧客情報管理) | E7 | `line.friend_added` イベント | 非同期メッセージ |

### 7.2 Unit 2 が Consumer となる連携 (他ユニットを呼ぶ)

| Provider | 連携 ID | インターフェース | 種別 |
|---|---|---|---|
| Unit 1 (認証・認可) | A1 | `POST /api/auth/verify` | 同期 API |

- 管理者向け API（チャネル設定等）のリクエスト時に Unit 1 の認証トークン検証を利用する

### 7.3 外部依存

| 外部システム | 連携内容 |
|---|---|
| LINE Messaging API | プッシュメッセージ送信、リッチメニュー管理、プロフィール取得 |
| LINE LIFF Server API | LIFF アクセストークン検証 |
| LINE Webhook | follow / unfollow 等のイベント受信 |
