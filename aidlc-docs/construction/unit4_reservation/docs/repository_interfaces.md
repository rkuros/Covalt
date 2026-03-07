# Unit 4 予約管理 - リポジトリインターフェース定義

## 概要

Unit 4（予約管理）の境界づけられたコンテキストにおけるリポジトリインターフェースおよび外部サービス連携用の Gateway インターフェースを定義する。

リポジトリは集約の永続化と再構築を担う。Gateway は外部ユニット（Unit 1, 2, 3, 6）への API 呼び出しを抽象化する。EventPublisher はドメインイベントの発行を抽象化する。

外部連携インターフェースには Gateway パターンを採用する（Q30 確定）。リポジトリ（内部永続化）とは明確に分離し、命名で区別する。

---

## 1. ReservationRepository（予約リポジトリ）

Reservation 集約の永続化と取得を担うリポジトリインターフェース。
検索メソッドは個別メソッドとして定義する（Q29 確定）。

### メソッド一覧

#### 保存系

| メソッド | 入力 | 出力 | 説明 |
|---------|------|------|------|
| save | Reservation | void | 予約の新規作成および更新を永続化する。ReservationHistory を含む集約全体を保存する |

備考: save は新規作成（INSERT）と更新（UPDATE）を兼ねる。集約ルートの reservationId の存在有無で判定するか、実装方式は永続化層に委ねる。

#### 取得系

| メソッド | 入力 | 出力 | 説明 |
|---------|------|------|------|
| findById | ReservationId | Reservation (nullable) | 予約IDで予約を取得する。ReservationHistory を含む集約全体をロードする |

#### 一覧系（顧客向け）

| メソッド | 入力 | 出力 | 説明 |
|---------|------|------|------|
| findUpcomingByCustomerId | CustomerId, OwnerId | List&lt;Reservation&gt; | 顧客IDとオーナーIDで今後の予約一覧を取得する（dateTime が現在以降、status = confirmed）。US-C08 対応 |
| findPastByCustomerId | CustomerId, OwnerId | List&lt;Reservation&gt; | 顧客IDとオーナーIDで過去の予約履歴を取得する（dateTime が現在より前、または status = cancelled / completed）。直近順にソート。US-C09 対応 |

#### 一覧系（オーナー向け）

| メソッド | 入力 | 出力 | 説明 |
|---------|------|------|------|
| findByOwnerIdAndDateRange | OwnerId, startDate, endDate | List&lt;Reservation&gt; | オーナーIDと日付範囲で予約一覧を取得する。日別/週別/月別の表示切り替えに対応。US-O01 対応 |
| findByOwnerIdAndStatus | OwnerId, ReservationStatus | List&lt;Reservation&gt; | オーナーIDとステータスで予約一覧を取得する。ステータスフィルタリングに対応。US-O01 対応 |
| findByOwnerIdAndDateRangeAndStatus | OwnerId, startDate, endDate, ReservationStatus | List&lt;Reservation&gt; | オーナーID、日付範囲、ステータスの複合条件で予約一覧を取得する。US-O01 のフィルタリング + 日付範囲指定の組み合わせに対応 |

### 設計備考

- 各メソッドは Reservation 集約全体（ReservationHistory を含む）を返す。ただし一覧表示で履歴が不要な場合、実装レベルで遅延ロードを検討してよい
- ソート順は各メソッドのユースケースに準じる（今後の予約 = dateTime 昇順、過去の履歴 = dateTime 降順、オーナー一覧 = dateTime 昇順）
- ページネーションの必要性は実装フェーズで判断する。インターフェース定義時点では含めない

---

## 2. SlotGateway（スロット Gateway）

Unit 3（スケジュール・空き枠管理）のスロット API を呼び出すための Gateway インターフェース。

### 対応 PACT

`unit4-unit3-slots.pact.json`

### メソッド一覧

| メソッド | 入力 | 出力 | 説明 | PACT 対応 |
|---------|------|------|------|-----------|
| findAvailableSlots | OwnerId, date (YYYY-MM-DD) | SlotListResult | 指定日の空きスロット一覧を取得する。休業日の場合は isHoliday = true と空配列を返す | GET /api/slots/available |
| reserveSlot | SlotId, ReservationId | SlotReserveResult | スロットを予約確保する。競合時（409）はエラーを返す | PUT /api/slots/{slotId}/reserve |
| releaseSlot | SlotId, ReservationId | SlotReleaseResult | スロットを解放する（キャンセル・変更時） | PUT /api/slots/{slotId}/release |

### 戻り値の概要

**SlotListResult:**
- date: 対象日付
- isHoliday: 休業日フラグ（オプション）
- slots: スロット情報のリスト（slotId, startTime, endTime, durationMinutes, status）

**SlotReserveResult:**
- slotId: 確保されたスロットID
- status: `booked`
- reservationId: 紐づけられた予約ID

**SlotReleaseResult:**
- slotId: 解放されたスロットID
- status: `available`

### エラーケース

| HTTP ステータス | エラーコード | 説明 |
|---------------|------------|------|
| 409 | SLOT_ALREADY_BOOKED | 指定スロットが既に予約済み（reserveSlot 時） |

---

## 3. CustomerGateway（顧客 Gateway）

Unit 6（顧客情報管理）の顧客 API を呼び出すための Gateway インターフェース。

### 対応 PACT

`unit4-unit6-customer.pact.json`

### メソッド一覧

| メソッド | 入力 | 出力 | 説明 | PACT 対応 |
|---------|------|------|------|-----------|
| findById | CustomerId | CustomerInfo (nullable) | 顧客IDで顧客情報を取得する。存在しない場合は null を返す | GET /api/customers/{customerId} |
| findByLineUserId | OwnerId, LineUserId | CustomerInfo (nullable) | LINE ユーザーIDで顧客を検索する。顧客操作時の顧客特定に使用 | GET /api/customers/by-line-user |
| searchByName | OwnerId, query (string) | CustomerSearchResult | 顧客名で検索する。オーナーの手動予約時の顧客選択に使用 | GET /api/customers/search |
| create | OwnerId, customerName | CustomerInfo | 新規顧客を作成する。オーナーの手動予約時に新規顧客を登録する場合に使用（Q15 確定） | POST /api/customers |

### 戻り値の概要

**CustomerInfo:**
- customerId: 顧客ID
- ownerId: オーナーID
- customerName: 顧客名
- displayName: 表示名（LINE 表示名。null 許容）
- lineUserId: LINE ユーザーID（null 許容）
- isLineLinked: LINE 連携済みフラグ
- registeredAt: 登録日時

**CustomerSearchResult:**
- customers: 顧客情報のリスト（customerId, customerName, isLineLinked）
- total: 検索結果件数

### エラーケース

| HTTP ステータス | エラーコード | 説明 |
|---------------|------------|------|
| 404 | CUSTOMER_NOT_FOUND | 指定された顧客が見つからない（findById 時） |

---

## 4. AuthGateway（認証 Gateway）

Unit 1（認証・アカウント管理）の認証 API を呼び出すための Gateway インターフェース。

### 対応 PACT

`unit4-unit1-auth.pact.json`

### メソッド一覧

| メソッド | 入力 | 出力 | 説明 | PACT 対応 |
|---------|------|------|------|-----------|
| verifyToken | token (string) | AuthResult | オーナーの認証トークンを検証する。Web 管理画面からの操作時に使用 | POST /api/auth/verify |

### 戻り値の概要

**AuthResult:**
- ownerId: 認証されたオーナーID
- email: オーナーのメールアドレス
- role: ロール（`owner` / `admin`）

### エラーケース

| HTTP ステータス | エラーコード | 説明 |
|---------------|------------|------|
| 401 | UNAUTHORIZED | 認証トークンが無効 |
| 403 | ACCOUNT_DISABLED | アカウントが無効化されている |

---

## 5. LiffGateway（LIFF Gateway）

Unit 2（LINE 連携基盤）の LIFF トークン検証 API を呼び出すための Gateway インターフェース。

### 対応 PACT

`unit4-unit2-liff.pact.json`

### メソッド一覧

| メソッド | 入力 | 出力 | 説明 | PACT 対応 |
|---------|------|------|------|-----------|
| verifyLiffToken | accessToken (string) | LiffVerifyResult | LIFF アクセストークンを検証し、LINE ユーザー情報を取得する。顧客操作時の認証に使用 | POST /api/line/liff/verify |

### 戻り値の概要

**LiffVerifyResult:**
- lineUserId: LINE ユーザーID（`U` + 32桁hex）
- displayName: LINE 表示名

### エラーケース

| HTTP ステータス | エラーコード | 説明 |
|---------------|------------|------|
| 401 | INVALID_LIFF_TOKEN | LIFF アクセストークンが無効 |

---

## 6. EventPublisher（イベント発行）

ドメインイベントを外部に発行するためのインターフェース。Unit 5（LINE 通知）および Unit 7（Google カレンダー連携）が Consumer となる。

### 対応 PACT

- `unit5-unit4-reservation-events.pact.json`
- `unit7-unit4-reservation-events.pact.json`

### メソッド一覧

| メソッド | 入力 | 出力 | 説明 |
|---------|------|------|------|
| publish | DomainEvent | void | ドメインイベントを発行する。at-least-once 配信保証 |

### 発行するイベント

| イベント型 | eventType | 発行タイミング |
|-----------|-----------|--------------|
| ReservationCreated | `reservation.created` | 予約作成後 |
| ReservationModified | `reservation.modified` | 予約変更後 |
| ReservationCancelled | `reservation.cancelled` | 予約キャンセル後 |

### 設計備考

- 具体的なメッセージブローカー（Amazon SNS/SQS、Google Pub/Sub 等）の選定は Elaboration フェーズで決定する
- EventPublisher インターフェースを通じて抽象化することで、配信基盤の変更がドメインモデルに影響しない
- at-least-once 配信のため、Consumer 側で冪等性を担保する必要がある

---

## インターフェース一覧（サマリ）

| # | インターフェース名 | 種別 | 対象ユニット | 説明 |
|---|-------------------|------|-------------|------|
| 1 | ReservationRepository | リポジトリ | Unit 4（内部） | Reservation 集約の永続化・取得 |
| 2 | SlotGateway | Gateway | Unit 3 | スロット照会・確保・解放 |
| 3 | CustomerGateway | Gateway | Unit 6 | 顧客情報取得・検索・作成 |
| 4 | AuthGateway | Gateway | Unit 1 | オーナー認証トークン検証 |
| 5 | LiffGateway | Gateway | Unit 2 | LIFF トークン検証 |
| 6 | EventPublisher | イベント発行 | Unit 5, Unit 7 | ドメインイベントの発行 |
