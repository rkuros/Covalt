# Unit 5: 通知 -- 実装ブリーフ

## 1. コンポーネント一覧

### エンティティ

| エンティティ | 説明 |
|---|---|
| NotificationRecord | 送信済み通知の記録。通知種別・送信先・送信日時・送信結果を保持する |

### 値オブジェクト

| 値オブジェクト | 説明 |
|---|---|
| NotificationType | 通知種別の列挙（confirmation / modification / cancellation / reminder） |
| RecipientType | 受信者種別（customer / owner） |
| ReservationEvent | Unit 4 から受信するイベントペイロードを表す不変オブジェクト |
| NotificationMessage | 送信メッセージ本文を組み立てた結果を保持する不変オブジェクト |
| SendResult | 送信成功/失敗とメッセージ ID またはエラー種別を保持する |

### サービス

| サービス | 説明 |
|---|---|
| ReservationEventHandler | 予約イベント（created/modified/cancelled）を購読し、適切な通知処理を振り分ける |
| NotificationDispatcher | 受信者種別に応じて顧客向け・オーナー向けの通知をそれぞれ生成・送信する |
| NotificationTemplateResolver | 通知種別と受信者種別からテンプレートを選択し、イベントペイロードのフィールドを埋め込んでメッセージ本文を生成する |
| ReminderScheduler | 予約日の前日にリマインダー通知を発火するスケジューリングを管理する。予約作成時にスケジュール登録、キャンセル時にスケジュール削除を行う |
| LineMessageSender | Unit 2 Messaging API（`POST /api/line/messages/push`）を呼び出してメッセージを送信し、送信結果を返す |

---

## 2. 購読イベント

Unit 4（予約管理）が発行する 3 種類の非同期イベントを購読する（Pact: `unit5-unit4-reservation-events.pact.json`）。

### 2.1 reservation.created

| フィールド | 型 | 説明 |
|---|---|---|
| eventType | string | `"reservation.created"` 固定 |
| reservationId | string | 予約 ID |
| ownerId | string | オーナー ID |
| customerId | string | 顧客 ID |
| customerName | string | 顧客表示名 |
| lineUserId | string | 顧客の LINE ユーザー ID |
| ownerLineUserId | string | オーナーの LINE ユーザー ID |
| slotId | string | 予約スロット ID |
| dateTime | string (ISO 8601) | 予約日時 |
| timestamp | string (ISO 8601 UTC) | イベント発生日時 |

**処理内容**:
- 顧客向け: 予約確定通知を送信する
- オーナー向け: 新規予約通知を送信する
- リマインダー: 予約日の前日発火でスケジュールを登録する

### 2.2 reservation.modified

上記の共通フィールドに加え、以下が含まれる。

| 追加フィールド | 型 | 説明 |
|---|---|---|
| previousDateTime | string (ISO 8601) | 変更前の予約日時 |
| modifiedBy | string | 変更実行者（`"customer"` または `"owner"`） |

**処理内容**:
- 顧客向け: 予約変更通知を送信する（オーナーが変更した場合も含む）
- オーナー向け: 予約変更通知を送信する（顧客が変更した場合も含む）
- リマインダー: 既存スケジュールを削除し、新しい予約日時の前日で再登録する

### 2.3 reservation.cancelled

上記の共通フィールドに加え、以下が含まれる。

| 追加フィールド | 型 | 説明 |
|---|---|---|
| cancelledBy | string | キャンセル実行者（`"customer"` または `"owner"`） |

**処理内容**:
- 顧客向け: 予約キャンセル通知を送信する（オーナーがキャンセルした場合も含む）
- オーナー向け: 予約キャンセル通知を送信する（顧客がキャンセルした場合も含む）
- リマインダー: 登録済みのリマインダースケジュールを削除する

---

## 3. Consumer API 利用サマリ

Unit 2（LINE 連携基盤）の Messaging API を利用する（Pact: `unit5-unit2-messaging.pact.json`、連携定義 A9）。

### エンドポイント

`POST /api/line/messages/push`

### リクエスト

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| ownerId | string | Yes | メッセージ送信元のオーナー ID（LINE 公式アカウントの特定に使用） |
| lineUserId | string | Yes | 送信先の LINE ユーザー ID（形式: `U` + 32桁の hex） |
| messages | array | Yes | メッセージオブジェクトの配列（1件以上） |
| messages[].type | string | Yes | メッセージ種別（`"text"` または `"flex"`） |
| messages[].text | string | Yes (text 時) | メッセージ本文 |

### 成功レスポンス (200)

```json
{
  "success": true,
  "messageId": "msg-001"
}
```

### エラーレスポンス: ブロック済みユーザー (422)

```json
{
  "success": false,
  "error": "USER_BLOCKED",
  "message": "ユーザーがアカウントをブロックしているため送信できません"
}
```

### 呼び出しパターン

1 つの予約イベントに対し、顧客向けとオーナー向けでそれぞれ個別にプッシュ送信を行う。したがって 1 イベントあたり最大 2 回の API 呼び出しが発生する。

---

## 4. 通知テンプレート

### 4.1 顧客向け通知

#### 予約確定通知（US-C10 / Must）

| フィールド | 取得元 |
|---|---|
| 予約 ID | `reservationId` |
| 予約日時 | `dateTime` |

#### 予約変更通知（US-C11 / Should）

| フィールド | 取得元 |
|---|---|
| 予約 ID | `reservationId` |
| 変更前の日時 | `previousDateTime` |
| 変更後の日時 | `dateTime` |

#### 予約キャンセル通知（US-C12 / Should）

| フィールド | 取得元 |
|---|---|
| 予約 ID | `reservationId` |
| キャンセルされた予約の日時 | `dateTime` |

#### リマインダー通知（US-C13 / Could）

| フィールド | 取得元 |
|---|---|
| 予約 ID | `reservationId` |
| 予約日時 | `dateTime` |

### 4.2 オーナー向け通知

#### 新規予約通知（US-O12 / Must）

| フィールド | 取得元 |
|---|---|
| 予約日時 | `dateTime` |
| 顧客名 | `customerName` |

#### 予約変更通知（US-O13 / Should）

| フィールド | 取得元 |
|---|---|
| 予約日時（変更後） | `dateTime` |
| 変更前の日時 | `previousDateTime` |
| 顧客名 | `customerName` |

#### 予約キャンセル通知（US-O13 / Should）

| フィールド | 取得元 |
|---|---|
| キャンセルされた予約の日時 | `dateTime` |
| 顧客名 | `customerName` |

---

## 5. ビジネスルール

| # | ルール | 根拠 |
|---|---|---|
| BR-1 | キャンセル済み予約にはリマインダーを送信しない | US-C13 AC 3 |
| BR-2 | `reservation.cancelled` 受信時に登録済みリマインダースケジュールを削除する | BR-1 の実現手段 |
| BR-3 | `reservation.modified` 受信時にリマインダースケジュールを新しい日時で再登録する | 変更後の日時でリマインドするため |
| BR-4 | リマインダーは予約日の前日に送信する | US-C13 AC 1 |
| BR-5 | オーナー側からの予約変更・キャンセル時にも顧客へ通知する | US-C11 AC 3, US-C12 AC 3 |
| BR-6 | 顧客側からの予約変更・キャンセル時にもオーナーへ通知する | US-O13 AC 1, AC 2 |
| BR-7 | 送信先ユーザーがブロック済み（`USER_BLOCKED`）の場合、エラーを記録し処理を正常終了とする（リトライしない） | ブロック状態はユーザー操作であり再試行しても解消しないため |
| BR-8 | 一時的な送信失敗（ネットワークエラー等）にはリトライ処理を行う | US-S07（可用性） |

---

## 6. 横断的関心事

以下は `cross_cutting_security.md` に定義された横断的要件の Unit 5 における適用方針である。

### 個人情報保護（US-S06）

- 通知ログに `lineUserId` や `customerName` を保存する場合は暗号化する
- Unit 2 Messaging API への通信は HTTPS で行う
- `ownerId` に基づくスコープ制御を徹底し、他オーナーの顧客に対して通知が送信されないようにする（イベントペイロードに含まれる `ownerId` を API 呼び出し時に引き渡す）

### 可用性（US-S07）

- イベント購読の処理が失敗した場合、リトライ処理を行う（メッセージブローカーの再配信機能を活用する）
- ただし `USER_BLOCKED` エラーはリトライ対象外とする（BR-7）
- 通知送信失敗がイベント処理全体を阻害しないよう、顧客向けとオーナー向けの送信は互いに独立して処理する
- システムエラー発生時のオーナー通知については、通知ユニット自体のエラーが対象となるため、外部監視・アラートで対応する

---

## 7. 依存関係

### 上流（Unit 5 が依存するもの）

| 依存先 | 連携種別 | 連携 ID | 説明 |
|---|---|---|---|
| Unit 4 -- 予約管理 | 非同期イベント | E1, E2, E3 | 予約イベント（created/modified/cancelled）の発行。Unit 5 はこれを購読して通知処理を起動する |
| Unit 2 -- LINE 連携基盤 | 同期 API | A9 | `POST /api/line/messages/push` によるプッシュメッセージ送信 |

### 下流（Unit 5 に依存するもの）

なし。Unit 5 は末端の Consumer であり、他ユニットから呼び出されることはない。

### 間接依存（認識しておくべきもの）

| 対象 | 説明 |
|---|---|
| メッセージブローカー | イベント配信基盤。選定は Elaboration フェーズで決定する（integration_definition.md 備考） |
| LINE Messaging API | Unit 2 が内部的に利用する外部 API。Unit 5 は直接依存しないが、LINE プラットフォーム側の制約（レート制限等）の影響を受ける |
