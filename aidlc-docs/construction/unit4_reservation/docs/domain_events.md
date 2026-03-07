# Unit 4 予約管理 - ドメインイベント定義

## 概要

Unit 4（予約管理）が発行するドメインイベントを定義する。
これらのイベントは Unit 5（LINE 通知）および Unit 7（Google カレンダー連携）が Consumer として購読する。

### 設計方針

- **ペイロード**: Unit 5 と Unit 7 が必要とするフィールドの和集合（スーパーセット）として1イベントを定義する（Q27 確定）。Unit 4 は Consumer の存在を知るべきではなく、Consumer 追加時にイベント定義の変更が不要な設計とする
- **配信保証**: at-least-once（Q28 確定）。Consumer 側で冪等性を担保する
- **発行タイミング**: 集約の状態変更が永続化された後に発行する
- **配信基盤**: EventPublisher インターフェース経由で発行。具体的なメッセージブローカーの選定は Elaboration フェーズで決定する

---

## 1. ReservationCreated（予約作成イベント）

予約が新規作成されたことを通知するイベント。

### 発行トリガー

- Reservation 集約の create 操作が成功し、永続化が完了した後

### ペイロード

| フィールド | 型 | 必須 | 説明 | Unit 5 | Unit 7 |
|-----------|-----|------|------|:------:|:------:|
| eventType | string | Yes | 固定値 `reservation.created` | 必要 | 必要 |
| reservationId | string (UUID) | Yes | 予約ID | 必要 | 必要 |
| ownerId | string | Yes | オーナーID | 必要 | 必要 |
| customerId | string | Yes | 顧客ID | 必要 | - |
| customerName | string | Yes | 顧客名（スナップショット） | 必要 | 必要 |
| lineUserId | string | No | 顧客の LINE ユーザーID（null 許容） | 必要 | - |
| ownerLineUserId | string | No | オーナーの LINE ユーザーID（null 許容） | 必要 | - |
| slotId | string | Yes | スロットID | 必要 | 必要 |
| dateTime | string (ISO 8601) | Yes | 予約日時（JST） | 必要 | 必要 |
| durationMinutes | integer | Yes | 施術時間（分） | - | 必要 |
| timestamp | string (ISO 8601) | Yes | イベント発行日時（UTC） | 必要 | 必要 |

### ペイロード例

```json
{
  "eventType": "reservation.created",
  "reservationId": "550e8400-e29b-41d4-a716-446655440000",
  "ownerId": "owner-001",
  "customerId": "cust-001",
  "customerName": "田中太郎",
  "lineUserId": "U1234567890abcdef1234567890abcdef",
  "ownerLineUserId": "Uabcdef1234567890abcdef1234567890",
  "slotId": "slot-001",
  "dateTime": "2024-01-15T10:00:00+09:00",
  "durationMinutes": 60,
  "timestamp": "2024-01-10T15:30:00Z"
}
```

### PACT 整合性

| Consumer | PACT ファイル | 検証状況 |
|----------|-------------|---------|
| Unit 5 (LINE 通知) | unit5-unit4-reservation-events.pact.json | ペイロードにUnit 5 が必要とする全フィールド（customerId, lineUserId, ownerLineUserId）を含む |
| Unit 7 (Google カレンダー) | unit7-unit4-reservation-events.pact.json | ペイロードに Unit 7 が必要とする全フィールド（durationMinutes）を含む |

---

## 2. ReservationModified（予約変更イベント）

予約の日時が変更されたことを通知するイベント。

### 発行トリガー

- Reservation 集約の modify 操作が成功し、永続化が完了した後

### ペイロード

| フィールド | 型 | 必須 | 説明 | Unit 5 | Unit 7 |
|-----------|-----|------|------|:------:|:------:|
| eventType | string | Yes | 固定値 `reservation.modified` | 必要 | 必要 |
| reservationId | string (UUID) | Yes | 予約ID | 必要 | 必要 |
| ownerId | string | Yes | オーナーID | 必要 | 必要 |
| customerId | string | Yes | 顧客ID | 必要 | - |
| customerName | string | Yes | 顧客名（スナップショット） | 必要 | 必要 |
| lineUserId | string | No | 顧客の LINE ユーザーID（null 許容） | 必要 | - |
| ownerLineUserId | string | No | オーナーの LINE ユーザーID（null 許容） | 必要 | - |
| slotId | string | Yes | 変更後のスロットID | 必要 | 必要 |
| dateTime | string (ISO 8601) | Yes | 変更後の予約日時（JST） | 必要 | 必要 |
| previousDateTime | string (ISO 8601) | Yes | 変更前の予約日時（JST） | 必要 | 必要 |
| durationMinutes | integer | Yes | 施術時間（分） | - | 必要 |
| modifiedBy | string | Yes | 変更操作者（`customer` / `owner`） | 必要 | - |
| timestamp | string (ISO 8601) | Yes | イベント発行日時（UTC） | 必要 | 必要 |

### ペイロード例

```json
{
  "eventType": "reservation.modified",
  "reservationId": "550e8400-e29b-41d4-a716-446655440000",
  "ownerId": "owner-001",
  "customerId": "cust-001",
  "customerName": "田中太郎",
  "lineUserId": "U1234567890abcdef1234567890abcdef",
  "ownerLineUserId": "Uabcdef1234567890abcdef1234567890",
  "slotId": "slot-002",
  "dateTime": "2024-01-16T14:00:00+09:00",
  "previousDateTime": "2024-01-15T10:00:00+09:00",
  "durationMinutes": 60,
  "modifiedBy": "customer",
  "timestamp": "2024-01-12T09:00:00Z"
}
```

### PACT 整合性

| Consumer | PACT ファイル | 検証状況 |
|----------|-------------|---------|
| Unit 5 (LINE 通知) | unit5-unit4-reservation-events.pact.json | ペイロードに Unit 5 が必要とする全フィールド（customerId, lineUserId, ownerLineUserId, modifiedBy）を含む |
| Unit 7 (Google カレンダー) | unit7-unit4-reservation-events.pact.json | ペイロードに Unit 7 が必要とする全フィールド（previousDateTime, durationMinutes）を含む |

---

## 3. ReservationCancelled（予約キャンセルイベント）

予約がキャンセルされたことを通知するイベント。

### 発行トリガー

- Reservation 集約の cancel 操作が成功し、永続化が完了した後

### ペイロード

| フィールド | 型 | 必須 | 説明 | Unit 5 | Unit 7 |
|-----------|-----|------|------|:------:|:------:|
| eventType | string | Yes | 固定値 `reservation.cancelled` | 必要 | 必要 |
| reservationId | string (UUID) | Yes | 予約ID | 必要 | 必要 |
| ownerId | string | Yes | オーナーID | 必要 | 必要 |
| customerId | string | Yes | 顧客ID | 必要 | - |
| customerName | string | Yes | 顧客名（スナップショット） | 必要 | 必要 |
| lineUserId | string | No | 顧客の LINE ユーザーID（null 許容） | 必要 | - |
| ownerLineUserId | string | No | オーナーの LINE ユーザーID（null 許容） | 必要 | - |
| slotId | string | Yes | スロットID | 必要 | 必要 |
| dateTime | string (ISO 8601) | Yes | 予約日時（JST） | 必要 | 必要 |
| cancelledBy | string | Yes | キャンセル操作者（`customer` / `owner`） | 必要 | - |
| timestamp | string (ISO 8601) | Yes | イベント発行日時（UTC） | 必要 | 必要 |

### ペイロード例

```json
{
  "eventType": "reservation.cancelled",
  "reservationId": "550e8400-e29b-41d4-a716-446655440000",
  "ownerId": "owner-001",
  "customerId": "cust-001",
  "customerName": "田中太郎",
  "lineUserId": "U1234567890abcdef1234567890abcdef",
  "ownerLineUserId": "Uabcdef1234567890abcdef1234567890",
  "slotId": "slot-001",
  "dateTime": "2024-01-15T10:00:00+09:00",
  "cancelledBy": "customer",
  "timestamp": "2024-01-13T11:00:00Z"
}
```

### PACT 整合性

| Consumer | PACT ファイル | 検証状況 |
|----------|-------------|---------|
| Unit 5 (LINE 通知) | unit5-unit4-reservation-events.pact.json | ペイロードに Unit 5 が必要とする全フィールド（customerId, lineUserId, ownerLineUserId, cancelledBy）を含む |
| Unit 7 (Google カレンダー) | unit7-unit4-reservation-events.pact.json | ペイロードに Unit 7 が必要とする全フィールドを含む |

---

## イベント発行の保証と冪等性

### 配信保証レベル

at-least-once 保証を採用する（Q28 確定）。

| 項目 | 方針 |
|------|------|
| 配信保証 | at-least-once（最低1回配信） |
| 重複配信 | 発生し得る。Consumer 側で冪等性を担保 |
| 順序保証 | 同一予約のイベントは発行順に処理されることが望ましいが、厳密な順序保証は配信基盤の選定で決定 |
| 冪等性キー | reservationId + eventType + timestamp の組み合わせで Consumer が重複判定可能 |

### 根拠

- 通知（Unit 5）やカレンダー同期（Unit 7）は再送の実害が少ない
- exactly-once は実装コストが高く、このユースケースでは不要
- Consumer 側での冪等処理の方がシンプルかつ信頼性が高い

---

## イベント一覧（サマリ）

| # | イベント名 | eventType | 発行タイミング | Consumer |
|---|-----------|-----------|--------------|----------|
| 1 | ReservationCreated | `reservation.created` | 予約作成後 | Unit 5, Unit 7 |
| 2 | ReservationModified | `reservation.modified` | 予約変更後 | Unit 5, Unit 7 |
| 3 | ReservationCancelled | `reservation.cancelled` | 予約キャンセル後 | Unit 5, Unit 7 |

備考: 予約完了（completed）イベントは現時点では Consumer が存在しないため定義しない。将来必要になった場合に追加する。
