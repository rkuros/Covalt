# Covalt

LINE連携型 予約管理システム

## システム構成

### 全体アーキテクチャ

```mermaid
graph TB
    subgraph Clients["クライアント"]
        LIFF["LIFF App<br/>(LINE内ブラウザ)"]
        Web["Owner Web<br/>(管理画面)"]
    end

    LIFF -->|LIFF Token| U4C
    Web -->|Bearer Token| U1
    Web -->|Bearer Token| U3
    Web -->|Bearer Token| U4O
    Web -->|Bearer Token| U6
    Web -->|Bearer Token| U7

    subgraph NestJS["NestJS Application :3000"]
        subgraph U1["Unit1: 認証・アカウント管理"]
            U1A["/api/auth/*<br/>login, verify, logout<br/>password-reset"]
            U1B["/api/admin/accounts<br/>アカウント管理"]
        end

        subgraph U2["Unit2: LINE連携基盤"]
            U2A["/api/line/*<br/>liff/verify, webhook<br/>messages/push, channel-config"]
        end

        subgraph U3["Unit3: スケジュール・空き枠"]
            U3A["/api/slots/*<br/>available, reserve, release"]
            U3B["/api/schedule/*<br/>business-hours, closed-days<br/>slots/generate"]
        end

        subgraph U4["Unit4: 予約管理"]
            U4C["/api/reservations<br/>顧客向け CRUD"]
            U4O["/api/owner/reservations<br/>オーナー向け CRUD"]
        end

        subgraph U5["Unit5: 通知"]
            U5A["LINE通知送信<br/>リマインダー管理"]
        end

        subgraph U6["Unit6: 顧客情報管理"]
            U6A["/api/customers/*<br/>CRUD, search"]
        end

        subgraph U7["Unit7: Googleカレンダー"]
            U7A["/api/calendar/*<br/>connect, disconnect<br/>calendars, select"]
        end
    end

    subgraph DB["データベース"]
        PG[("PostgreSQL<br/>17テーブル")]
    end

    subgraph External["外部サービス"]
        LINE["LINE Messaging API"]
        GCAL["Google Calendar API"]
    end

    U1 --> PG
    U2 --> PG
    U3 --> PG
    U4 --> PG
    U5 --> PG
    U6 --> PG
    U7 --> PG

    U2 -.->|HTTP| LINE
    U5 -.->|HTTP via Unit2| LINE
    U7 -.->|HTTP| GCAL
```

### ユニット間連携

```mermaid
graph LR
    subgraph "同期通信 (HTTP Gateway)"
        U4["Unit4: 予約"] -->|SlotGateway| U3["Unit3: スケジュール"]
        U4 -->|CustomerGateway| U6["Unit6: 顧客"]
        U4 -->|AuthGateway| U1["Unit1: 認証"]
        U4 -->|LiffGateway| U2["Unit2: LINE"]
        U5["Unit5: 通知"] -->|LineMessageSender| U2
    end
```

```mermaid
graph LR
    subgraph "非同期通信 (EventEmitter2)"
        U2["Unit2: LINE"] -- "line.friend_added" --> U6["Unit6: 顧客<br/>自動登録"]
        U4["Unit4: 予約"] -- "reservation.created" --> U5["Unit5: 通知"]
        U4 -- "reservation.created" --> U7["Unit7: カレンダー"]
        U4 -- "reservation.modified" --> U5
        U4 -- "reservation.modified" --> U7
        U4 -- "reservation.cancelled" --> U5
        U4 -- "reservation.cancelled" --> U7
    end
```

### データベース ER図

```mermaid
erDiagram
    owner_accounts ||--o{ sessions : "has"
    owner_accounts ||--o{ password_reset_tokens : "has"
    owner_accounts ||--o{ business_hours : "has"
    owner_accounts ||--o{ closed_days : "has"
    owner_accounts ||--o{ daily_slot_lists : "has"
    owner_accounts ||--o{ reservations : "has"
    owner_accounts ||--o{ customers : "has"
    owner_accounts ||--o| google_calendar_integrations : "has"
    daily_slot_lists ||--o{ slots : "contains"
    reservations ||--o{ reservation_histories : "has"
    customers ||--o{ reservations : "books"

    owner_accounts {
        uuid owner_id PK
        string email UK
        string password_hash
        string role
        string status
    }
    admin_accounts {
        uuid admin_id PK
        string email UK
        string password_hash
        string role
    }
    sessions {
        uuid session_id PK
        uuid owner_id FK
        string token UK
        datetime expires_at
    }
    password_reset_tokens {
        uuid token_id PK
        uuid owner_id FK
        string token UK
        datetime expires_at
    }
    line_channel_configs {
        uuid owner_id PK
        string channel_access_token
        string channel_secret
        string liff_id
        boolean is_active
    }
    line_friendships {
        uuid id PK
        string owner_id
        string line_user_id
        string status
    }
    business_hours {
        uuid business_hour_id PK
        uuid owner_id FK
        string day_of_week
        string start_time
        string end_time
        boolean is_business_day
    }
    closed_days {
        uuid closed_day_id PK
        uuid owner_id FK
        string date
        string reason
    }
    daily_slot_lists {
        uuid daily_slot_list_id PK
        uuid owner_id FK
        string date
        int version
    }
    slots {
        uuid slot_id PK
        uuid daily_slot_list_id FK
        string start_time
        string end_time
        int duration_minutes
        string status
    }
    reservations {
        uuid reservation_id PK
        uuid owner_id FK
        uuid customer_id FK
        uuid slot_id
        string date_time
        int duration_minutes
        string status
    }
    reservation_histories {
        uuid history_id PK
        uuid reservation_id FK
        string change_type
        string changed_by
    }
    customers {
        uuid customer_id PK
        uuid owner_id FK
        string customer_name
        string line_user_id
        boolean is_line_linked
    }
    notification_records {
        uuid notification_id PK
        uuid reservation_id
        string notification_type
        boolean success
    }
    reminder_schedules {
        uuid reminder_id PK
        uuid reservation_id UK
        datetime scheduled_at
        boolean is_active
    }
    google_calendar_integrations {
        uuid owner_id PK_FK
        string access_token
        string refresh_token
        string calendar_id
        string status
    }
    calendar_event_mappings {
        uuid id PK
        string owner_id
        string reservation_id
        string google_event_id
        boolean is_active
    }
```

### AWS デプロイ構成

```mermaid
graph TB
    User["ユーザー"] --> R53["Route 53<br/>(DNS)"]
    R53 --> ALB["ALB<br/>(HTTPS:443)"]

    subgraph VPC["VPC"]
        subgraph Public["Public Subnet"]
            ALB
        end

        subgraph Private["Private Subnet"]
            ECS["ECS Fargate<br/>NestJS :3000"]
            RDS[("RDS PostgreSQL")]
        end
    end

    ALB --> ECS
    ECS --> RDS
    ECS -.-> LINE["LINE<br/>Messaging API"]
    ECS -.-> GCAL["Google<br/>Calendar API"]
```

## API エンドポイント

| Unit | メソッド | エンドポイント | 認証 | 説明 |
|------|---------|-------------|------|------|
| 1 | POST | `/api/auth/login` | - | ログイン |
| 1 | POST | `/api/auth/verify` | Bearer | トークン検証 |
| 1 | POST | `/api/auth/logout` | Bearer | ログアウト |
| 1 | POST | `/api/auth/password-reset/request` | - | パスワードリセット要求 |
| 1 | POST | `/api/auth/password-reset/confirm` | - | パスワードリセット確定 |
| 1 | POST | `/api/admin/accounts` | Bearer(admin) | オーナーアカウント作成 |
| 1 | GET | `/api/admin/accounts` | Bearer(admin) | アカウント一覧 |
| 1 | PATCH | `/api/admin/accounts/:id/status` | Bearer(admin) | ステータス変更 |
| 2 | POST | `/api/line/liff/verify` | - | LIFFトークン検証 |
| 2 | POST | `/api/line/webhook` | - | Webhook受信 |
| 2 | POST | `/api/line/messages/push` | - | メッセージ送信 |
| 2 | CRUD | `/api/line/channel-config` | Bearer | チャネル設定 |
| 3 | GET | `/api/slots/available` | Bearer | 空き枠取得 |
| 3 | PUT | `/api/slots/:id/reserve` | Bearer | 枠予約 |
| 3 | PUT | `/api/slots/:id/release` | Bearer | 枠解放 |
| 3 | GET/PUT | `/api/schedule/business-hours` | Bearer | 営業時間管理 |
| 3 | CRUD | `/api/schedule/closed-days` | Bearer | 休業日管理 |
| 3 | POST | `/api/schedule/slots/generate` | Bearer | 枠自動生成 |
| 4 | POST | `/api/reservations` | LIFF | 予約作成(顧客) |
| 4 | GET | `/api/reservations/upcoming` | LIFF | 今後の予約 |
| 4 | GET | `/api/reservations/history` | LIFF | 予約履歴 |
| 4 | PUT | `/api/reservations/:id/modify` | LIFF | 予約変更(顧客) |
| 4 | PUT | `/api/reservations/:id/cancel` | LIFF | 予約キャンセル(顧客) |
| 4 | POST | `/api/owner/reservations` | Bearer | 予約作成(オーナー) |
| 4 | GET | `/api/owner/reservations` | Bearer | 予約一覧(期間指定) |
| 4 | PUT | `/api/owner/reservations/:id/modify` | Bearer | 予約変更(オーナー) |
| 4 | PUT | `/api/owner/reservations/:id/cancel` | Bearer | 予約キャンセル(オーナー) |
| 4 | PUT | `/api/owner/reservations/:id/complete` | Bearer | 予約完了 |
| 6 | GET | `/api/customers` | Bearer | 顧客一覧 |
| 6 | POST | `/api/customers` | Bearer | 顧客登録 |
| 6 | GET | `/api/customers/:id` | Bearer | 顧客詳細 |
| 6 | GET | `/api/customers/search` | Bearer | 顧客検索 |
| 6 | PUT | `/api/customers/:id` | Bearer | 顧客更新 |
| 7 | POST | `/api/calendar/connect` | Bearer | OAuth開始 |
| 7 | POST | `/api/calendar/callback` | - | OAuthコールバック |
| 7 | GET | `/api/calendar/status` | Bearer | 連携状態確認 |
| 7 | GET | `/api/calendar/calendars` | Bearer | カレンダー一覧 |
| 7 | PUT | `/api/calendar/select` | Bearer | カレンダー選択 |
| 7 | DELETE | `/api/calendar/disconnect` | Bearer | 連携解除 |

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | NestJS 11 |
| 言語 | TypeScript 5 (ES2023, strict) |
| ORM | Prisma 7 |
| DB | PostgreSQL |
| イベント | @nestjs/event-emitter (EventEmitter2) |
| アーキテクチャ | DDD (ドメイン駆動設計) |
| 設計パターン | Aggregate, Value Object, Repository, Gateway |
| テスト | Vitest (ドメイン), Jest (E2E) |

## セットアップ

```bash
# 依存関係インストール
npm install

# Prismaクライアント生成
npx prisma generate

# DBマイグレーション
npx prisma migrate dev

# 開発サーバー起動
npm run start:dev
```

## 環境変数

```env
DATABASE_URL="postgresql://user:password@localhost:5432/covalt?schema=public"
PORT=3000
GOOGLE_CLIENT_ID=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
INTERNAL_API_BASE_URL=http://localhost:3000
```
