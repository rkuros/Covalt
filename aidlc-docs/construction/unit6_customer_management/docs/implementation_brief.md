# Unit 6: 顧客情報管理 -- 実装ブリーフ

## 1. コンポーネント一覧

### エンティティ

| エンティティ | 説明 |
|---|---|
| Customer | 顧客の集約ルート。customerId を識別子とし、オーナーとの所属関係・LINE 連携状態・個人情報を保持する |

### 値オブジェクト

| 値オブジェクト | 説明 |
|---|---|
| CustomerId | 顧客を一意に識別する ID（例: `cust-001`） |
| OwnerId | 顧客が所属するオーナーの ID |
| LineUserId | LINE プラットフォーム上のユーザー ID（`U` + 32桁の16進文字列）。nullable |
| DisplayName | LINE の表示名。nullable |
| CustomerName | オーナーが管理用に付与する顧客名 |

### サービス

| サービス | 種別 | 説明 |
|---|---|---|
| CustomerQueryService | アプリケーション | ID 検索・LINE ユーザー ID 検索・名前検索を処理する |
| CustomerCommandService | アプリケーション | 顧客の新規作成（手動 / LINE 友だち追加）および情報編集を処理する |
| CustomerAutoRegistrationHandler | イベントハンドラ | `line.friend_added` イベントを購読し、顧客自動登録を実行する |

---

## 2. Provider API 仕様サマリ

Unit 6 が Provider として公開する同期 API。Consumer は主に Unit 4（予約管理）。

| # | メソッド | パス | クエリパラメータ | 用途 | 成功時ステータス | エラー時ステータス |
|---|---------|------|----------------|------|----------------|------------------|
| A6 | GET | `/api/customers/{customerId}` | -- | 顧客 ID による単一取得 | 200 | 404 (`CUSTOMER_NOT_FOUND`) |
| A7 | GET | `/api/customers/by-line-user` | `ownerId`, `lineUserId` | LINE ユーザー ID による顧客検索 | 200 | 404 |
| A8 | GET | `/api/customers/search` | `ownerId`, `q` | 顧客名の部分一致検索 | 200 | -- |
| -- | POST | `/api/customers` | -- | 新規顧客の手動作成 | 201 | -- |

### レスポンスボディ共通フィールド（単一顧客）

| フィールド | 型 | nullable | 説明 |
|---|---|---|---|
| customerId | string | No | 顧客 ID |
| ownerId | string | No | 所属オーナー ID |
| customerName | string | No | 顧客名 |
| displayName | string | Yes | LINE 表示名 |
| lineUserId | string | Yes | LINE ユーザー ID |
| isLineLinked | boolean | No | LINE 連携済みか |
| registeredAt | string (ISO 8601) | No | 登録日時 |

### 検索 API レスポンスボディ（`GET /api/customers/search`）

| フィールド | 型 | 説明 |
|---|---|---|
| customers | array | 検索結果の顧客リスト（各要素は `customerId`, `customerName`, `isLineLinked`） |
| total | integer | 検索結果の総件数 |

### POST リクエストボディ（`POST /api/customers`）

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| ownerId | string | Yes | 所属オーナー ID |
| customerName | string | Yes | 顧客名 |

---

## 3. 購読イベント

### `line.friend_added`（E7）

- **Provider**: Unit 2（LINE 連携基盤）
- **Consumer**: Unit 6（顧客情報管理）
- **配信契機**: LINE 公式アカウントへの友だち追加 Webhook を Unit 2 が受信したとき

#### ペイロード

| フィールド | 型 | マッチングルール | 説明 |
|---|---|---|---|
| eventType | string | 正規表現 `^line\.friend_added$` | イベント種別（固定値） |
| ownerId | string | 型一致 | 対象オーナーの ID |
| lineUserId | string | 正規表現 `^U[0-9a-f]{32}$` | LINE ユーザー ID |
| displayName | string | 型一致 | LINE の表示名 |
| timestamp | string | 正規表現（ISO 8601） | イベント発生日時 |

#### 処理内容

1. `ownerId` + `lineUserId` の組み合わせで既存顧客を検索する
2. 該当顧客が存在しない場合、新規 Customer エンティティを生成して永続化する
   - `customerName` には `displayName` の値を初期値として設定する
   - `isLineLinked` を `true` に設定する
3. 該当顧客が既に存在する場合、重複登録を行わない（冪等性の担保）

---

## 4. ビジネスルール

spec のアクセプタンスクライテリア（US-O09 / US-O10 / US-O11）から抽出したルール。

| # | ルール | 出典 |
|---|-------|------|
| BR-1 | 顧客一覧は Web 管理画面で表示可能であること | US-O09 |
| BR-2 | 顧客名による検索（部分一致）が可能であること | US-O09 |
| BR-3 | 各顧客について LINE 連携済みかどうかを判定・表示できること | US-O09 |
| BR-4 | 顧客詳細画面で顧客名・LINE 表示名・登録日を表示できること | US-O10 |
| BR-5 | 顧客詳細画面でその顧客の予約履歴（過去・今後）を表示できること（Unit 4 への問い合わせが必要） | US-O10 |
| BR-6 | 顧客名等の情報を編集し保存できること | US-O11 |
| BR-7 | LINE 連携なしの顧客を手動で新規登録できること（`POST /api/customers` に対応） | US-O11 |
| BR-8 | LINE 友だち追加時に顧客が自動登録されること（`line.friend_added` イベント経由） | E7 / 暗黙 |
| BR-9 | 同一 `ownerId` + `lineUserId` の組み合わせで顧客が重複登録されないこと（冪等性） | E7 / 暗黙 |

---

## 5. 横断的関心事

`cross_cutting_security.md`（US-S06, US-S07）に基づく Unit 6 固有の適用事項。

### 個人情報の保護（US-S06 -- Must）

| 関心事 | 適用内容 |
|--------|---------|
| 暗号化保存 | `lineUserId`、`displayName` 等の個人情報はデータベース上で暗号化して保存する |
| HTTPS 通信 | すべての API 通信は HTTPS 経由とする |
| テナント分離 | オーナーは自分の顧客情報のみアクセス可能。すべての検索・取得 API で `ownerId` によるスコープ制限を適用し、他オーナーの顧客情報へのアクセスを防止する |
| エクスポート制御 | 顧客情報のエクスポート機能を設ける場合、同等のアクセス制御を適用する |

### 可用性（US-S07 -- Must）

| 関心事 | 適用内容 |
|--------|---------|
| イベント処理のリトライ | `line.friend_added` イベントの処理に失敗した場合、リトライを行う |
| エラーハンドリング | システムエラー発生時、エラーメッセージの返却およびオーナーへの通知を行う |

### 認証

| 関心事 | 適用内容 |
|--------|---------|
| トークン検証 | Unit 6 の API エンドポイントは Unit 1 の `POST /api/auth/verify`（A1）を用いて認証トークンを検証する |

---

## 6. 依存関係

### Unit 6 が依存するユニット（上流）

| 依存先 | 連携種別 | 連携 ID | 内容 |
|--------|---------|---------|------|
| Unit 1（認証） | 同期 API | A1 | `POST /api/auth/verify` -- API リクエストの認証トークン検証 |
| Unit 2（LINE 連携基盤） | 非同期イベント | E7 | `line.friend_added` -- 友だち追加時の顧客自動登録トリガー |

### Unit 6 に依存するユニット（下流）

| 依存元 | 連携種別 | 連携 ID | 内容 |
|--------|---------|---------|------|
| Unit 4（予約管理） | 同期 API | A6 | `GET /api/customers/{customerId}` -- 顧客 ID による取得 |
| Unit 4（予約管理） | 同期 API | A7 | `GET /api/customers/by-line-user` -- LINE ユーザー ID による検索 |
| Unit 4（予約管理） | 同期 API | A8 | `GET /api/customers/search` -- 顧客名検索（手動予約用） |
| Unit 4（予約管理） | 同期 API | -- | `POST /api/customers` -- 手動予約時の新規顧客作成 |
