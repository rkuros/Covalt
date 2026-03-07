# ユニット間連携定義

## 連携一覧

### 同期 API（HTTP）

| # | Consumer | Provider | エンドポイント | 用途 | PACT |
|---|----------|----------|---------------|------|------|
| A1 | Unit 3,4,6,7 | Unit 1 | `POST /api/auth/verify` | 認証トークン検証 | [unit4-unit1-auth.pact.json](./unit4-unit1-auth.pact.json) |
| A2 | Unit 4 | Unit 2 | `POST /api/line/liff/verify` | LIFF アクセストークン検証 | [unit4-unit2-liff.pact.json](./unit4-unit2-liff.pact.json) |
| A3 | Unit 4 | Unit 3 | `GET /api/slots/available` | 空きスロット照会 | [unit4-unit3-slots.pact.json](./unit4-unit3-slots.pact.json) |
| A4 | Unit 4 | Unit 3 | `PUT /api/slots/{slotId}/reserve` | スロット予約確保 | 同上 |
| A5 | Unit 4 | Unit 3 | `PUT /api/slots/{slotId}/release` | スロット解放 | 同上 |
| A6 | Unit 4 | Unit 6 | `GET /api/customers/{customerId}` | 顧客情報取得 | [unit4-unit6-customer.pact.json](./unit4-unit6-customer.pact.json) |
| A7 | Unit 4 | Unit 6 | `GET /api/customers/by-line-user` | LINE ユーザーID で顧客検索 | 同上 |
| A8 | Unit 4 | Unit 6 | `GET /api/customers/search` | 顧客名検索（手動予約用） | 同上 |
| A9 | Unit 5 | Unit 2 | `POST /api/line/messages/push` | LINE プッシュメッセージ送信 | [unit5-unit2-messaging.pact.json](./unit5-unit2-messaging.pact.json) |

### 非同期イベント（Message）

| # | Consumer | Provider | イベント名 | 用途 | PACT |
|---|----------|----------|-----------|------|------|
| E1 | Unit 5 | Unit 4 | `reservation.created` | 予約確定通知トリガー | [unit5-unit4-reservation-events.pact.json](./unit5-unit4-reservation-events.pact.json) |
| E2 | Unit 5 | Unit 4 | `reservation.modified` | 予約変更通知トリガー | 同上 |
| E3 | Unit 5 | Unit 4 | `reservation.cancelled` | 予約キャンセル通知トリガー | 同上 |
| E4 | Unit 7 | Unit 4 | `reservation.created` | Google カレンダー予定追加 | [unit7-unit4-reservation-events.pact.json](./unit7-unit4-reservation-events.pact.json) |
| E5 | Unit 7 | Unit 4 | `reservation.modified` | Google カレンダー予定更新 | 同上 |
| E6 | Unit 7 | Unit 4 | `reservation.cancelled` | Google カレンダー予定削除 | 同上 |
| E7 | Unit 6 | Unit 2 | `line.friend_added` | 顧客自動登録トリガー | [unit6-unit2-line-webhook-events.pact.json](./unit6-unit2-line-webhook-events.pact.json) |

## 連携フロー図

```mermaid
flowchart LR
  classDef api fill:#1565c0,color:#fff,stroke:#0d47a1,stroke-width:2px
  classDef event fill:#c62828,color:#fff,stroke:#b71c1c,stroke-width:2px
  classDef unit fill:#f5f5f5,color:#212121,stroke:#616161,stroke-width:2px

  U1["Unit 1<br/>認証"]:::unit
  U2["Unit 2<br/>LINE連携"]:::unit
  U3["Unit 3<br/>スケジュール"]:::unit
  U4["Unit 4<br/>予約管理"]:::unit
  U5["Unit 5<br/>通知"]:::unit
  U6["Unit 6<br/>顧客"]:::unit
  U7["Unit 7<br/>Google Cal"]:::unit

  U4 -->|"A1: 認証検証"| U1
  U4 -->|"A2: LIFF検証"| U2
  U4 -->|"A3-A5: 空き枠"| U3
  U4 -->|"A6-A8: 顧客照会"| U6
  U5 -->|"A9: メッセージ送信"| U2

  U4 -.->|"E1-E3: 予約イベント"| U5
  U4 -.->|"E4-E6: 予約イベント"| U7
  U2 -.->|"E7: 友だち追加"| U6

  linkStyle 0,1,2,3,4 stroke:#1565c0,stroke-width:2px
  linkStyle 5,6,7 stroke:#c62828,stroke-width:2px,stroke-dasharray:6 4
```

**実線（青）**: 同期 API 呼び出し / **破線（赤）**: 非同期イベント

## 備考

- A1 の認証検証は Unit 3, 4, 6, 7 で共通。代表として Unit 4 の PACT を定義し、他ユニットも同一契約に準拠する。
- E1-E3 と E4-E6 は同一イベントの異なる Consumer。各 Consumer が必要とするフィールドを個別の PACT で定義する。
- イベントの配信基盤（メッセージブローカー）の選定は Elaboration フェーズで決定する。
