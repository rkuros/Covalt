# Unit 3: 集約設計

## 設計判断の根拠

- 営業時間と休業日は別々の集約（Q6）
- DailySlotList（日付単位）を集約ルート（Q7）
- 楽観的ロック（version フィールド）による排他制御（Q8）
- スロット重複不可（Q10）

---

## 集約一覧

| 集約ルート | 構成要素 | トランザクション境界 |
|-----------|---------|-------------------|
| BusinessHour | BusinessHour（単体） | 営業時間の設定変更 |
| ClosedDay | ClosedDay（単体） | 休業日の設定・解除 |
| DailySlotList | DailySlotList + Slot（複数） | 日次スロットの生成・予約確保・解放 |

---

## 1. BusinessHour 集約

### 集約ルート

BusinessHour

### 構成要素

- BusinessHour エンティティ（単体）

### 境界の根拠

営業時間の設定変更は曜日単位の独立した操作であり、他のエンティティとのトランザクション整合性は不要。スロット生成時には読み取り専用で参照される。

### 操作

| 操作 | 説明 | 事前条件 |
|------|------|---------|
| setBusinessHour | 曜日の営業時間を設定・更新する | isBusinessDay が true の場合、startTime < endTime |
| setAsClosedDay | 曜日を定休日として設定する | なし |
| setAsBusinessDay | 定休日を営業日に戻す | startTime, endTime が有効であること |

### 不変条件

- 同一オーナー・同一曜日に対して最大 1 つの BusinessHour が存在する
- isBusinessDay が true の場合、startTime < endTime

### リポジトリインターフェース

- findByOwnerIdAndDayOfWeek(ownerId, dayOfWeek): BusinessHour?
- findAllByOwnerId(ownerId): List<BusinessHour>
- save(businessHour): void

---

## 2. ClosedDay 集約

### 集約ルート

ClosedDay

### 構成要素

- ClosedDay エンティティ（単体）

### 境界の根拠

休業日の設定・解除は営業時間の変更やスロット操作とは独立した操作。スロット照会時に読み取り専用で参照される。既存予約への影響はない（Q11: 既存予約維持、新規のみブロック）。

### 操作

| 操作 | 説明 | 事前条件 |
|------|------|---------|
| create | 特定日付を休業日として設定する | 同一オーナー・同一日付に ClosedDay が存在しないこと |
| remove | 休業日設定を解除する | なし |

### 不変条件

- 同一オーナー・同一日付に対して最大 1 つの ClosedDay が存在する

### 休業日と既存予約の関係

- 休業日に設定された日に既存の予約済みスロットがある場合、既存予約は維持される
- 休業日の照会（PACT: isHoliday: true）では空のスロット配列を返すが、これは「新規予約不可」の意味であり、既存予約のキャンセルではない
- 既存予約の対応はオーナーの手動オペレーションに委ねる

### リポジトリインターフェース

- findByOwnerIdAndDate(ownerId, date): ClosedDay?
- findAllByOwnerIdAndDateRange(ownerId, startDate, endDate): List<ClosedDay>
- save(closedDay): void
- delete(closedDay): void

---

## 3. DailySlotList 集約

### 集約ルート

DailySlotList

### 構成要素

- DailySlotList（集約ルート）
- Slot エンティティ（0..N 個）

### 集約ルート属性

| フィールド | 型 | 説明 | 制約 |
|-----------|------|------|------|
| ownerId | OwnerId | オーナーの識別子 | 必須 |
| date | SlotDate | 対象日付 | 必須 |
| version | Version | 楽観的ロック用バージョン | 必須。初期値 0 |
| slots | List<Slot> | 当日のスロット一覧 | 0 個以上 |

### 境界の根拠

- PACT では日付単位で空きスロットを照会する（GET /api/slots/available?date=YYYY-MM-DD）
- 日付単位でスロットの重複チェックを行う必要がある（Q10）
- 楽観的ロックにより、同一日のスロットへの同時更新を検出できる（Q8）
- 予約確保・解放は個別スロットに対して行うが、集約ルート経由でアクセスすることで重複チェック等の不変条件を保証する

### 操作

| 操作 | 説明 | 事前条件 |
|------|------|---------|
| addSlot | スロットを追加する | 既存スロットと時間帯が重複しないこと |
| removeSlot | スロットを削除する | 対象スロットの status が available であること |
| editSlot | スロットの時間帯を変更する | 対象スロットの status が available であること。変更後の時間帯が他スロットと重複しないこと |
| reserveSlot | スロットを予約確保する | 対象スロットの status が available であること |
| releaseSlot | スロットを予約解放する | 対象スロットの status が booked であること。reservationId が一致すること |
| generateSlots | 営業時間と所要時間からスロットを一括生成する | 既存スロット（予約済み含む）と重複しないこと |

### 不変条件

- 同一 DailySlotList 内のスロットは時間帯が重複しないこと
- 同一オーナー・同一日付に対して最大 1 つの DailySlotList が存在する
- version は更新ごとにインクリメントされる

### 楽観的ロック

- DailySlotList の更新時に version を検証する
- version が一致しない場合（他のトランザクションで先に更新された場合）、楽観的ロック例外を発生させる
- PACT の `409 SLOT_ALREADY_BOOKED` は、スロットの status が既に booked である場合のドメインエラーとして扱う（楽観的ロック例外とは区別する）

### リポジトリインターフェース

- findByOwnerIdAndDate(ownerId, date): DailySlotList?
- findSlotById(slotId): Slot?（集約ルート経由でアクセスするためのヘルパー）
- save(dailySlotList): void（楽観的ロック検証を含む）

---

## 集約間の関係

```
BusinessHour 集約 ---[読み取り参照]---> SlotGenerationService
ClosedDay 集約   ---[読み取り参照]---> SlotAvailabilityService
DailySlotList 集約 <---[生成・操作]--- SlotGenerationService
```

- BusinessHour と ClosedDay はドメインサービス経由で DailySlotList の生成・照会に影響を与える
- 集約間のトランザクション整合性は結果整合性（ドメインサービスが調整する）
- 直接的な集約間参照は行わない（ID 参照のみ）
