# Unit 4 予約管理 - エンティティ定義

## 概要

Unit 4（予約管理）の境界づけられたコンテキストに属するエンティティを定義する。
エンティティはライフサイクルを通じてアイデンティティ（ID）を持つドメインオブジェクトである。

---

## 1. Reservation（予約）

予約管理コンテキストの中核エンティティ。顧客またはオーナーの操作により作成され、変更・キャンセル・完了のライフサイクルを持つ。

### 属性

| 属性名 | 型（値オブジェクト） | 必須 | 説明 |
|--------|---------------------|------|------|
| reservationId | ReservationId | Yes | 予約の一意識別子（UUID v4） |
| ownerId | OwnerId | Yes | 予約が属するオーナーの識別子 |
| customerId | CustomerId | Yes | 予約した顧客の識別子 |
| slotId | SlotId | Yes | 予約対象スロットの識別子 |
| dateTime | ReservationDateTime | Yes | 予約日時（JST タイムゾーン付き） |
| durationMinutes | DurationMinutes | Yes | 施術時間（分）。予約作成時にスロットから取得したスナップショット |
| status | ReservationStatus | Yes | 予約ステータス（confirmed / cancelled / completed） |
| customerName | CustomerName | Yes | 顧客名。予約作成時のスナップショット |
| lineUserId | LineUserId | No | 顧客の LINE ユーザーID。予約作成時のスナップショット（LINE 未連携の場合は null） |
| ownerLineUserId | LineUserId | No | オーナーの LINE ユーザーID。予約作成時のスナップショット |
| createdBy | ActorType | Yes | 予約作成者の種別（customer / owner） |
| createdAt | DateTime (UTC) | Yes | 予約作成日時 |
| updatedAt | DateTime (UTC) | Yes | 最終更新日時 |
| histories | List&lt;ReservationHistory&gt; | Yes | 変更履歴のコレクション（0件以上） |

### スナップショット属性の設計根拠

`customerName`, `lineUserId`, `ownerLineUserId` は Unit 6（顧客情報管理）に正規データが存在するが、以下の理由から予約作成時のスナップショットとして Reservation に保持する（Q13 確定）。

- ドメインイベント発行時に Unit 6 API への同期的依存を排除する
- Unit 6 の障害が予約ドメインの動作に影響しない（障害分離）
- イベントペイロード（Unit 5 / Unit 7 向け）に必要なフィールドを自己完結的に保持する

`durationMinutes` は Unit 3 のスロットから取得される値だが、Unit 7 向けイベントに必要であり、予約の属性としてスナップショット保持する（Q14 確定）。

### 状態遷移

```
[作成] --> confirmed --> cancelled
              |
              +--> completed
```

| 遷移元 | 遷移先 | トリガー | 操作者 |
|--------|--------|---------|--------|
| (なし) | confirmed | 予約作成 | customer / owner |
| confirmed | confirmed | 予約変更（日時のみ更新、ステータスは不変） | customer / owner |
| confirmed | cancelled | 予約キャンセル | customer / owner |
| confirmed | completed | 予約完了 | owner（手動。将来バッチ自動も拡張可能） |

- `modified` は独立ステータスとしない。変更後も `confirmed` のまま日時のみ更新される（Q17 確定）
- `cancelled` / `completed` からの遷移は不可（終端状態）
- `completed` への遷移はオーナー手動操作。将来的にバッチ自動完了も追加可能な設計とする（Q18 確定）

### ビジネスルール

1. **ステータス遷移制約**: 上記の許可された遷移のみ実行可能。不正な遷移はドメインエラーとする
2. **過去日時制約**: 過去の予約（dateTime が現在より前）は変更・キャンセル不可
3. **スナップショット不変性**: 顧客情報のスナップショット属性（customerName, lineUserId, ownerLineUserId）は作成後に変更しない
4. **変更履歴記録**: 予約変更時は必ず ReservationHistory を追加する（集約ルートである Reservation 経由でのみ追加）

---

## 2. ReservationHistory（予約変更履歴）

予約の変更操作を記録するエンティティ。Reservation 集約内に含まれ、集約ルート（Reservation）経由でのみ作成される。

### 属性

| 属性名 | 型（値オブジェクト） | 必須 | 説明 |
|--------|---------------------|------|------|
| historyId | HistoryId | Yes | 変更履歴の一意識別子 |
| changeType | ChangeType | Yes | 変更種別（modified / cancelled / completed） |
| previousDateTime | ReservationDateTime | No | 変更前の予約日時（modified の場合のみ） |
| newDateTime | ReservationDateTime | No | 変更後の予約日時（modified の場合のみ） |
| previousSlotId | SlotId | No | 変更前のスロットID（modified の場合のみ） |
| newSlotId | SlotId | No | 変更後のスロットID（modified の場合のみ） |
| changedBy | ActorType | Yes | 操作者の種別（customer / owner） |
| changedAt | DateTime (UTC) | Yes | 変更日時 |

### 設計根拠

- ReservationHistory は Reservation とは別のエンティティとして定義する（Q16 確定）
- Reservation 集約内に含まれ、Reservation の集約ルート経由でのみ履歴を追加する（Q21 確定）
- 1予約あたりの履歴件数は少数であるため、集約内に含めてもパフォーマンス上の問題はない
- US-O04「変更前後の日時が変更履歴として記録される」の要件を実現する

---

## エンティティ間の関係

```
Reservation (集約ルート)
    |
    +-- 1:N -- ReservationHistory
```

- Reservation は0件以上の ReservationHistory を保持する
- ReservationHistory は必ず1つの Reservation に属する
- ReservationHistory への操作は必ず Reservation 集約ルート経由で行う
