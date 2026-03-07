# Unit 4 予約管理 - ドメインサービス定義

## 概要

Unit 4（予約管理）の境界づけられたコンテキストにおけるドメインサービスを定義する。
ドメインサービスは、単一の集約に属さないドメインロジックを表現するために使用する。

本ユニットでは、予約の作成・変更・キャンセルのコアロジックを Reservation 集約ルートの操作として定義しているため、ドメインサービスはそれらの操作を複数の外部コンテキスト（Unit 3 スロット、Unit 6 顧客）との連携を含めてオーケストレーションする役割を担う。

---

## 1. ReservationCommandService（予約コマンドサービス）

予約の作成・変更・キャンセル・完了の各コマンド操作において、集約の状態遷移に加えて外部コンテキストとの連携やドメインイベントの発行を含む一連のドメインロジックを提供する。

顧客操作（LIFF 経由）とオーナー操作（Web 管理画面経由）を1つのサービスに統合し、ActorType（customer / owner）で分岐する（Q23 確定）。

### 1-1. createReservation（予約作成）

予約の新規作成を行う。顧客操作とオーナー操作の両方に対応する。

#### 責務

1. 操作者の識別（ActorType の決定）
2. 顧客情報の取得（スナップショット用）
3. スロット情報の取得（dateTime, durationMinutes のスナップショット用）
4. Reservation 集約の生成（create 操作）
5. ドメインイベント（ReservationCreated）の発行

#### 処理フロー

**顧客操作時（ActorType = customer）:**

```
1. [CustomerGateway] LINE ユーザーIDで顧客情報を取得
     - GET /api/customers/by-line-user?ownerId={ownerId}&lineUserId={lineUserId}
2. [SlotGateway] スロット情報を取得（dateTime, durationMinutes の確認）
3. [SlotGateway] スロットを予約確保
     - PUT /api/slots/{slotId}/reserve（409 の場合はエラー）
4. ReservationId を生成（UUID v4）
5. Reservation.create() で集約を生成
6. [ReservationRepository] 予約を永続化
7. [EventPublisher] ReservationCreated イベントを発行
```

**オーナー操作時（ActorType = owner）:**

```
1. [CustomerGateway] 顧客情報を取得
     - 既存顧客選択の場合: GET /api/customers/{customerId}
     - 新規顧客の場合: POST /api/customers（Unit 6 に委譲、Q15 確定）
2. [SlotGateway] スロット情報を取得（dateTime, durationMinutes の確認）
3. [SlotGateway] スロットを予約確保
     - PUT /api/slots/{slotId}/reserve（409 の場合はエラー）
4. ReservationId を生成（UUID v4）
5. Reservation.create() で集約を生成
6. [ReservationRepository] 予約を永続化
7. [EventPublisher] ReservationCreated イベントを発行
```

#### 補償トランザクション

スロット確保成功後に予約永続化が失敗した場合、スロットの release を呼ぶ補償処理が必要。この補償トランザクション（Saga パターン）はアプリケーション層の責務とする（Q24 確定）。ドメインサービスは正常系のオーケストレーションのみを担当する。

### 1-2. modifyReservation（予約変更）

予約の日時変更を行う。

#### 責務

1. 対象予約の取得と存在確認
2. Reservation 集約の modify 操作（不変条件の検証を含む）
3. ドメインイベント（ReservationModified）の発行

#### 処理フロー

```
1. [ReservationRepository] 対象予約を取得
2. [SlotGateway] 新スロットの情報を取得（dateTime, durationMinutes）
3. [SlotGateway] 旧スロットを解放
     - PUT /api/slots/{oldSlotId}/release
4. [SlotGateway] 新スロットを予約確保
     - PUT /api/slots/{newSlotId}/reserve（409 の場合はエラー）
5. Reservation.modify() で集約を更新（不変条件の検証 + 履歴追加）
6. [ReservationRepository] 予約を永続化
7. [EventPublisher] ReservationModified イベントを発行
```

#### 補償トランザクション

旧スロット解放後に新スロット確保が失敗した場合、旧スロットの再確保が必要。この補償処理はアプリケーション層（Saga）の責務とする（Q24 確定）。

#### アクセス制御

- 顧客操作時: 自分の予約のみ変更可能（customerId の一致を検証）
- オーナー操作時: 自分のオーナーIDに属する全予約を変更可能（ownerId の一致を検証）

### 1-3. cancelReservation（予約キャンセル）

予約のキャンセルを行う。

#### 責務

1. 対象予約の取得と存在確認
2. Reservation 集約の cancel 操作（不変条件の検証を含む）
3. スロットの解放
4. ドメインイベント（ReservationCancelled）の発行

#### 処理フロー

```
1. [ReservationRepository] 対象予約を取得
2. Reservation.cancel() で集約を更新（不変条件の検証 + 履歴追加）
3. [SlotGateway] スロットを解放
     - PUT /api/slots/{slotId}/release
4. [ReservationRepository] 予約を永続化
5. [EventPublisher] ReservationCancelled イベントを発行
```

#### アクセス制御

- 顧客操作時: 自分の予約のみキャンセル可能（customerId の一致を検証）
- オーナー操作時: 自分のオーナーIDに属する全予約をキャンセル可能（ownerId の一致を検証）

### 1-4. completeReservation（予約完了）

予約を完了状態に遷移させる。

#### 責務

1. 対象予約の取得と存在確認
2. Reservation 集約の complete 操作（不変条件の検証を含む）

#### 処理フロー

```
1. [ReservationRepository] 対象予約を取得
2. Reservation.complete() で集約を更新（不変条件の検証 + 履歴追加）
3. [ReservationRepository] 予約を永続化
```

#### 備考

- 操作者はオーナーのみ（Q18 確定）
- 将来的にバッチ自動完了にも対応可能な設計とする。バッチ処理がこのサービスを呼ぶ形で拡張できる
- 現時点では完了イベントの Consumer が存在しないため、ドメインイベントは発行しない。将来 Consumer が追加された場合はイベント発行を追加する

---

## ドメインサービスの対象外（アプリケーション層の責務）

以下の操作はドメインロジックを含まないため、ドメインサービスではなくアプリケーション層のユースケースとして実装する。

### 空き状況照会（Q25 確定）

- Unit 3 の `GET /api/slots/available` を中継するだけで、Unit 4 固有のドメインロジックは不要
- SlotGateway 経由で Unit 3 API を呼び出し、結果をそのまま返却する
- 対応ストーリー: US-C04

### 予約一覧・履歴照会（Q26 確定）

- ReservationRepository の検索メソッドを呼び出す単純な読み取り操作
- フィルタリング条件（ステータス、日付範囲）はリポジトリのメソッドパラメータとして渡す
- 対応ストーリー: US-C08, US-C09, US-O01, US-O02

### 顧客検索（手動予約時）

- Unit 6 の `GET /api/customers/search` を中継する操作
- CustomerGateway 経由で Unit 6 API を呼び出し、結果を返却する
- 対応ストーリー: US-O03 の顧客選択部分

---

## ドメインサービスとユーザーストーリーの対応

| ユーザーストーリー | ドメインサービス操作 | 備考 |
|------------------|---------------------|------|
| US-C04: 空き状況の確認 | (対象外) | アプリケーション層で SlotGateway を利用 |
| US-C05: 予約の新規作成 | createReservation (customer) | |
| US-C06: 予約の変更 | modifyReservation (customer) | |
| US-C07: 予約のキャンセル | cancelReservation (customer) | |
| US-C08: 予約一覧の確認 | (対象外) | アプリケーション層で Repository を利用 |
| US-C09: 予約履歴の確認 | (対象外) | アプリケーション層で Repository を利用 |
| US-O01: 予約一覧の表示 | (対象外) | アプリケーション層で Repository を利用 |
| US-O02: 予約の詳細確認 | (対象外) | アプリケーション層で Repository を利用 |
| US-O03: 予約の手動作成 | createReservation (owner) | 新規顧客作成は CustomerGateway 経由 |
| US-O04: 予約の変更 | modifyReservation (owner) | |
| US-O05: 予約のキャンセル | cancelReservation (owner) | |
