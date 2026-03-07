# Unit 4 予約管理 - 集約定義

## 概要

Unit 4（予約管理）の境界づけられたコンテキストにおける集約と集約ルートを定義する。
集約はトランザクション整合性の境界であり、集約ルートを通じてのみ内部の状態を変更できる。

---

## Reservation 集約

### 集約構成

```
Reservation（集約ルート）
    |
    +-- 0..N -- ReservationHistory
```

| 要素 | 役割 | 説明 |
|------|------|------|
| Reservation | 集約ルート | 予約エンティティ。外部からの操作の唯一の入口 |
| ReservationHistory | 内部エンティティ | 予約変更履歴。集約ルート経由でのみ追加される |

### 集約境界の設計根拠

Reservation と ReservationHistory を1つの集約にまとめる（Q21 確定）。

- ReservationHistory は Reservation なしには存在意義を持たない（ライフサイクルの従属）
- 1予約あたりの変更履歴は少数件（数件〜十数件程度）であり、集約サイズの肥大化は問題にならない
- 予約変更時に「Reservation のステータス/日時更新」と「ReservationHistory の追加」を同一トランザクションで保証する必要がある

---

### 不変条件（ビジネスルール）

集約が常に満たすべき不変条件を以下に列挙する。

#### INV-1: ステータス遷移制約

許可された状態遷移のみ実行可能とする。

| 現在のステータス | 許可される遷移先 |
|-----------------|-----------------|
| confirmed | confirmed（日時変更）、cancelled、completed |
| cancelled | なし（終端状態） |
| completed | なし（終端状態） |

- `cancelled` または `completed` 状態の予約に対する変更・キャンセル・完了操作はドメインエラーとする

#### INV-2: 過去日時操作禁止

- 予約日時（dateTime）が現在日時より過去の予約に対して、変更およびキャンセル操作は実行不可
- 完了操作（confirmed -> completed）は過去日時の予約に対しても実行可能（サービス提供後に完了にするユースケース）

#### INV-3: 変更履歴の整合性

- 予約変更（日時変更）時は、必ず ReservationHistory（changeType = modified）が追加される
- 予約キャンセル時は、必ず ReservationHistory（changeType = cancelled）が追加される
- 予約完了時は、必ず ReservationHistory（changeType = completed）が追加される
- ReservationHistory は Reservation 集約ルート経由でのみ追加可能。直接作成は禁止

#### INV-4: 必須属性の非 null 保証

- reservationId, ownerId, customerId, slotId, dateTime, durationMinutes, status, customerName, createdBy, createdAt は常に非 null

---

### 集約ルートの操作（コマンド）

Reservation 集約ルートが公開する操作を定義する。各操作は不変条件を検証し、成功時にドメインイベントを発生させる。

#### create（予約作成）

| 項目 | 内容 |
|------|------|
| 事前条件 | なし（新規作成のため） |
| 入力 | reservationId, ownerId, customerId, slotId, dateTime, durationMinutes, customerName, lineUserId, ownerLineUserId, createdBy |
| 処理 | status を `confirmed` に設定。createdAt / updatedAt を現在日時に設定 |
| 事後条件 | Reservation が `confirmed` 状態で生成される |
| ドメインイベント | ReservationCreated |

備考: 二重予約防止（同一スロットへの重複予約禁止）は Unit 3 の `PUT /api/slots/{slotId}/reserve` API に委譲する（Q22 確定）。Unit 4 の集約内ではスロットの排他制御を行わない。

#### modify（予約変更）

| 項目 | 内容 |
|------|------|
| 事前条件 | INV-1（status が confirmed であること）、INV-2（dateTime が未来であること） |
| 入力 | newSlotId, newDateTime, newDurationMinutes, modifiedBy (ActorType) |
| 処理 | 変更前の dateTime / slotId を記録し、新しい値に更新。ReservationHistory（changeType = modified）を追加。updatedAt を更新 |
| 事後条件 | Reservation の dateTime / slotId / durationMinutes が更新され、履歴が追加される |
| ドメインイベント | ReservationModified |

備考: 旧スロット解放と新スロット確保の整合性（補償トランザクション）はアプリケーション層（Saga パターン）の責務とする（Q24 確定）。集約は状態遷移ルールのみを担当する。

#### cancel（予約キャンセル）

| 項目 | 内容 |
|------|------|
| 事前条件 | INV-1（status が confirmed であること）、INV-2（dateTime が未来であること） |
| 入力 | cancelledBy (ActorType) |
| 処理 | status を `cancelled` に更新。ReservationHistory（changeType = cancelled）を追加。updatedAt を更新 |
| 事後条件 | Reservation が `cancelled` 状態になり、履歴が追加される |
| ドメインイベント | ReservationCancelled |

#### complete（予約完了）

| 項目 | 内容 |
|------|------|
| 事前条件 | INV-1（status が confirmed であること） |
| 入力 | なし |
| 処理 | status を `completed` に更新。ReservationHistory（changeType = completed）を追加。updatedAt を更新 |
| 事後条件 | Reservation が `completed` 状態になり、履歴が追加される |
| ドメインイベント | なし（現時点では完了イベントの Consumer が存在しない） |

備考: 完了操作は過去日時制約（INV-2）の対象外。サービス提供完了後にオーナーが手動で完了にするユースケースのため。将来バッチ自動完了も拡張可能な設計とする（Q18 確定）。

---

### 二重予約防止の責務分担

二重予約防止（同一スロットに対する重複予約の禁止）は、Unit 4 の集約不変条件ではなく、Unit 3（スケジュール・空き枠管理）の責務として委譲する（Q22 確定）。

| 責務 | 担当 | 仕組み |
|------|------|--------|
| スロットの排他制御 | Unit 3 | `PUT /api/slots/{slotId}/reserve` が楽観的ロックで排他制御。競合時は 409 SLOT_ALREADY_BOOKED を返却 |
| 予約状態遷移 | Unit 4 | Unit 3 の reserve が成功した場合にのみ Reservation を作成 |
| 整合性の保証 | アプリケーション層 | Unit 3 reserve 成功後に Unit 4 の予約作成が失敗した場合、スロットの release を呼ぶ補償トランザクション（Saga） |

---

### 横断的関心事との関連

#### US-S06: 個人情報の適切な取り扱い

Reservation 集約内のスナップショット属性のうち、以下は個人情報に該当する。

| 属性 | 個人情報区分 | 対応方針 |
|------|-------------|---------|
| customerName | 氏名 | 暗号化保存の対象 |
| lineUserId | LINE ユーザーID | 暗号化保存の対象 |
| ownerLineUserId | LINE ユーザーID | 暗号化保存の対象 |

暗号化の実装はインフラストラクチャ層の責務とし、ドメインモデルは平文で扱う。リポジトリの実装において透過的に暗号化/復号化を行う。

#### US-S07: 二重予約防止の排他制御

上述の通り、Unit 3 の reserve API（楽観的ロック）に委譲する。
