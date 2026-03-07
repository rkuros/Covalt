# Unit 3: ドメインサービス設計

## 設計判断の根拠

- ハイブリッドスロット生成: 自動生成 + 手動編集 + バッファ調整（Q9）
- スロット重複不可（Q10）
- 休業日: 既存予約維持、新規のみブロック（Q11）

---

## 1. SlotGenerationService（スロット生成サービス）

### 責務

営業時間と所要時間を基にスロットを自動生成するビジネスロジックを提供する。複数の集約（BusinessHour、DailySlotList）を横断する処理のため、ドメインサービスとして定義する。

### 入力

| パラメータ | 型 | 説明 |
|-----------|------|------|
| ownerId | OwnerId | 対象オーナー |
| date | SlotDate | 生成対象日付 |
| durationMinutes | Duration | 1 スロットの所要時間 |

### 処理フロー

1. 対象日付の曜日を算出し、BusinessHour を取得する
2. BusinessHour が定休日（isBusinessDay = false）の場合、スロットを生成しない
3. 対象日付の ClosedDay を確認し、休業日の場合、スロットを生成しない
4. 営業時間帯（startTime〜endTime）を所要時間で分割し、スロット候補を生成する
5. 既存の DailySlotList を取得し、既存スロット（特に予約済みスロット）との重複を確認する
6. 重複しないスロットのみを DailySlotList に追加する

### ビジネスルール

- スロットは営業時間の開始時刻から終了時刻までの範囲で、所要時間の単位で連続的に生成する
  - 例: 営業時間 10:00〜18:00、所要時間 60 分の場合 -> 10:00-11:00, 11:00-12:00, ..., 17:00-18:00
- 営業時間帯に収まらない端数時間にはスロットを生成しない
  - 例: 営業時間 10:00〜17:30、所要時間 60 分の場合 -> 17:00-17:30 の 30 分枠は生成しない
- 既存の予約済みスロットは保持し、それと重複しない位置にのみ新規スロットを生成する
- バッファ設定がある場合、予約済みスロットの前後にバッファ時間を確保し、その範囲にはスロットを生成しない

### 結果

- DailySlotList 集約に対してスロットが追加される（集約ルート経由）

---

## 2. SlotAvailabilityService（スロット可用性チェックサービス）

### 責務

スロットの照会時に、休業日や営業時間との整合性を検証するビジネスロジックを提供する。複数の集約（ClosedDay、BusinessHour、DailySlotList）を参照する読み取り処理のため、ドメインサービスとして定義する。

### 入力

| パラメータ | 型 | 説明 |
|-----------|------|------|
| ownerId | OwnerId | 対象オーナー |
| date | SlotDate | 照会対象日付 |

### 処理フロー

1. 対象日付の ClosedDay を確認する
2. 休業日の場合、isHoliday: true と空のスロット配列を返す（PACT 対応）
3. 休業日でない場合、対象日付の曜日に対応する BusinessHour を取得する
4. 定休日（isBusinessDay = false）の場合、空のスロット配列を返す
5. DailySlotList から対象日付のスロット一覧を取得する
6. available 状態のスロットのみをフィルタして返す

### ビジネスルール

- 休業日のスロット照会は isHoliday フラグとともに空配列を返す
- 定休日のスロット照会は空配列を返す
- 予約済み（booked）のスロットは空き状況照会の結果には含めない（Unit 4 が照会する「available」スロットのみ）

### 結果

| フィールド | 型 | 説明 |
|-----------|------|------|
| date | SlotDate | 照会対象日付 |
| isHoliday | boolean | 休業日かどうか |
| availableSlots | List<Slot> | available 状態のスロット一覧 |

---

## 3. SlotReservationService（スロット予約確保・解放サービス）

### 責務

スロットの予約確保（reserve）と解放（release）のビジネスロジックを提供する。DailySlotList 集約の操作を調整し、排他制御を含む整合性を保証する。

### 操作

#### reserve（予約確保）

| パラメータ | 型 | 説明 |
|-----------|------|------|
| slotId | SlotId | 対象スロット |
| reservationId | ReservationId | 紐づける予約の識別子 |

**処理フロー:**

1. slotId から対象の DailySlotList を特定する
2. DailySlotList 集約ルート経由で対象 Slot にアクセスする
3. Slot の status が available であることを検証する
4. available でない場合、SLOT_ALREADY_BOOKED エラーを返す（PACT: 409）
5. Slot の status を booked に変更し、reservationId を設定する
6. DailySlotList の version をインクリメントする
7. DailySlotList を保存する（楽観的ロック検証を含む）

**ビジネスルール:**

- 同一スロットへの同時予約確保は楽観的ロックにより検出される
- PACT 契約に準拠し、成功時は slotId, status("booked"), reservationId を返す

#### release（予約解放）

| パラメータ | 型 | 説明 |
|-----------|------|------|
| slotId | SlotId | 対象スロット |
| reservationId | ReservationId | 解放する予約の識別子（照合用） |

**処理フロー:**

1. slotId から対象の DailySlotList を特定する
2. DailySlotList 集約ルート経由で対象 Slot にアクセスする
3. Slot の status が booked であることを検証する
4. Slot の reservationId が指定された reservationId と一致することを検証する
5. 一致しない場合、不正な解放リクエストとしてエラーを返す
6. Slot の status を available に変更し、reservationId を null にする
7. DailySlotList の version をインクリメントする
8. DailySlotList を保存する（楽観的ロック検証を含む）

**ビジネスルール:**

- 解放は reservationId の照合に成功した場合のみ許可される（意図しない解放を防止）
- PACT 契約に準拠し、成功時は slotId, status("available") を返す

---

## ドメインサービスの位置づけ

```
SlotGenerationService
  参照: BusinessHour 集約（読み取り）、ClosedDay 集約（読み取り）
  操作: DailySlotList 集約（スロット追加）

SlotAvailabilityService
  参照: BusinessHour 集約（読み取り）、ClosedDay 集約（読み取り）、DailySlotList 集約（読み取り）
  操作: なし（読み取り専用）

SlotReservationService
  参照: なし
  操作: DailySlotList 集約（スロット状態変更）
```

- いずれのドメインサービスもステートレスである
- 集約へのアクセスはリポジトリインターフェース経由で行う
- トランザクション管理はアプリケーション層の責務とする
