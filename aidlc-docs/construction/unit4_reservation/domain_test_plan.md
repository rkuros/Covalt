# Unit 4 予約管理 - ドメインモデル テスト計画

## 必須 Question

### Q1: 使用するプログラミング言語とテストフレームワーク

[Question] Unit 4 の実装に使用するプログラミング言語およびテストフレームワークは何ですか？（例: TypeScript + Jest / Vitest、Kotlin + JUnit 5、Go + testing 等）テストフレームワークの選定によりモック戦略やアサーション記法が変わるため、事前に確定が必要です。

[Answer]

### Q2: テストのディレクトリ構造

[Question] テストファイルの配置ディレクトリ構造はどのようにしますか？（例: `src/domain/__tests__/` にフラットに配置する / `tests/unit/domain/` 配下にコンポーネント種別ごとのサブディレクトリを切る / ソースファイルと同階層に `.test.ts` を置くコロケーション方式 等）

[Answer]

---

## Step 1: 値オブジェクト（Value Objects）のテスト

値オブジェクトはドメインモデルの最小構成要素であり、他のコンポーネントへの依存がないため最初にテストする。すべての値オブジェクトはイミュータブルであることを前提とする。

### 1-1. ReservationId

- [ ] **正常系**: 有効な UUID v4 文字列で生成できること
- [ ] **正常系**: 同じ UUID 文字列を持つ2つの ReservationId が等価と判定されること
- [ ] **正常系**: 異なる UUID 文字列を持つ2つの ReservationId が非等価と判定されること
- [ ] **異常系**: null を渡した場合にエラーとなること
- [ ] **異常系**: 空文字を渡した場合にエラーとなること
- [ ] **異常系**: UUID v4 形式でない文字列（例: `abc-123`）を渡した場合にエラーとなること
- [ ] **異常系**: UUID v4 に近いが不正な形式（桁数不足、不正文字含む等）を渡した場合にエラーとなること

### 1-2. ReservationStatus

- [ ] **正常系**: `confirmed` で生成できること
- [ ] **正常系**: `cancelled` で生成できること
- [ ] **正常系**: `completed` で生成できること
- [ ] **正常系**: 同じ値を持つ2つの ReservationStatus が等価と判定されること
- [ ] **異常系**: 定義外の文字列（例: `pending`, `modified`）を渡した場合にエラーとなること
- [ ] **異常系**: null を渡した場合にエラーとなること
- [ ] **異常系**: 空文字を渡した場合にエラーとなること

### 1-3. ActorType

- [ ] **正常系**: `customer` で生成できること
- [ ] **正常系**: `owner` で生成できること
- [ ] **正常系**: 同じ値を持つ2つの ActorType が等価と判定されること
- [ ] **異常系**: 定義外の文字列（例: `admin`, `system`）を渡した場合にエラーとなること
- [ ] **異常系**: null を渡した場合にエラーとなること

### 1-4. ChangeType

- [ ] **正常系**: `modified` で生成できること
- [ ] **正常系**: `cancelled` で生成できること
- [ ] **正常系**: `completed` で生成できること
- [ ] **異常系**: 定義外の文字列（例: `created`, `deleted`）を渡した場合にエラーとなること
- [ ] **異常系**: null を渡した場合にエラーとなること

### 1-5. ReservationDateTime

- [ ] **正常系**: 有効な ISO 8601 形式の JST 日時文字列で生成できること（例: `2024-01-15T10:00:00+09:00`）
- [ ] **正常系**: 同じ日時を表す2つの ReservationDateTime が等価と判定されること
- [ ] **正常系**: タイムゾーンを正規化した上での等価判定が正しく動作すること（例: `+09:00` と UTC 変換後の比較）
- [ ] **正常系**: 未来の日時が「過去日時ではない」と判定されること
- [ ] **正常系**: 過去の日時が「過去日時である」と判定されること
- [ ] **境界値**: 現在時刻ちょうどの日時に対する過去日時判定の挙動を確認すること
- [ ] **異常系**: null を渡した場合にエラーとなること
- [ ] **異常系**: 不正な日時形式の文字列を渡した場合にエラーとなること
- [ ] **異常系**: タイムゾーン情報を含まない日時文字列を渡した場合の挙動を確認すること

[Question] 過去日時の判定において「現在時刻ちょうど」をどちらに分類しますか？（過去とみなすか、未来とみなすか）テスト実装上、境界の振る舞いを明確にする必要があります。

[Answer]

### 1-6. DurationMinutes

- [ ] **正常系**: 有効な値（例: 30, 60, 90）で生成できること
- [ ] **正常系**: 同じ値を持つ2つの DurationMinutes が等価と判定されること
- [ ] **境界値**: 最小値 15 で生成できること
- [ ] **境界値**: 最大値 1440 で生成できること
- [ ] **境界値**: 最小値未満（14）でエラーとなること
- [ ] **境界値**: 最大値超過（1441）でエラーとなること
- [ ] **異常系**: 0 を渡した場合にエラーとなること
- [ ] **異常系**: 負の値を渡した場合にエラーとなること
- [ ] **異常系**: null を渡した場合にエラーとなること
- [ ] **異常系**: 小数値（例: 30.5）を渡した場合にエラーとなること

### 1-7. CustomerName

- [ ] **正常系**: 有効な文字列（例: `"田中太郎"`）で生成できること
- [ ] **正常系**: 同じ文字列を持つ2つの CustomerName が等価と判定されること
- [ ] **異常系**: null を渡した場合にエラーとなること
- [ ] **異常系**: 空文字を渡した場合にエラーとなること

### 1-8. OwnerId

- [ ] **正常系**: 有効な文字列で生成できること
- [ ] **正常系**: 同じ文字列を持つ2つの OwnerId が等価と判定されること
- [ ] **異常系**: null を渡した場合にエラーとなること
- [ ] **異常系**: 空文字を渡した場合にエラーとなること

### 1-9. CustomerId

- [ ] **正常系**: 有効な文字列で生成できること
- [ ] **正常系**: 同じ文字列を持つ2つの CustomerId が等価と判定されること
- [ ] **異常系**: null を渡した場合にエラーとなること
- [ ] **異常系**: 空文字を渡した場合にエラーとなること

### 1-10. SlotId

- [ ] **正常系**: 有効な文字列で生成できること
- [ ] **正常系**: 同じ文字列を持つ2つの SlotId が等価と判定されること
- [ ] **異常系**: null を渡した場合にエラーとなること
- [ ] **異常系**: 空文字を渡した場合にエラーとなること

### 1-11. LineUserId

- [ ] **正常系**: 有効な形式（`U` + 32桁hex、例: `U1234567890abcdef1234567890abcdef`）で生成できること
- [ ] **正常系**: null を許容すること（LINE 未連携のケース）
- [ ] **正常系**: 同じ文字列を持つ2つの LineUserId が等価と判定されること
- [ ] **正常系**: 大文字hex（例: `U1234567890ABCDEF1234567890ABCDEF`）の扱いを確認すること
- [ ] **異常系**: `U` プレフィックスがない文字列を渡した場合にエラーとなること
- [ ] **異常系**: `U` + 31桁（桁数不足）を渡した場合にエラーとなること
- [ ] **異常系**: `U` + 33桁（桁数超過）を渡した場合にエラーとなること
- [ ] **異常系**: `U` + 32桁だが hex 以外の文字を含む場合にエラーとなること
- [ ] **異常系**: 空文字を渡した場合にエラーとなること

[Question] LineUserId の正規表現 `^U[0-9a-f]{32}$` について、大文字の hex（`A-F`）も許容しますか？PACT の matchingRules では小文字のみ（`a-f`）が定義されていますが、実装上の許容範囲を確認したいです。

[Answer]

### 1-12. HistoryId

- [ ] **正常系**: 有効な UUID v4 文字列で生成できること
- [ ] **正常系**: 同じ UUID 文字列を持つ2つの HistoryId が等価と判定されること
- [ ] **異常系**: null を渡した場合にエラーとなること
- [ ] **異常系**: 空文字を渡した場合にエラーとなること
- [ ] **異常系**: UUID v4 形式でない文字列を渡した場合にエラーとなること

---

## Step 2: エンティティ（Entities）のテスト

エンティティはライフサイクルを通じて ID で識別される。値オブジェクトのテストが完了した後に実施する。

### 2-1. ReservationHistory

- [ ] **正常系**: 有効な属性（historyId, changeType=modified, previousDateTime, newDateTime, previousSlotId, newSlotId, changedBy, changedAt）で生成できること
- [ ] **正常系**: changeType=cancelled の場合、previousDateTime / newDateTime / previousSlotId / newSlotId が null でも生成できること
- [ ] **正常系**: changeType=completed の場合、previousDateTime / newDateTime / previousSlotId / newSlotId が null でも生成できること
- [ ] **正常系**: 同じ historyId を持つ2つの ReservationHistory が同一エンティティと判定されること
- [ ] **異常系**: 必須属性（historyId, changeType, changedBy, changedAt）が null の場合にエラーとなること

[Question] changeType=modified の場合に previousDateTime / newDateTime / previousSlotId / newSlotId はすべて必須ですか？（例: 日時のみ変更してスロットも必ず変わるのか、あるいはスロット変更なしで日時だけ変わるケースがあるか）

[Answer]

### 2-2. Reservation（エンティティ単体としての生成・属性テスト）

- [ ] **正常系**: 有効な全属性を指定して Reservation を生成できること
- [ ] **正常系**: 生成時の status が `confirmed` であること
- [ ] **正常系**: lineUserId が null の場合でも生成できること（LINE 未連携の顧客）
- [ ] **正常系**: ownerLineUserId が null の場合でも生成できること（LINE 未連携のオーナー）
- [ ] **正常系**: 生成時に histories が空リストであること
- [ ] **正常系**: 同じ reservationId を持つ2つの Reservation が同一エンティティと判定されること
- [ ] **異常系**: 必須属性（reservationId, ownerId, customerId, slotId, dateTime, durationMinutes, status, customerName, createdBy, createdAt）が null の場合にエラーとなること（INV-4）

---

## Step 3: 集約（Aggregates）のテスト

Reservation 集約のコマンド操作、不変条件の検証、状態遷移をテストする。ドメインモデルのテストの中核となるステップ。

### 3-1. create 操作（予約作成）

- [ ] **正常系**: 有効なパラメータで予約を作成し、status が `confirmed` になること
- [ ] **正常系**: createdAt / updatedAt が現在日時で設定されること
- [ ] **正常系**: 作成時に histories が空であること（作成自体は履歴に記録しない）
- [ ] **正常系**: createdBy が `customer` の場合に正しく設定されること
- [ ] **正常系**: createdBy が `owner` の場合に正しく設定されること
- [ ] **正常系**: lineUserId が null でも作成できること
- [ ] **正常系**: ownerLineUserId が null でも作成できること
- [ ] **正常系**: ReservationCreated ドメインイベントが発生すること

### 3-2. modify 操作（予約変更）- 状態遷移とビジネスルール

#### 正常系

- [ ] **正常系**: confirmed 状態かつ未来日時の予約に対して modify を実行し、日時・スロット・施術時間が更新されること
- [ ] **正常系**: modify 後も status が `confirmed` のまま維持されること
- [ ] **正常系**: modify により ReservationHistory（changeType=modified）が追加されること
- [ ] **正常系**: ReservationHistory に変更前の dateTime / slotId と変更後の dateTime / slotId が記録されること
- [ ] **正常系**: updatedAt が更新されること
- [ ] **正常系**: modifiedBy が `customer` の場合に ReservationHistory.changedBy が `customer` であること
- [ ] **正常系**: modifiedBy が `owner` の場合に ReservationHistory.changedBy が `owner` であること
- [ ] **正常系**: 複数回 modify を実行し、履歴が複数件追加されること
- [ ] **正常系**: ReservationModified ドメインイベントが発生すること

#### 異常系 - ステータス遷移制約（INV-1）

- [ ] **異常系**: `cancelled` 状態の予約に対して modify を実行した場合にドメインエラーとなること
- [ ] **異常系**: `completed` 状態の予約に対して modify を実行した場合にドメインエラーとなること

#### 異常系 - 過去日時制約（INV-2）

- [ ] **異常系**: 予約日時が過去の予約に対して modify を実行した場合にドメインエラーとなること
- [ ] **境界値**: 予約日時が現在時刻ちょうどの予約に対する modify の挙動を確認すること

### 3-3. cancel 操作（予約キャンセル）- 状態遷移とビジネスルール

#### 正常系

- [ ] **正常系**: confirmed 状態かつ未来日時の予約に対して cancel を実行し、status が `cancelled` になること
- [ ] **正常系**: cancel により ReservationHistory（changeType=cancelled）が追加されること
- [ ] **正常系**: updatedAt が更新されること
- [ ] **正常系**: cancelledBy が `customer` の場合に ReservationHistory.changedBy が `customer` であること
- [ ] **正常系**: cancelledBy が `owner` の場合に ReservationHistory.changedBy が `owner` であること
- [ ] **正常系**: ReservationCancelled ドメインイベントが発生すること

#### 異常系 - ステータス遷移制約（INV-1）

- [ ] **異常系**: `cancelled` 状態の予約に対して cancel を実行した場合にドメインエラーとなること（キャンセル済みの再キャンセル不可）
- [ ] **異常系**: `completed` 状態の予約に対して cancel を実行した場合にドメインエラーとなること

#### 異常系 - 過去日時制約（INV-2）

- [ ] **異常系**: 予約日時が過去の予約に対して cancel を実行した場合にドメインエラーとなること
- [ ] **境界値**: 予約日時が現在時刻ちょうどの予約に対する cancel の挙動を確認すること

### 3-4. complete 操作（予約完了）- 状態遷移とビジネスルール

#### 正常系

- [ ] **正常系**: confirmed 状態の予約に対して complete を実行し、status が `completed` になること
- [ ] **正常系**: 過去日時の予約に対しても complete を実行できること（INV-2 の対象外）
- [ ] **正常系**: complete により ReservationHistory（changeType=completed）が追加されること
- [ ] **正常系**: updatedAt が更新されること
- [ ] **正常系**: 完了操作ではドメインイベントが発行されないこと（現時点で Consumer なし）

#### 異常系 - ステータス遷移制約（INV-1）

- [ ] **異常系**: `cancelled` 状態の予約に対して complete を実行した場合にドメインエラーとなること
- [ ] **異常系**: `completed` 状態の予約に対して complete を実行した場合にドメインエラーとなること（完了済みの再完了不可）

### 3-5. 不変条件（INV-3）変更履歴の整合性 - 複合シナリオ

- [ ] **正常系**: 作成 -> 変更 -> キャンセルの一連の操作で履歴が正しく2件（modified + cancelled）記録されること
- [ ] **正常系**: 作成 -> 変更 -> 変更 -> 完了の一連の操作で履歴が正しく3件（modified + modified + completed）記録されること
- [ ] **正常系**: 各履歴の changedAt が操作時刻として正しく記録されること

### 3-6. スナップショット属性の不変性

- [ ] **正常系**: modify 操作後に customerName が変更されていないこと
- [ ] **正常系**: modify 操作後に lineUserId が変更されていないこと
- [ ] **正常系**: modify 操作後に ownerLineUserId が変更されていないこと
- [ ] **正常系**: cancel 操作後にスナップショット属性が変更されていないこと

---

## Step 4: ドメインサービス（Domain Services）のテスト

ReservationCommandService のテスト。外部依存（ReservationRepository, SlotGateway, CustomerGateway, EventPublisher）はモックで置き換える。

### モック戦略

[Question] ドメインサービスのテストにおいて、外部依存のモック生成にはテストフレームワーク標準のモック機能（例: Jest の `jest.fn()` / `jest.mock()`、Mockito 等）を使用しますか？それとも手動でインメモリ実装（Fake）を作成する方針ですか？

[Answer]

以下のインターフェースをモック/スタブとして用意する前提で計画する。

| インターフェース | モック方針 |
|-----------------|-----------|
| ReservationRepository | findById で指定した Reservation を返す / save の呼び出しを記録する |
| SlotGateway | reserveSlot の成功/失敗（409）を制御する / releaseSlot の呼び出しを記録する |
| CustomerGateway | findById / findByLineUserId で指定した CustomerInfo を返す |
| EventPublisher | publish の呼び出しを記録し、発行されたイベントの内容を検証する |

### 4-1. createReservation（予約作成）

#### 顧客操作（ActorType = customer）

- [ ] **正常系**: CustomerGateway.findByLineUserId -> SlotGateway.reserveSlot -> Reservation.create -> ReservationRepository.save -> EventPublisher.publish の順で処理が実行されること
- [ ] **正常系**: 作成された Reservation の createdBy が `customer` であること
- [ ] **正常系**: CustomerGateway から取得した customerName, lineUserId がスナップショットとして Reservation に設定されること
- [ ] **正常系**: EventPublisher に ReservationCreated イベントが渡されること
- [ ] **異常系**: CustomerGateway.findByLineUserId が null を返した場合にエラーとなること（顧客未登録）
- [ ] **異常系**: SlotGateway.reserveSlot が 409（SLOT_ALREADY_BOOKED）を返した場合にエラーとなること

#### オーナー操作（ActorType = owner）

- [ ] **正常系**: CustomerGateway.findById -> SlotGateway.reserveSlot -> Reservation.create -> ReservationRepository.save -> EventPublisher.publish の順で処理が実行されること
- [ ] **正常系**: 作成された Reservation の createdBy が `owner` であること
- [ ] **正常系**: EventPublisher に ReservationCreated イベントが渡されること
- [ ] **異常系**: CustomerGateway.findById が null を返した場合にエラーとなること（顧客不存在）
- [ ] **異常系**: SlotGateway.reserveSlot が 409 を返した場合にエラーとなること

### 4-2. modifyReservation（予約変更）

- [ ] **正常系**: ReservationRepository.findById -> SlotGateway.releaseSlot（旧スロット） -> SlotGateway.reserveSlot（新スロット） -> Reservation.modify -> ReservationRepository.save -> EventPublisher.publish の順で処理が実行されること
- [ ] **正常系**: EventPublisher に ReservationModified イベントが渡されること
- [ ] **異常系**: ReservationRepository.findById が null を返した場合にエラーとなること（予約不存在）
- [ ] **異常系**: Reservation.modify がドメインエラーを返した場合（INV-1, INV-2 違反）にエラーが伝播すること
- [ ] **異常系**: SlotGateway.reserveSlot（新スロット）が 409 を返した場合にエラーとなること

#### アクセス制御

- [ ] **異常系**: 顧客操作時に customerId が一致しない予約を変更しようとした場合にエラーとなること
- [ ] **異常系**: オーナー操作時に ownerId が一致しない予約を変更しようとした場合にエラーとなること

### 4-3. cancelReservation（予約キャンセル）

- [ ] **正常系**: ReservationRepository.findById -> Reservation.cancel -> SlotGateway.releaseSlot -> ReservationRepository.save -> EventPublisher.publish の順で処理が実行されること
- [ ] **正常系**: EventPublisher に ReservationCancelled イベントが渡されること
- [ ] **異常系**: ReservationRepository.findById が null を返した場合にエラーとなること（予約不存在）
- [ ] **異常系**: Reservation.cancel がドメインエラーを返した場合（INV-1, INV-2 違反）にエラーが伝播すること

#### アクセス制御

- [ ] **異常系**: 顧客操作時に customerId が一致しない予約をキャンセルしようとした場合にエラーとなること
- [ ] **異常系**: オーナー操作時に ownerId が一致しない予約をキャンセルしようとした場合にエラーとなること

### 4-4. completeReservation（予約完了）

- [ ] **正常系**: ReservationRepository.findById -> Reservation.complete -> ReservationRepository.save の順で処理が実行されること
- [ ] **正常系**: EventPublisher.publish が呼び出されないこと（現時点で Consumer なし）
- [ ] **異常系**: ReservationRepository.findById が null を返した場合にエラーとなること（予約不存在）
- [ ] **異常系**: Reservation.complete がドメインエラーを返した場合（INV-1 違反）にエラーが伝播すること

---

## Step 5: ドメインイベント（Domain Events）のテスト

ドメインイベントのペイロード構造と PACT 整合性を検証する。

### 5-1. ReservationCreated イベント

#### ペイロード構造

- [ ] **正常系**: eventType が `reservation.created` であること
- [ ] **正常系**: 必須フィールド（reservationId, ownerId, customerId, customerName, slotId, dateTime, durationMinutes, timestamp）がすべて含まれること
- [ ] **正常系**: lineUserId が null 許容であること（LINE 未連携のケース）
- [ ] **正常系**: ownerLineUserId が null 許容であること
- [ ] **正常系**: timestamp が UTC の ISO 8601 形式であること
- [ ] **正常系**: dateTime が JST（+09:00）の ISO 8601 形式であること
- [ ] **正常系**: durationMinutes が整数であること

#### Unit 5 向け PACT 整合性

- [ ] **PACT**: eventType が `^reservation\.created$` にマッチすること
- [ ] **PACT**: reservationId が文字列型であること（type マッチ）
- [ ] **PACT**: ownerId が文字列型であること（type マッチ）
- [ ] **PACT**: customerId が文字列型であること（type マッチ）
- [ ] **PACT**: customerName が文字列型であること（type マッチ）
- [ ] **PACT**: lineUserId が文字列型であること（type マッチ）
- [ ] **PACT**: ownerLineUserId が文字列型であること（type マッチ）
- [ ] **PACT**: slotId が文字列型であること（type マッチ）
- [ ] **PACT**: dateTime が `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` にマッチすること
- [ ] **PACT**: timestamp が `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$` にマッチすること

#### Unit 7 向け PACT 整合性

- [ ] **PACT**: eventType が `^reservation\.created$` にマッチすること
- [ ] **PACT**: reservationId が文字列型であること（type マッチ）
- [ ] **PACT**: ownerId が文字列型であること（type マッチ）
- [ ] **PACT**: customerName が文字列型であること（type マッチ）
- [ ] **PACT**: dateTime が `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` にマッチすること
- [ ] **PACT**: durationMinutes が整数型であること（integer マッチ）

### 5-2. ReservationModified イベント

#### ペイロード構造

- [ ] **正常系**: eventType が `reservation.modified` であること
- [ ] **正常系**: 必須フィールド（reservationId, ownerId, customerId, customerName, slotId, dateTime, previousDateTime, durationMinutes, modifiedBy, timestamp）がすべて含まれること
- [ ] **正常系**: modifiedBy が `customer` または `owner` のいずれかであること
- [ ] **正常系**: previousDateTime が変更前の日時であること
- [ ] **正常系**: dateTime が変更後の日時であること
- [ ] **正常系**: lineUserId が null 許容であること
- [ ] **正常系**: ownerLineUserId が null 許容であること

#### Unit 5 向け PACT 整合性

- [ ] **PACT**: eventType が `^reservation\.modified$` にマッチすること
- [ ] **PACT**: reservationId が文字列型であること（type マッチ）
- [ ] **PACT**: dateTime が `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` にマッチすること
- [ ] **PACT**: previousDateTime が `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` にマッチすること
- [ ] **PACT**: modifiedBy が `^(customer|owner)$` にマッチすること

#### Unit 7 向け PACT 整合性

- [ ] **PACT**: eventType が `^reservation\.modified$` にマッチすること
- [ ] **PACT**: dateTime が `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` にマッチすること
- [ ] **PACT**: previousDateTime が `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` にマッチすること

### 5-3. ReservationCancelled イベント

#### ペイロード構造

- [ ] **正常系**: eventType が `reservation.cancelled` であること
- [ ] **正常系**: 必須フィールド（reservationId, ownerId, customerId, customerName, slotId, dateTime, cancelledBy, timestamp）がすべて含まれること
- [ ] **正常系**: cancelledBy が `customer` または `owner` のいずれかであること
- [ ] **正常系**: lineUserId が null 許容であること
- [ ] **正常系**: ownerLineUserId が null 許容であること
- [ ] **正常系**: durationMinutes が含まれないこと（キャンセルイベントには不要）

#### Unit 5 向け PACT 整合性

- [ ] **PACT**: eventType が `^reservation\.cancelled$` にマッチすること
- [ ] **PACT**: cancelledBy が `^(customer|owner)$` にマッチすること

#### Unit 7 向け PACT 整合性

- [ ] **PACT**: eventType が `^reservation\.cancelled$` にマッチすること

### 5-4. PACT フィールド網羅性の横断テスト

- [ ] **PACT**: Unit 5 の PACT で要求されるすべてのフィールド（customerId, lineUserId, ownerLineUserId, modifiedBy, cancelledBy）が対応するイベントペイロードに含まれること
- [ ] **PACT**: Unit 7 の PACT で要求されるすべてのフィールド（durationMinutes, previousDateTime）が対応するイベントペイロードに含まれること
- [ ] **PACT**: Unit 5 の PACT サンプル値に含まれる lineUserId（`U1234567890abcdef`）は18文字であり、実装仕様（`U` + 32桁hex = 33文字）と異なるため、PACT の matchingRules（type マッチ）で検証し、サンプル値自体はテスト用ダミーとして扱うこと

[Question] Unit 5 の PACT サンプル値 `lineUserId: "U1234567890abcdef"` は `U` + 16桁hex（18文字）であり、ドメインモデルの定義 `U` + 32桁hex（33文字）と桁数が異なります。PACT の matchingRules が type マッチ（文字列型であること）のみを要求しているため、テストでは型レベルの検証のみで十分と解釈してよいですか？

[Answer]

---

## Step 6: リポジトリ / Gateway インターフェースのテスト

リポジトリインターフェースと Gateway インターフェースの契約を検証する。実装はインフラストラクチャ層に属するが、ドメイン層のインターフェースとして期待される振る舞いをテストする。

### Gateway モック戦略

[Question] Gateway のテストにおいて、HTTP クライアントレベルのモック（例: nock, WireMock, httptest）を使用しますか？それとも Gateway インターフェースの実装自体をモックとし、呼び出し元（ドメインサービス）のテストでのみ検証しますか？Gateway 実装の単体テスト（HTTP リクエスト/レスポンスの変換ロジック）を別途行うかどうかも確認したいです。

[Answer]

### 6-1. ReservationRepository インターフェース

#### save

- [ ] **正常系**: Reservation 集約（ReservationHistory を含む）を保存できること
- [ ] **正常系**: 新規作成（INSERT 相当）と更新（UPDATE 相当）の両方が動作すること
- [ ] **正常系**: ReservationHistory を含む集約全体が保存されること

#### findById

- [ ] **正常系**: 存在する reservationId で Reservation 集約（ReservationHistory を含む）を取得できること
- [ ] **正常系**: 存在しない reservationId の場合に null が返ること
- [ ] **正常系**: 取得した Reservation に紐づく ReservationHistory が正しくロードされること

#### findUpcomingByCustomerId

- [ ] **正常系**: 指定した customerId / ownerId に該当する未来の confirmed 予約が返ること
- [ ] **正常系**: 過去日時の予約が含まれないこと
- [ ] **正常系**: cancelled / completed ステータスの予約が含まれないこと
- [ ] **正常系**: 該当する予約がない場合に空リストが返ること

#### findPastByCustomerId

- [ ] **正常系**: 指定した customerId / ownerId に該当する過去の予約（cancelled / completed 含む）が返ること
- [ ] **正常系**: 直近順（dateTime 降順）にソートされていること
- [ ] **正常系**: 該当する予約がない場合に空リストが返ること

#### findByOwnerIdAndDateRange

- [ ] **正常系**: 指定した ownerId と日付範囲に該当する予約が返ること
- [ ] **正常系**: 日付範囲外の予約が含まれないこと
- [ ] **境界値**: startDate と endDate が同一日の場合に、その日の予約が返ること
- [ ] **正常系**: 該当する予約がない場合に空リストが返ること

#### findByOwnerIdAndStatus

- [ ] **正常系**: 指定した ownerId とステータスに該当する予約が返ること
- [ ] **正常系**: 異なるステータスの予約が含まれないこと
- [ ] **正常系**: 該当する予約がない場合に空リストが返ること

#### findByOwnerIdAndDateRangeAndStatus

- [ ] **正常系**: ownerId、日付範囲、ステータスの複合条件に該当する予約が返ること
- [ ] **正常系**: いずれかの条件に合致しない予約が含まれないこと
- [ ] **正常系**: 該当する予約がない場合に空リストが返ること

### 6-2. SlotGateway インターフェース

- [ ] **正常系**: findAvailableSlots が SlotListResult（スロット一覧）を返すこと
- [ ] **正常系**: findAvailableSlots で休業日の場合に isHoliday=true と空の slots が返ること
- [ ] **正常系**: reserveSlot が成功時に SlotReserveResult（status=booked）を返すこと
- [ ] **異常系**: reserveSlot で競合時（409 SLOT_ALREADY_BOOKED）にエラーが返ること
- [ ] **正常系**: releaseSlot が成功時に SlotReleaseResult（status=available）を返すこと

### 6-3. CustomerGateway インターフェース

- [ ] **正常系**: findById が CustomerInfo を返すこと
- [ ] **正常系**: findById で存在しない顧客の場合に null が返ること（404 CUSTOMER_NOT_FOUND）
- [ ] **正常系**: findByLineUserId が CustomerInfo を返すこと
- [ ] **正常系**: findByLineUserId で該当なしの場合に null が返ること
- [ ] **正常系**: searchByName が CustomerSearchResult を返すこと
- [ ] **正常系**: create が新規作成された CustomerInfo を返すこと

### 6-4. AuthGateway インターフェース

- [ ] **正常系**: verifyToken が有効なトークンに対して AuthResult を返すこと
- [ ] **異常系**: verifyToken が無効なトークンに対して UNAUTHORIZED エラーを返すこと
- [ ] **異常系**: verifyToken が無効化されたアカウントに対して ACCOUNT_DISABLED エラーを返すこと

### 6-5. LiffGateway インターフェース

- [ ] **正常系**: verifyLiffToken が有効なトークンに対して LiffVerifyResult を返すこと
- [ ] **正常系**: LiffVerifyResult.lineUserId が `U` + 32桁hex の形式であること
- [ ] **異常系**: verifyLiffToken が無効なトークンに対して INVALID_LIFF_TOKEN エラーを返すこと

### 6-6. EventPublisher インターフェース

- [ ] **正常系**: publish で ReservationCreated イベントを発行できること
- [ ] **正常系**: publish で ReservationModified イベントを発行できること
- [ ] **正常系**: publish で ReservationCancelled イベントを発行できること
