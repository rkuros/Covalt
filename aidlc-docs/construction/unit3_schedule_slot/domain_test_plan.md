# Unit 3（スケジュール・空き枠管理）ドメインモデル テスト計画

## 未決事項

[Question] 使用するプログラミング言語とテストフレームワークは何ですか？（例: TypeScript + Jest、Kotlin + JUnit 5、Go + testing など）
[Answer]

[Question] テストのディレクトリ構造はどのようにしますか？（例: `src/domain/__tests__/`、`tests/unit/domain/` など。値オブジェクト・エンティティ・集約・ドメインサービスごとにサブディレクトリを分けるかどうかも含めて）
[Answer]

---

## Step 1: 値オブジェクトのテスト

### 1-1. OwnerId

- [ ] **正常系**: 有効な文字列（例: `"owner-001"`）で生成できること
- [ ] **異常系**: null で生成するとバリデーションエラーになること
- [ ] **異常系**: 空文字 `""` で生成するとバリデーションエラーになること
- [ ] **等価性**: 同一の value を持つ OwnerId 同士は等価であること
- [ ] **等価性**: 異なる value を持つ OwnerId 同士は等価でないこと

### 1-2. SlotId

- [ ] **正常系**: 有効な文字列（例: `"slot-001"`）で生成できること
- [ ] **異常系**: null で生成するとバリデーションエラーになること
- [ ] **異常系**: 空文字 `""` で生成するとバリデーションエラーになること
- [ ] **等価性**: 同一の value を持つ SlotId 同士は等価であること
- [ ] **等価性**: 異なる value を持つ SlotId 同士は等価でないこと

### 1-3. BusinessHourId

- [ ] **正常系**: 有効な文字列で生成できること
- [ ] **異常系**: null で生成するとバリデーションエラーになること
- [ ] **異常系**: 空文字 `""` で生成するとバリデーションエラーになること
- [ ] **等価性**: 同一の value を持つ BusinessHourId 同士は等価であること
- [ ] **等価性**: 異なる value を持つ BusinessHourId 同士は等価でないこと

### 1-4. ClosedDayId

- [ ] **正常系**: 有効な文字列で生成できること
- [ ] **異常系**: null で生成するとバリデーションエラーになること
- [ ] **異常系**: 空文字 `""` で生成するとバリデーションエラーになること
- [ ] **等価性**: 同一の value を持つ ClosedDayId 同士は等価であること
- [ ] **等価性**: 異なる value を持つ ClosedDayId 同士は等価でないこと

### 1-5. ReservationId

- [ ] **正常系**: 有効な UUID v4 文字列（例: `"rsv-001"`）で生成できること
- [ ] **異常系**: null で生成するとバリデーションエラーになること
- [ ] **異常系**: 空文字 `""` で生成するとバリデーションエラーになること
- [ ] **等価性**: 同一の value を持つ ReservationId 同士は等価であること
- [ ] **等価性**: 異なる value を持つ ReservationId 同士は等価でないこと

[Question] ReservationId のフォーマットバリデーション（UUID v4 準拠）を Unit 3 側で厳密に検証すべきですか？それとも空文字・null チェックのみで、フォーマットの正当性は Unit 4 に委ねますか？
[Answer]

### 1-6. SlotDate

- [ ] **正常系**: 有効な日付文字列 `"2024-01-15"` で生成できること
- [ ] **異常系**: null で生成するとバリデーションエラーになること
- [ ] **異常系**: 空文字 `""` で生成するとバリデーションエラーになること
- [ ] **異常系**: YYYY-MM-DD 形式でない文字列（例: `"2024/01/15"`, `"01-15-2024"`）で生成するとバリデーションエラーになること
- [ ] **異常系**: 存在しない日付（例: `"2024-02-30"`, `"2024-13-01"`）で生成するとバリデーションエラーになること
- [ ] **境界値**: うるう年の 2 月 29 日（例: `"2024-02-29"`）で生成できること
- [ ] **境界値**: 平年の 2 月 28 日（例: `"2025-02-28"`）で生成できること
- [ ] **境界値**: 平年の 2 月 29 日（例: `"2025-02-29"`）で生成するとバリデーションエラーになること
- [ ] **等価性**: 同一の value を持つ SlotDate 同士は等価であること
- [ ] **等価性**: 異なる value を持つ SlotDate 同士は等価でないこと

### 1-7. TimeOfDay

- [ ] **正常系**: hour=9, minute=0 で生成できること（09:00 に相当）
- [ ] **正常系**: hour=17, minute=30 で生成できること（17:30 に相当）
- [ ] **境界値**: hour=0, minute=0 で生成できること（00:00 = 1 日の最小時刻）
- [ ] **境界値**: hour=23, minute=59 で生成できること（23:59 = 1 日の最大時刻）
- [ ] **異常系**: hour=-1 で生成するとバリデーションエラーになること
- [ ] **異常系**: hour=24 で生成するとバリデーションエラーになること
- [ ] **異常系**: minute=-1 で生成するとバリデーションエラーになること
- [ ] **異常系**: minute=60 で生成するとバリデーションエラーになること
- [ ] **表示形式**: HH:mm 形式の文字列を返すこと（例: hour=9, minute=0 -> `"09:00"`）
- [ ] **比較（isBefore）**: 09:00 は 17:00 より前であること
- [ ] **比較（isAfter）**: 17:00 は 09:00 より後であること
- [ ] **比較**: hour が同一の場合、minute で比較されること（09:00 < 09:30）
- [ ] **比較**: 同一の TimeOfDay は isBefore=false, isAfter=false であること
- [ ] **等価性**: hour と minute がともに同一であれば等価であること
- [ ] **等価性**: hour または minute が異なれば等価でないこと

### 1-8. TimeRange

- [ ] **正常系**: startTime=09:00, endTime=17:00 で生成できること
- [ ] **異常系**: startTime と endTime が同一（例: 09:00 と 09:00）で生成するとバリデーションエラーになること
- [ ] **異常系**: startTime が endTime より後（例: startTime=17:00, endTime=09:00）で生成するとバリデーションエラーになること
- [ ] **overlaps**: 09:00-12:00 と 11:00-14:00 は重複すること（部分重複）
- [ ] **overlaps**: 09:00-12:00 と 12:00-14:00 は重複しないこと（隣接）
- [ ] **overlaps**: 09:00-14:00 と 10:00-12:00 は重複すること（包含）
- [ ] **overlaps**: 09:00-12:00 と 13:00-15:00 は重複しないこと（離れている）
- [ ] **overlaps**: 09:00-12:00 と 09:00-12:00 は重複すること（完全一致）
- [ ] **contains**: 09:00-17:00 は 12:00 を含むこと
- [ ] **contains**: 09:00-17:00 は 09:00 を含むこと（開始時刻を含む）
- [ ] **contains**: 09:00-17:00 は 08:59 を含まないこと
- [ ] **durationInMinutes**: 09:00-17:00 の場合 480 分を返すこと
- [ ] **durationInMinutes**: 10:00-10:15 の場合 15 分を返すこと
- [ ] **等価性**: startTime と endTime がともに同一であれば等価であること
- [ ] **等価性**: startTime または endTime が異なれば等価でないこと

[Question] TimeRange.contains で endTime は含む（閉区間）ですか、含まない（半開区間: [start, end)）ですか？
[Answer]

### 1-9. DayOfWeek

- [ ] **正常系**: 7 つの曜日値（MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY）それぞれで生成できること
- [ ] **異常系**: 上記以外の値で生成するとバリデーションエラーになること
- [ ] **等価性**: 同一の曜日値は等価であること
- [ ] **等価性**: 異なる曜日値は等価でないこと

### 1-10. SlotStatus

- [ ] **正常系**: AVAILABLE で生成できること
- [ ] **正常系**: BOOKED で生成できること
- [ ] **異常系**: AVAILABLE / BOOKED 以外の値で生成するとバリデーションエラーになること
- [ ] **PACT 対応シリアライズ**: AVAILABLE は `"available"` にシリアライズされること
- [ ] **PACT 対応シリアライズ**: BOOKED は `"booked"` にシリアライズされること
- [ ] **等価性**: 同一の value は等価であること
- [ ] **等価性**: AVAILABLE と BOOKED は等価でないこと

### 1-11. Duration

- [ ] **正常系**: 60 分で生成できること
- [ ] **境界値**: 最小値 15 分で生成できること
- [ ] **境界値**: 最大値 1440 分で生成できること
- [ ] **異常系**: 14 分（最小値未満）で生成するとバリデーションエラーになること
- [ ] **異常系**: 1441 分（最大値超過）で生成するとバリデーションエラーになること
- [ ] **異常系**: 0 分で生成するとバリデーションエラーになること
- [ ] **異常系**: 負の値（例: -30）で生成するとバリデーションエラーになること
- [ ] **等価性**: 同一の minutes 値は等価であること
- [ ] **等価性**: 異なる minutes 値は等価でないこと

[Question] Duration の minutes は整数のみ許容ですか？小数値（例: 30.5 分）が渡された場合のバリデーションルールは明示的にテストすべきですか？（ドキュメントには「整数であること」と記載あり。言語の型システムで自然に制約される場合はテスト不要の可能性あり）
[Answer]

### 1-12. Version

- [ ] **正常系**: 初期値 0 で生成できること
- [ ] **正常系**: 正の整数（例: 5）で生成できること
- [ ] **境界値**: 0（初期値・最小値）で生成できること
- [ ] **異常系**: 負の値（例: -1）で生成するとバリデーションエラーになること
- [ ] **increment**: version=0 の increment で version=1 になること
- [ ] **increment**: version=5 の increment で version=6 になること
- [ ] **increment**: 元の Version オブジェクトは変更されないこと（不変性）
- [ ] **等価性**: 同一の value は等価であること
- [ ] **等価性**: 異なる value は等価でないこと

---

## Step 2: エンティティのテスト

### 2-1. BusinessHour（営業時間）

#### 生成

- [ ] **正常系**: 営業日として有効な属性（ownerId, dayOfWeek, startTime=09:00, endTime=17:00, isBusinessDay=true）で生成できること
- [ ] **正常系**: 定休日として有効な属性（isBusinessDay=false）で生成できること
- [ ] **異常系**: isBusinessDay=true のとき、startTime >= endTime で生成するとエラーになること
- [ ] **異常系**: isBusinessDay=true のとき、startTime = endTime で生成するとエラーになること

#### 不変条件

- [ ] **不変条件**: isBusinessDay=true の場合、startTime < endTime が保証されること
- [ ] **不変条件**: isBusinessDay=false の場合、startTime / endTime は無視される（または null を許容する）こと

[Question] isBusinessDay=false で生成する場合、startTime / endTime は null として渡すべきですか？それともダミー値を設定して無視する仕様ですか？
[Answer]

### 2-2. ClosedDay（休業日）

#### 生成

- [ ] **正常系**: 有効な属性（ownerId, date, reason="臨時休業"）で生成できること
- [ ] **正常系**: reason が省略（null / 未指定）でも生成できること
- [ ] **異常系**: reason が 201 文字以上の場合、バリデーションエラーになること
- [ ] **境界値**: reason がちょうど 200 文字の場合、生成できること

### 2-3. Slot（空きスロット）

#### 生成

- [ ] **正常系**: available 状態のスロット（reservationId=null）を生成できること
- [ ] **正常系**: booked 状態のスロット（reservationId=非null）を生成できること
- [ ] **異常系**: startTime >= endTime で生成するとエラーになること
- [ ] **異常系**: durationMinutes が endTime - startTime と一致しない場合、エラーになること
- [ ] **異常系**: status=available で reservationId が非 null の場合、エラーになること
- [ ] **異常系**: status=booked で reservationId が null の場合、エラーになること

#### 状態遷移: reserve

- [ ] **正常系**: available 状態のスロットに reserve(reservationId) を実行すると、status=booked, reservationId=指定値 になること
- [ ] **異常系**: booked 状態のスロットに reserve を実行すると、SLOT_ALREADY_BOOKED エラーになること（PACT インタラクション 3 対応）

#### 状態遷移: release

- [ ] **正常系**: booked 状態のスロットに正しい reservationId で release を実行すると、status=available, reservationId=null になること
- [ ] **異常系**: booked 状態のスロットに異なる reservationId で release を実行すると、エラーになること
- [ ] **異常系**: available 状態のスロットに release を実行すると、エラーになること

---

## Step 3: 集約のテスト

### 3-1. BusinessHour 集約

#### setBusinessHour

- [ ] **正常系**: 曜日の営業時間を設定できること（isBusinessDay=true, startTime < endTime）
- [ ] **異常系**: isBusinessDay=true で startTime >= endTime の場合、エラーになること

#### setAsClosedDay

- [ ] **正常系**: 営業日を定休日に変更できること（isBusinessDay が false になること）

#### setAsBusinessDay

- [ ] **正常系**: 定休日を営業日に戻せること（有効な startTime, endTime を指定）
- [ ] **異常系**: 無効な startTime, endTime で営業日に戻そうとするとエラーになること

#### 不変条件

- [ ] **不変条件**: 同一オーナー・同一曜日に対して最大 1 つの BusinessHour が存在すること

### 3-2. ClosedDay 集約

#### create

- [ ] **正常系**: 特定日付を休業日として設定できること
- [ ] **異常系**: 同一オーナー・同一日付に既に ClosedDay が存在する場合、エラーになること

#### remove

- [ ] **正常系**: 休業日設定を解除できること

#### 休業日と既存予約の関係

- [ ] **仕様確認**: 休業日に設定しても既存の予約済みスロットには影響を与えないこと（ClosedDay 集約自体は DailySlotList を直接操作しないこと）

### 3-3. DailySlotList 集約

#### 属性

- [ ] **正常系**: ownerId, date, version=0, slots=空リスト で生成できること

#### addSlot

- [ ] **正常系**: 空の DailySlotList にスロットを追加できること
- [ ] **正常系**: 既存スロットと時間帯が重複しないスロットを追加できること
- [ ] **異常系**: 既存スロットと時間帯が重複するスロットを追加するとエラーになること
- [ ] **境界値**: 既存スロット 09:00-10:00 の直後 10:00-11:00 を追加できること（隣接は重複ではない）

#### removeSlot

- [ ] **正常系**: available 状態のスロットを削除できること
- [ ] **異常系**: booked 状態のスロットを削除しようとするとエラーになること
- [ ] **異常系**: 存在しない slotId を指定するとエラーになること

#### editSlot

- [ ] **正常系**: available 状態のスロットの時間帯を変更できること
- [ ] **異常系**: booked 状態のスロットを編集しようとするとエラーになること
- [ ] **異常系**: 変更後の時間帯が他のスロットと重複する場合、エラーになること

#### reserveSlot

- [ ] **正常系**: available 状態のスロットを予約確保できること（status=booked, reservationId=指定値）
- [ ] **正常系**: 予約確保後に version がインクリメントされること
- [ ] **異常系**: booked 状態のスロットを予約確保しようとすると SLOT_ALREADY_BOOKED エラーになること
- [ ] **異常系**: 存在しない slotId を指定するとエラーになること

#### releaseSlot

- [ ] **正常系**: booked 状態のスロットを正しい reservationId で解放できること（status=available, reservationId=null）
- [ ] **正常系**: 解放後に version がインクリメントされること
- [ ] **異常系**: reservationId が一致しない場合、エラーになること
- [ ] **異常系**: available 状態のスロットを解放しようとするとエラーになること

#### generateSlots

- [ ] **正常系**: 営業時間 10:00-18:00、所要時間 60 分で 8 スロットが生成されること（10:00-11:00, 11:00-12:00, ..., 17:00-18:00）
- [ ] **正常系**: 既存の予約済みスロットと重複しない位置にのみスロットが生成されること
- [ ] **境界値**: 営業時間 10:00-17:30、所要時間 60 分の場合、端数（17:00-17:30）にはスロットが生成されないこと（7 スロット: 10:00-11:00 ... 16:00-17:00）
- [ ] **境界値**: 営業時間帯の長さが所要時間ちょうどの場合、1 スロットが生成されること

#### 不変条件

- [ ] **不変条件**: 同一 DailySlotList 内のスロットは時間帯が重複しないこと
- [ ] **不変条件**: version は更新操作ごとにインクリメントされること

#### 楽観的ロック

- [ ] **正常系**: version が一致する場合、更新が成功すること
- [ ] **異常系**: version が一致しない場合、楽観的ロック例外が発生すること

[Question] 楽観的ロックの検証はリポジトリの save 時に行われますが、ドメインモデルの単体テストではリポジトリをモック化して検証する方針でよいですか？それともリポジトリの統合テストとして別途計画しますか？
[Answer]

---

## Step 4: ドメインサービスのテスト

### 4-1. SlotGenerationService（スロット生成サービス）

#### 依存コンポーネント

- BusinessHour リポジトリ（モック）
- ClosedDay リポジトリ（モック）
- DailySlotList リポジトリ（モック）

#### 正常系

- [ ] **正常系**: 営業日の営業時間 10:00-18:00、所要時間 60 分で 8 スロットが生成されること
- [ ] **正常系**: 既存の DailySlotList がない場合、新規に DailySlotList が作成されスロットが追加されること
- [ ] **正常系**: 既存の予約済みスロット（11:00-12:00 が booked）がある場合、それ以外の時間帯にスロットが生成されること（予約済みスロットは保持される）

#### 定休日・休業日

- [ ] **正常系**: 対象曜日が定休日（isBusinessDay=false）の場合、スロットが生成されないこと
- [ ] **正常系**: 対象日付が ClosedDay（休業日）の場合、スロットが生成されないこと

#### 境界値

- [ ] **境界値**: 営業時間帯に収まらない端数時間にはスロットが生成されないこと（例: 10:00-17:30、60 分 -> 17:00-17:30 は生成しない）
- [ ] **境界値**: 所要時間 15 分（最小値）での生成が正常に動作すること
- [ ] **境界値**: 営業時間帯の長さと所要時間が一致する場合、1 スロットのみ生成されること

#### 異常系

- [ ] **異常系**: 対象曜日の BusinessHour が未設定の場合の挙動（エラーまたはスロット生成なし）

[Question] 対象曜日の BusinessHour が未設定（findByOwnerIdAndDayOfWeek が null を返す）場合、エラーとすべきですか？それともスロットを生成しないで正常終了とすべきですか？
[Answer]

### 4-2. SlotAvailabilityService（スロット可用性チェックサービス）

#### 依存コンポーネント

- ClosedDay リポジトリ（モック）
- BusinessHour リポジトリ（モック）
- DailySlotList リポジトリ（モック）

#### 正常系（PACT インタラクション 1 対応）

- [ ] **正常系**: 通常営業日に available 状態のスロットのみが返されること
  - PACT: `GET /api/slots/available?ownerId=owner-001&date=2024-01-15` -> 200, slots 配列に available スロットが含まれる
- [ ] **正常系**: 返却されるスロット情報に slotId, startTime（HH:mm）, endTime（HH:mm）, durationMinutes（integer）, status（"available"）が含まれること
- [ ] **正常系**: booked 状態のスロットはフィルタされ結果に含まれないこと

#### 休業日（PACT インタラクション 2 対応）

- [ ] **正常系**: 休業日（ClosedDay が存在する日）の場合、isHoliday=true と空の slots 配列が返されること
  - PACT: `GET /api/slots/available?ownerId=owner-001&date=2024-01-16` -> 200, `{ date: "2024-01-16", isHoliday: true, slots: [] }`

#### 定休日

- [ ] **正常系**: 定休日（isBusinessDay=false）の場合、空の slots 配列が返されること

#### 境界値

- [ ] **境界値**: DailySlotList が存在しない（スロット未生成）場合、空の slots 配列が返されること
- [ ] **境界値**: すべてのスロットが booked の場合、空の slots 配列が返されること

### 4-3. SlotReservationService（スロット予約確保・解放サービス）

#### 依存コンポーネント

- DailySlotList リポジトリ（モック）

#### reserve: 正常系（PACT インタラクション 3 対応）

- [ ] **正常系**: available 状態のスロットを予約確保できること
  - PACT: `PUT /api/slots/slot-001/reserve` + `{ reservationId: "rsv-001" }` -> 200, `{ slotId: "slot-001", status: "booked", reservationId: "rsv-001" }`
- [ ] **正常系**: 予約確保後、DailySlotList の version がインクリメントされていること
- [ ] **正常系**: 予約確保後、DailySlotList が保存（save が呼ばれる）されていること

#### reserve: 異常系（PACT インタラクション 4 対応）

- [ ] **異常系**: booked 状態のスロットに reserve すると SLOT_ALREADY_BOOKED エラーが返ること
  - PACT: `PUT /api/slots/slot-001/reserve` + `{ reservationId: "rsv-002" }` -> 409, `{ error: "SLOT_ALREADY_BOOKED", message: "指定されたスロットは既に予約済みです" }`
- [ ] **異常系**: 存在しない slotId で reserve するとエラーになること

#### release: 正常系（PACT インタラクション 5 対応）

- [ ] **正常系**: booked 状態のスロットを正しい reservationId で解放できること
  - PACT: `PUT /api/slots/slot-001/release` + `{ reservationId: "rsv-001" }` -> 200, `{ slotId: "slot-001", status: "available" }`
- [ ] **正常系**: 解放後、DailySlotList の version がインクリメントされていること
- [ ] **正常系**: 解放後、DailySlotList が保存（save が呼ばれる）されていること
- [ ] **正常系**: 解放後のレスポンスに reservationId が含まれないこと（release 後は null）

#### release: 異常系

- [ ] **異常系**: reservationId が一致しない場合、エラーになること
- [ ] **異常系**: available 状態のスロットを release しようとするとエラーになること
- [ ] **異常系**: 存在しない slotId で release するとエラーになること

---

## PACT 契約インタラクション対応表

| PACT インタラクション | テスト計画での対応箇所 |
|---|---|
| 1. 指定日の空きスロット一覧を取得する（200） | Step 4 > 4-2. SlotAvailabilityService > 正常系 |
| 2. 休業日の空きスロット照会で空配列が返る（200） | Step 4 > 4-2. SlotAvailabilityService > 休業日 |
| 3. スロットを予約確保する（200） | Step 4 > 4-3. SlotReservationService > reserve 正常系 |
| 4. 既に予約済みのスロットを確保しようとすると競合エラーが返る（409） | Step 4 > 4-3. SlotReservationService > reserve 異常系 |
| 5. スロットを解放する（キャンセル時）（200） | Step 4 > 4-3. SlotReservationService > release 正常系 |
