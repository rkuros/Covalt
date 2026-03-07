# Unit 2: LINE連携基盤 -- ドメインモデル テスト計画

## 必須 Question

### Q1: 使用するプログラミング言語とテストフレームワーク

[Question] Unit 2 のドメインモデルのテストに使用するプログラミング言語とテストフレームワークを教えてください。

[Answer]

### Q2: テストのディレクトリ構造

[Question] テストファイルの配置先となるディレクトリ構造を教えてください（例: `tests/unit/domain/`、`__tests__/` など）。

[Answer]

---

## テスト対象コンポーネント一覧

| # | 種別 | コンポーネント名 |
|---|------|------------------|
| 1 | 値オブジェクト | LineUserId |
| 2 | 値オブジェクト | LiffAccessToken |
| 3 | 値オブジェクト | PushMessage |
| 4 | 値オブジェクト | WebhookEvent |
| 5 | エンティティ | LineChannelConfig |
| 6 | エンティティ | LineFriendship |
| 7 | ドメインサービス | LiffTokenVerificationService |
| 8 | ドメインサービス | MessagePushService |
| 9 | ドメインサービス | WebhookReceiveService |
| 10 | ドメインサービス | FriendFollowService |
| 11 | ドメインサービス | ChannelConfigService |
| 12 | ドメインサービス | RichMenuService |

---

## Step 1: 値オブジェクト LineUserId

### 正常系

- [ ] `U` + 32桁の16進数文字列（例: `U1234567890abcdef1234567890abcdef`）で正しく生成できること
- [ ] 小文字の16進数文字列（a-f）で生成できること
- [ ] 生成後の `value` プロパティが入力値と一致すること
- [ ] 同じ値を持つ2つの LineUserId が等価であること（値オブジェクトの等価性）

### 異常系

- [ ] 空文字列で生成するとバリデーションエラーになること
- [ ] `U` プレフィックスがない文字列で生成するとバリデーションエラーになること
- [ ] `U` + 31桁の16進数文字列（桁数不足）で生成するとバリデーションエラーになること
- [ ] `U` + 33桁の16進数文字列（桁数超過）で生成するとバリデーションエラーになること
- [ ] 大文字の16進数文字列（例: `U1234567890ABCDEF1234567890ABCDEF`）で生成するとバリデーションエラーになること
- [ ] 16進数以外の文字を含む文字列（例: `U1234567890abcdef1234567890abcdeg`）で生成するとバリデーションエラーになること
- [ ] null / undefined で生成するとバリデーションエラーになること

### 境界値

- [ ] `U` + 32桁の `0` のみ（`U00000000000000000000000000000000`）で生成できること
- [ ] `U` + 32桁の `f` のみ（`Uffffffffffffffffffffffffffffffff`）で生成できること

---

## Step 2: 値オブジェクト LiffAccessToken

### 正常系

- [ ] 任意の文字列でトークンを生成できること
- [ ] 生成後の `value` プロパティが入力値と一致すること
- [ ] 同じ値を持つ2つの LiffAccessToken が等価であること

### 異常系

- [ ] 空文字列で生成するとバリデーションエラーになること
- [ ] null / undefined で生成するとバリデーションエラーになること

### 境界値

- [ ] 1文字のトークン文字列で生成できること
- [ ] 非常に長いトークン文字列（例: 1000文字）で生成できること

[Question] LiffAccessToken に文字列長の上限制約はありますか？

[Answer]

---

## Step 3: 値オブジェクト PushMessage

### 正常系

- [ ] `type: "text"`, `text` を指定して生成できること
- [ ] `type: "flex"`, `text`, `altText` を指定して生成できること
- [ ] 生成後の各プロパティが入力値と一致すること
- [ ] 同じ属性値を持つ2つの PushMessage が等価であること

### 異常系

- [ ] `type` が `"text"` でも `"flex"` でもない値（例: `"image"`）で生成するとバリデーションエラーになること
- [ ] `type` が空文字列で生成するとバリデーションエラーになること
- [ ] `type: "text"` で `text` が空文字列の場合にバリデーションエラーになること
- [ ] `type: "text"` で `text` が null / undefined の場合にバリデーションエラーになること
- [ ] `type: "flex"` で `altText` が未指定の場合の振る舞い

[Question] `type: "flex"` の場合に `altText` は必須ですか？また、`text` フィールドの最大文字数制約はありますか？

[Answer]

### 境界値

- [ ] `text` が1文字の PushMessage を生成できること
- [ ] 改行を含む `text`（例: `"予約が確定しました。\n日時: 2024-01-15 10:00"`）で生成できること

---

## Step 4: 値オブジェクト WebhookEvent

### 正常系

- [ ] `eventType: "follow"`, `timestamp`, `source` を指定して生成できること
- [ ] `eventType: "unfollow"` で生成できること
- [ ] `eventType: "message"` で生成できること
- [ ] 生成後の各プロパティが入力値と一致すること
- [ ] 同じ属性値を持つ2つの WebhookEvent が等価であること

### 異常系

- [ ] `eventType` が空文字列の場合にバリデーションエラーになること
- [ ] `eventType` が null / undefined の場合にバリデーションエラーになること
- [ ] `timestamp` が不正なフォーマットの場合にバリデーションエラーになること
- [ ] `source` が null / undefined の場合にバリデーションエラーになること

### 境界値

- [ ] `timestamp` が ISO 8601 形式の最小値（例: `"2000-01-01T00:00:00Z"`）で生成できること

[Question] `eventType` に許容される値の一覧は `follow`, `unfollow`, `message` の3つのみですか？それとも他のイベント種別もサポートしますか？

[Answer]

---

## Step 5: エンティティ LineChannelConfig

### 正常系

- [ ] 全属性（`ownerId`, `channelAccessToken`, `channelSecret`, `liffId`, `webhookUrl`, `isActive`）を指定して生成できること
- [ ] `isActive` のデフォルト値が適切に設定されること
- [ ] `isActive` を `true` に変更できること
- [ ] `isActive` を `false` に変更（無効化）できること
- [ ] `channelAccessToken` を更新できること
- [ ] `channelSecret` を更新できること
- [ ] `liffId` を更新できること
- [ ] `webhookUrl` を更新できること

### 異常系

- [ ] `ownerId` が空文字列の場合にバリデーションエラーになること
- [ ] `channelAccessToken` が空文字列の場合にバリデーションエラーになること
- [ ] `channelSecret` が空文字列の場合にバリデーションエラーになること
- [ ] `liffId` が空文字列の場合にバリデーションエラーになること
- [ ] `webhookUrl` が不正な URL 形式の場合にバリデーションエラーになること

### 境界値

- [ ] `webhookUrl` が HTTPS スキームの URL で生成できること
- [ ] `webhookUrl` が HTTP スキームの URL の場合の振る舞い

[Question] `webhookUrl` は HTTPS のみ許容しますか？ `channelAccessToken` や `channelSecret` にフォーマットの制約はありますか？

[Answer]

---

## Step 6: エンティティ LineFriendship

### 正常系

- [ ] `ownerId`, `lineUserId`, `displayName`, `status: "active"`, `followedAt` を指定して生成できること
- [ ] follow イベントにより `status` が `"active"` に設定されること
- [ ] unfollow イベントにより `status` が `"active"` から `"blocked"` に遷移し、`unfollowedAt` が設定されること
- [ ] 再 follow により `status` が `"blocked"` から `"active"` に遷移し、`followedAt` が更新されること
- [ ] `displayName` を更新できること

### 異常系

- [ ] `ownerId` が空文字列の場合にバリデーションエラーになること
- [ ] `lineUserId` が不正な形式（`^U[0-9a-f]{32}$` に一致しない）の場合にバリデーションエラーになること
- [ ] `status` が `"active"` でも `"blocked"` でもない値の場合にバリデーションエラーになること
- [ ] `followedAt` が未設定の場合の振る舞い

### 境界値

- [ ] `displayName` が1文字の場合に生成できること
- [ ] `displayName` が空文字列の場合の振る舞い

[Question] `displayName` に空文字列は許容されますか？LINE ユーザーが表示名未設定の場合のハンドリング方針を教えてください。

[Answer]

---

## Step 7: ドメインサービス LiffTokenVerificationService

> 参照 Pact: `unit4-unit2-liff.pact.json` (A2)

### 正常系

- [ ] 有効な LIFF アクセストークンを LINE Platform に検証リクエストし、`lineUserId` と `displayName` を返却できること
- [ ] 返却される `lineUserId` が `^U[0-9a-f]{32}$` 形式であること
- [ ] 返却される `displayName` が文字列型であること

### 異常系

- [ ] 無効な LIFF アクセストークンを検証した場合に `INVALID_LIFF_TOKEN` エラー (401) が返ること
- [ ] LINE Platform への通信がタイムアウトした場合のエラーハンドリングが適切に行われること
- [ ] LINE Platform が 500 エラーを返した場合のエラーハンドリングが適切に行われること
- [ ] LINE チャネル設定が未設定の場合にエラーが返ること

### 境界値

- [ ] 空文字列のアクセストークンで検証した場合にバリデーションエラーになること

[Question] LINE Platform API への通信タイムアウトの閾値とリトライ回数の仕様を教えてください。

[Answer]

---

## Step 8: ドメインサービス MessagePushService

> 参照 Pact: `unit5-unit2-messaging.pact.json` (A9)

### 正常系

- [ ] `ownerId` に紐づくチャネルアクセストークンを用いてプッシュメッセージ（type: text）を送信し、`success: true` と `messageId` が返却されること
- [ ] プッシュメッセージ（type: flex）を送信し、`success: true` と `messageId` が返却されること
- [ ] 複数メッセージを1回のリクエストで送信できること

### 異常系

- [ ] ブロック済みユーザー（`status: "blocked"`）への送信時に `USER_BLOCKED` エラー (422) が返ること（BR-05）
- [ ] ブロック済みユーザーへの送信時のレスポンスに `success: false`, `error: "USER_BLOCKED"`, `message: "ユーザーがアカウントをブロックしているため送信できません"` が含まれること
- [ ] 存在しない `ownerId` でメッセージ送信を試みた場合にエラーが返ること
- [ ] 存在しない `lineUserId` でメッセージ送信を試みた場合にエラーが返ること
- [ ] LINE Messaging API がエラーを返した場合のリトライ・フォールバック処理が適切に行われること
- [ ] `messages` 配列が空の場合にバリデーションエラーになること

### 境界値

- [ ] `messages` 配列に1件のメッセージのみの場合に送信できること
- [ ] `messages` 配列の上限件数の確認

[Question] 1回のプッシュ送信リクエストで許容される `messages` 配列の最大件数を教えてください。LINE Messaging API の制約（最大5件）に準拠しますか？

[Answer]

---

## Step 9: ドメインサービス WebhookReceiveService

> 参照 Pact: `unit6-unit2-line-webhook-events.pact.json`

### 正常系

- [ ] 正当な `x-line-signature` を持つ Webhook リクエストの署名検証が成功すること（HMAC-SHA256）
- [ ] `follow` イベントを受信し、FriendFollowService へディスパッチされること
- [ ] `unfollow` イベントを受信し、対応する処理にディスパッチされること
- [ ] `message` イベントを受信し、対応する処理にディスパッチされること
- [ ] Webhook エンドポイントが迅速に 200 応答を返すこと

### 異常系

- [ ] `x-line-signature` が不正な場合にリクエストを拒否すること（400 または 403）
- [ ] `x-line-signature` ヘッダが欠落している場合にリクエストを拒否すること
- [ ] リクエストボディが空の場合にエラーが返ること
- [ ] リクエストボディが不正な JSON の場合にエラーが返ること
- [ ] 不明なイベント種別を受信した場合のハンドリングが適切に行われること

### 冪等性（Webhook リトライ対応）

- [ ] 同一 `webhookEventId` のイベントを2回受信した場合に重複処理されないこと
- [ ] 同一 `webhookEventId` のイベントを2回受信した場合にも 200 応答が返ること

### 境界値

- [ ] `channelSecret` が空文字列の状態で署名検証を行った場合にエラーが返ること

[Question] 冪等性を保証するための `webhookEventId` の重複排除の TTL（有効期間）はどのように設定しますか？

[Answer]

---

## Step 10: ドメインサービス FriendFollowService

> 参照: BR-01, イベント E7 (`line.friend_added`)

### 正常系

- [ ] follow イベント受信時に `LineFriendship` エンティティが新規作成されること（`status: "active"`, `followedAt` が設定される）
- [ ] follow イベント受信時にウェルカムメッセージが自動送信されること（BR-01）
- [ ] follow イベント受信時に `line.friend_added` イベントが発行されること（E7）
- [ ] `line.friend_added` イベントのペイロードに `eventType`, `ownerId`, `lineUserId`, `displayName`, `timestamp` が含まれること
- [ ] `line.friend_added` イベントの `lineUserId` が `^U[0-9a-f]{32}$` 形式であること
- [ ] `line.friend_added` イベントの `timestamp` が `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$` 形式（ISO 8601 UTC）であること
- [ ] 過去にブロック（unfollow）したユーザーが再 follow した場合に `LineFriendship` が `"active"` に更新されること

### 異常系

- [ ] LINE Platform からプロフィール取得に失敗した場合のエラーハンドリングが適切に行われること
- [ ] ウェルカムメッセージの送信に失敗した場合でも `LineFriendship` の作成と `line.friend_added` イベントの発行は行われること
- [ ] `ownerId` に紐づく LineChannelConfig が存在しない場合にエラーが返ること

### 境界値

- [ ] 同一 `lineUserId` から同一 `ownerId` への連続した follow イベント（重複）を処理した場合の振る舞い

[Question] ウェルカムメッセージの送信に失敗した場合、`LineFriendship` の作成と `line.friend_added` イベントの発行は継続すべきですか？それともロールバックすべきですか？

[Answer]

---

## Step 11: ドメインサービス ChannelConfigService

> 参照: BR-04, US-S05

### 正常系

- [ ] LINE チャネル設定を新規作成（`channelAccessToken`, `channelSecret`, `liffId` を保存）できること
- [ ] 既存の LINE チャネル設定を更新できること
- [ ] LINE チャネル設定を取得できること
- [ ] LINE チャネル設定を削除（無効化）できること
- [ ] 接続テスト（疎通確認）が成功した場合に成功レスポンスが返ること
- [ ] Webhook URL が自動発行されること

### 異常系

- [ ] 接続テスト（疎通確認）が失敗した場合にエラーが返ること（不正なチャネルアクセストークン）
- [ ] 存在しない `ownerId` で設定を取得しようとした場合にエラーが返ること
- [ ] 既に設定が存在する `ownerId` で重複作成しようとした場合の振る舞い
- [ ] `channelAccessToken` が空文字列の場合にバリデーションエラーになること
- [ ] `channelSecret` が空文字列の場合にバリデーションエラーになること

### 境界値

- [ ] `liffId` の最小有効値で設定できること

[Question] 1つの `ownerId` に対して複数の LineChannelConfig を持つことは許容されますか？それとも1対1の関係ですか？

[Answer]

---

## Step 12: ドメインサービス RichMenuService

> 参照: BR-02, US-C02

### 正常系

- [ ] リッチメニューを LINE Platform に対して作成できること
- [ ] リッチメニューに「予約する」アクション（LIFF URL 起動）を設定できること
- [ ] リッチメニューに「予約確認」アクションを設定できること
- [ ] リッチメニューに「予約履歴」アクションを設定できること
- [ ] LIFF URL がリッチメニューに正しく埋め込まれること（`liffId` に基づく URL 生成）
- [ ] リッチメニューをユーザーにリンク（適用）できること

### 異常系

- [ ] LINE Platform へのリッチメニュー作成 API 呼び出しが失敗した場合にエラーが返ること
- [ ] `ownerId` に紐づく LineChannelConfig が存在しない場合にエラーが返ること
- [ ] `liffId` が未設定の場合にリッチメニュー作成がエラーになること

### 境界値

- [ ] リッチメニューのアクション数が仕様上の上限に達している場合の振る舞い

[Question] リッチメニューのテンプレート（レイアウト・画像）はどこで管理しますか？テスト時にモック化する対象を教えてください。

[Answer]

---

## 補足: 外部依存のモック方針

以下の外部依存はテスト時にモック化が必要と想定される。

| 外部依存 | モック対象 |
|----------|-----------|
| LINE Messaging API (Push Message) | MessagePushService のテストで使用 |
| LINE Messaging API (Rich Menu) | RichMenuService のテストで使用 |
| LINE Messaging API (Get Profile) | FriendFollowService のテストで使用 |
| LINE LIFF Server API (Verify) | LiffTokenVerificationService のテストで使用 |
| LINE Webhook 署名検証 | WebhookReceiveService のテストで使用 |
| イベントバス（`line.friend_added` 発行） | FriendFollowService のテストで使用 |
| Unit 1 認証 API (`POST /api/auth/verify`) | 管理者向け API テストで使用 |
| リポジトリ（LineChannelConfig, LineFriendship の永続化） | 各ドメインサービスのテストで使用 |

[Question] 外部依存のモック化にはどのライブラリ・手法を使用しますか（例: インターフェースによる DI、スタブライブラリ等）？

[Answer]
