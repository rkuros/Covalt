# Unit 3: エンティティ一覧

## 設計判断の根拠

- オーナー単位で管理し、店舗エンティティは不要（Q1）
- スロットの status は available / booked の 2 値（Q2）
- スロットに reservationId を保持する（Q3）

---

## 1. BusinessHour（営業時間）

オーナーの曜日ごとの営業時間を表すエンティティ。空きスロットの自動生成の基準となる。

### 識別子

| フィールド | 型 | 説明 |
|-----------|------|------|
| businessHourId | BusinessHourId | 営業時間設定の一意識別子 |

### 属性

| フィールド | 型 | 説明 | 制約 |
|-----------|------|------|------|
| ownerId | OwnerId | オーナーの識別子 | 必須 |
| dayOfWeek | DayOfWeek | 曜日 | 必須。月〜日の 7 値 |
| startTime | TimeOfDay | 営業開始時刻 | 必須。HH:mm 形式 |
| endTime | TimeOfDay | 営業終了時刻 | 必須。HH:mm 形式。startTime より後 |
| isBusinessDay | boolean | 営業日かどうか | 必須。false の場合は定休日 |

### 不変条件

- 同一オーナー・同一曜日に対して複数の BusinessHour は存在しない（1 オーナーにつき最大 7 レコード）
- isBusinessDay が true の場合、startTime < endTime であること
- isBusinessDay が false の場合、startTime / endTime は無視される（または null を許容）

### 責務

- 曜日ごとの営業時間帯を保持する
- 定休日かどうかを示す
- スロット自動生成サービスに営業時間情報を提供する

---

## 2. ClosedDay（休業日）

特定の日付を臨時休業日として設定するエンティティ。営業時間の定休日とは別に、祝日や臨時休業を管理する。

### 識別子

| フィールド | 型 | 説明 |
|-----------|------|------|
| closedDayId | ClosedDayId | 休業日設定の一意識別子 |

### 属性

| フィールド | 型 | 説明 | 制約 |
|-----------|------|------|------|
| ownerId | OwnerId | オーナーの識別子 | 必須 |
| date | SlotDate | 休業日の日付 | 必須。YYYY-MM-DD 形式 |
| reason | string | 休業理由（任意） | 任意。最大 200 文字 |

### 不変条件

- 同一オーナー・同一日付に対して複数の ClosedDay は存在しない
- 休業日を設定しても、既存の予約済みスロットは維持される（Q11: 新規予約のみブロック）

### 責務

- 特定日付の臨時休業を表現する
- スロット照会時に休業日を判定する情報を提供する
- 休業日であっても既存の予約済みスロットへの影響は与えない

---

## 3. Slot（空きスロット）

予約可能な時間枠を表すエンティティ。DailySlotList 集約の構成要素。

### 識別子

| フィールド | 型 | 説明 |
|-----------|------|------|
| slotId | SlotId | スロットの一意識別子 |

### 属性

| フィールド | 型 | 説明 | 制約 |
|-----------|------|------|------|
| startTime | TimeOfDay | スロット開始時刻 | 必須。HH:mm 形式 |
| endTime | TimeOfDay | スロット終了時刻 | 必須。HH:mm 形式。startTime より後 |
| durationMinutes | Duration | 所要時間（分） | 必須。15〜1440 分 |
| status | SlotStatus | スロットの状態 | 必須。available または booked |
| reservationId | ReservationId | 紐づく予約の識別子 | status が booked のとき必須、available のとき null |

### 不変条件

- startTime < endTime であること
- durationMinutes は endTime - startTime と一致すること
- status が available のとき、reservationId は null であること
- status が booked のとき、reservationId は非 null であること
- 同一 DailySlotList 内の他の Slot と時間帯が重複しないこと（Q10）

### 責務

- 予約可能な時間枠を表現する
- 予約確保（reserve）操作により available から booked へ状態遷移する
- 予約解放（release）操作により booked から available へ状態遷移する
- release 時に reservationId を照合し、正しい予約のみ解放を許可する

### 状態遷移

```
available ---[reserve(reservationId)]--> booked
booked   ---[release(reservationId)]--> available
```

- reserve: status が available の場合のみ成功。booked の場合は SLOT_ALREADY_BOOKED エラー
- release: 指定された reservationId が保持している reservationId と一致する場合のみ成功
