# Unit 3: PACT 契約との整合性検証

## 対象 PACT

- ファイル: `aidlc-docs/inception/units/pacts/unit4-unit3-slots.pact.json`
- Consumer: Unit4_Reservation
- Provider: Unit3_ScheduleSlot
- PACT Specification: 3.0.0

---

## インタラクション 1: 指定日の空きスロット一覧を取得する

### PACT 定義

- **メソッド**: GET
- **パス**: /api/slots/available
- **クエリ**: ownerId, date
- **レスポンス**: 200

### ドメインモデルとのマッピング

#### リクエスト

| PACT フィールド | ドメインモデル | 型 | 備考 |
|----------------|--------------|------|------|
| query.ownerId | OwnerId (値オブジェクト) | string | オーナーの識別子 |
| query.date | SlotDate (値オブジェクト) | string (YYYY-MM-DD) | PACT regex: `^\d{4}-\d{2}-\d{2}$` |

#### レスポンス（通常）

| PACT フィールド | ドメインモデル | 型 | 備考 |
|----------------|--------------|------|------|
| body.date | SlotDate.value | string | 照会対象日付 |
| body.slots | DailySlotList.slots (available のみ) | array | SlotAvailabilityService が available をフィルタ |
| body.slots[].slotId | Slot.slotId (SlotId.value) | string | PACT matcher: type |
| body.slots[].startTime | Slot.startTime (TimeOfDay) | string (HH:mm) | PACT regex: `^\d{2}:\d{2}$` |
| body.slots[].endTime | Slot.endTime (TimeOfDay) | string (HH:mm) | PACT regex: `^\d{2}:\d{2}$` |
| body.slots[].durationMinutes | Slot.durationMinutes (Duration.minutes) | integer | PACT matcher: integer |
| body.slots[].status | Slot.status (SlotStatus) | string | PACT regex: `^(available\|booked)$`。照会結果は常に "available" |

#### レスポンス（休業日）

| PACT フィールド | ドメインモデル | 型 | 備考 |
|----------------|--------------|------|------|
| body.date | SlotDate.value | string | 照会対象日付 |
| body.isHoliday | ClosedDay の存在判定 | boolean | true = 休業日 |
| body.slots | (空配列) | array | 休業日はスロットなし |

### 処理担当

- **ドメインサービス**: SlotAvailabilityService
- **集約参照**: ClosedDay（休業日判定）、BusinessHour（定休日判定）、DailySlotList（スロット一覧）

### 整合性確認

- [x] ownerId -> OwnerId 値オブジェクトで受け取り可能
- [x] date -> SlotDate 値オブジェクトで受け取り可能（YYYY-MM-DD フォーマット一致）
- [x] レスポンスの slots 配列 -> DailySlotList.slots から available をフィルタして生成可能
- [x] isHoliday フラグ -> ClosedDay の存在有無で判定可能
- [x] slots が空配列 (min: 0) -> DailySlotList が存在しない場合やスロットがない場合に対応

---

## インタラクション 2: スロットを予約確保する（成功）

### PACT 定義

- **メソッド**: PUT
- **パス**: /api/slots/{slotId}/reserve
- **リクエストボディ**: reservationId
- **レスポンス**: 200

### ドメインモデルとのマッピング

#### リクエスト

| PACT フィールド | ドメインモデル | 型 | 備考 |
|----------------|--------------|------|------|
| path.slotId | SlotId (値オブジェクト) | string | パスパラメータ |
| body.reservationId | ReservationId (値オブジェクト) | string | Unit 4 から受け取る予約 ID |

#### レスポンス

| PACT フィールド | ドメインモデル | 型 | 備考 |
|----------------|--------------|------|------|
| body.slotId | Slot.slotId (SlotId.value) | string | 確保されたスロット |
| body.status | Slot.status (SlotStatus) | string | "booked" |
| body.reservationId | Slot.reservationId (ReservationId.value) | string | 紐づけられた予約 ID |

### 処理担当

- **ドメインサービス**: SlotReservationService.reserve
- **集約操作**: DailySlotList.reserveSlot -> Slot.reserve

### 整合性確認

- [x] slotId -> SlotId 値オブジェクトでパスから取得可能
- [x] reservationId -> ReservationId 値オブジェクトでボディから取得可能
- [x] レスポンスの status "booked" -> SlotStatus.BOOKED のシリアライズに一致
- [x] レスポンスの reservationId -> Slot エンティティが reservationId を保持する設計（Q3）に一致

---

## インタラクション 3: 既に予約済みのスロットを確保しようとすると競合エラー

### PACT 定義

- **メソッド**: PUT
- **パス**: /api/slots/{slotId}/reserve
- **リクエストボディ**: reservationId
- **レスポンス**: 409

### ドメインモデルとのマッピング

#### リクエスト

（インタラクション 2 と同一）

#### レスポンス

| PACT フィールド | ドメインモデル | 型 | 備考 |
|----------------|--------------|------|------|
| body.error | (ドメインエラーコード) | string | "SLOT_ALREADY_BOOKED" |
| body.message | (エラーメッセージ) | string | "指定されたスロットは既に予約済みです" |

### 処理担当

- **ドメインサービス**: SlotReservationService.reserve
- **エラー発生条件**: Slot.status が BOOKED の状態で reserve が呼ばれた場合

### 整合性確認

- [x] 409 ステータス -> Slot の状態遷移ルール（available のみ reserve 可能）に一致
- [x] SLOT_ALREADY_BOOKED -> Slot エンティティの不変条件（booked -> booked 遷移不可）に一致
- [x] 楽観的ロック例外とは区別される（楽観的ロック例外は version 不一致であり、別のエラーとして扱う）

---

## インタラクション 4: スロットを解放する（キャンセル時）

### PACT 定義

- **メソッド**: PUT
- **パス**: /api/slots/{slotId}/release
- **リクエストボディ**: reservationId
- **レスポンス**: 200

### ドメインモデルとのマッピング

#### リクエスト

| PACT フィールド | ドメインモデル | 型 | 備考 |
|----------------|--------------|------|------|
| path.slotId | SlotId (値オブジェクト) | string | パスパラメータ |
| body.reservationId | ReservationId (値オブジェクト) | string | 照合用の予約 ID |

#### レスポンス

| PACT フィールド | ドメインモデル | 型 | 備考 |
|----------------|--------------|------|------|
| body.slotId | Slot.slotId (SlotId.value) | string | 解放されたスロット |
| body.status | Slot.status (SlotStatus) | string | "available" |

### 処理担当

- **ドメインサービス**: SlotReservationService.release
- **集約操作**: DailySlotList.releaseSlot -> Slot.release

### 整合性確認

- [x] slotId -> SlotId 値オブジェクトでパスから取得可能
- [x] reservationId -> ReservationId 値オブジェクトでボディから取得（照合用に使用）
- [x] レスポンスの status "available" -> SlotStatus.AVAILABLE のシリアライズに一致
- [x] release 時の reservationId 照合 -> Slot エンティティが保持する reservationId との一致検証（Q3）に対応
- [x] レスポンスに reservationId が含まれない -> release 後は reservationId が null になるため

---

## PACT 未定義だがドメインモデルに存在する操作

以下はオーナー向け管理画面（Web）からの操作であり、Unit 4 との PACT 契約には含まれない。

| 操作 | ドメインモデル | 備考 |
|------|--------------|------|
| 営業時間の設定 | BusinessHour 集約 | US-O06 対応。オーナー管理画面 API |
| 休業日の設定・解除 | ClosedDay 集約 | US-O07 対応。オーナー管理画面 API |
| スロットの手動作成・編集・削除 | DailySlotList 集約 | US-O08 対応。オーナー管理画面 API |
| スロットの自動生成 | SlotGenerationService | ハイブリッド生成（Q9）の自動生成部分 |

これらの API 契約は Unit 3 の内部 API（オーナー管理画面向け）として別途定義が必要。
