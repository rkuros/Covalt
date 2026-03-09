# Covalt

LINE連携型 予約管理SaaS

サロン・クリニック等の個人事業主（オーナー）向けに、LINE経由の顧客予約受付と管理機能を提供する。

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
            U3B["/api/schedule/*<br/>business-hours, closed-days<br/>slots/generate, templates"]
        end

        subgraph U4["Unit4: 予約管理"]
            U4C["/api/reservations<br/>顧客向け CRUD"]
            U4O["/api/owner/reservations<br/>オーナー向け CRUD"]
        end

        subgraph U5["Unit5: 通知"]
            U5A["LINE通知送信<br/>リマインダー管理"]
        end

        subgraph U6["Unit6: 顧客情報管理"]
            U6A["/api/customers/*<br/>CRUD, search, notes, attachments"]
        end

        subgraph U7["Unit7: Googleカレンダー"]
            U7A["/api/calendar/*<br/>connect, disconnect<br/>calendars, select"]
        end
    end

    subgraph DB["データベース"]
        PG[("Neon PostgreSQL<br/>22テーブル")]
    end

    subgraph External["外部サービス"]
        LINE["LINE Messaging API"]
        GCAL["Google Calendar API"]
        S3["AWS S3<br/>(顧客データ)"]
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
    U6 -.->|presigned URL| S3
    U7 -.->|HTTP| GCAL
```

### ユニット間連携

```mermaid
graph LR
    subgraph "同期通信 (Direct Gateway)"
        U4["Unit4: 予約"] -->|SlotGateway| U3["Unit3: スケジュール"]
        U4 -->|CustomerGateway| U6["Unit6: 顧客"]
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

### AWSデプロイ構成

```mermaid
graph TB
    User["ユーザー"] --> CF["CloudFront<br/>(静的サイト + Basic認証)"]
    User --> APIGW["API Gateway<br/>(HTTP API)"]

    CF --> S3Static["S3<br/>(mock.html, liff.html)"]
    APIGW --> Lambda["Lambda<br/>(NestJS)"]
    Lambda --> Neon[("Neon PostgreSQL")]
    Lambda --> S3Data["S3<br/>(顧客データ)"]
    Lambda -.-> LINE["LINE API"]
    Lambda -.-> GCAL["Google Calendar API"]

    Cron["EventBridge<br/>(1時間毎)"] --> Reminder["Lambda<br/>(リマインダー)"]
    Reminder --> Neon
```

**インフラ:**
- API Lambda: `dist/src/lambda.ts` — NestJSを `@codegenie/serverless-express` でラップ
- Reminder Lambda: `dist/src/reminder-handler.ts` — 1時間毎のCronでリマインダー送信
- CloudFront: `liff.html` は認証なし（LINE LIFF用）、`mock.html` はBasic認証付き
- DB: Neon PostgreSQL（サーバレス）

## プロジェクト構造

```
Covalt/
├── app/                          # NestJSバックエンド
│   ├── src/
│   │   ├── common/               # 共通モジュール
│   │   │   ├── crypto/           #   暗号化サービス (AES-256)
│   │   │   ├── guards/           #   認証ガード
│   │   │   └── prisma/           #   Prismaサービス
│   │   ├── unit1-auth/           # 認証・アカウント管理
│   │   ├── unit2-line/           # LINE連携基盤
│   │   ├── unit3-schedule/       # スケジュール・空き枠管理
│   │   ├── unit4-reservation/    # 予約管理
│   │   ├── unit5-notification/   # 通知・リマインダー
│   │   ├── unit6-customer/       # 顧客情報管理
│   │   ├── unit7-calendar/       # Googleカレンダー連携
│   │   ├── lambda.ts             # Lambda エントリポイント
│   │   ├── reminder-handler.ts   # リマインダーLambda
│   │   └── main.ts              # ローカル開発エントリポイント
│   ├── prisma/
│   │   ├── schema.prisma         # DBスキーマ定義
│   │   └── migrations/           # マイグレーション
│   └── package.json
├── static/                       # フロントエンド（静的HTML）
│   ├── mock.html                 # オーナー管理画面 (Tailwind CSS)
│   └── liff.html                 # 顧客用LINE LIFFアプリ
├── template.yaml                 # AWS SAMテンプレート
└── samconfig.toml                # SAMデプロイ設定
```

### 各ユニットの内部構造（DDDパターン）

```
unit{N}-{name}/
├── controllers/          # REST APIエンドポイント（HTTPの関心のみ）
├── domain/               # ドメインモデル・サービス・Repository IF・Value Object
│   ├── {Entity}.ts       #   集約ルート / エンティティ
│   ├── {ValueObject}.ts  #   値オブジェクト（OwnerId, SlotDate等）
│   ├── {Service}.ts      #   ドメインサービス
│   ├── {Repository}.ts   #   リポジトリインターフェース
│   └── InMemory*.ts      #   テスト用InMemory実装
├── gateways/             # 外部サービス・ユニット間アダプタ
├── repositories/         # Prisma永続化実装
├── handlers/             # イベントハンドラー（非同期）
└── unit{N}-{name}.module.ts  # NestJS DI設定
```

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | NestJS 11 |
| 言語 | TypeScript 5 (strict) |
| ORM | Prisma 7 |
| DB | PostgreSQL (Neon) |
| イベント | @nestjs/event-emitter (EventEmitter2) |
| アーキテクチャ | DDD（ドメイン駆動設計）/ ヘキサゴナル |
| 設計パターン | Aggregate, Value Object, Repository, Gateway |
| インフラ | AWS SAM (Lambda + API Gateway + S3 + CloudFront) |
| フロントエンド | 単一HTML + Tailwind CSS（フレームワーク不使用） |

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
| 3 | GET | `/api/slots/available` | - | 空き枠取得（公開） |
| 3 | PUT | `/api/slots/:id/reserve` | Bearer | 枠予約 |
| 3 | PUT | `/api/slots/:id/release` | Bearer | 枠解放 |
| 3 | GET/PUT | `/api/schedule/business-hours` | Bearer | 営業時間管理 |
| 3 | CRUD | `/api/schedule/closed-days` | Bearer | 休業日管理 |
| 3 | POST | `/api/schedule/slots/generate` | Bearer | 枠自動生成 |
| 3 | CRUD | `/api/schedule/templates` | Bearer | スロットテンプレート |
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
| 6 | POST | `/api/customers` | Bearer | 顧客登録 |
| 6 | GET | `/api/customers/:id` | Bearer | 顧客詳細 |
| 6 | GET | `/api/customers/search` | Bearer | 顧客検索 |
| 6 | PUT | `/api/customers/:id` | Bearer | 顧客更新 |
| 6 | * | `/api/customers/:id/notes` | Bearer | 顧客ノートCRUD |
| 6 | * | `/api/customers/:id/attachments` | Bearer | 顧客添付ファイルCRUD |
| 7 | POST | `/api/calendar/connect` | Bearer | OAuth開始 |
| 7 | POST | `/api/calendar/callback` | - | OAuthコールバック |
| 7 | GET | `/api/calendar/status` | Bearer | 連携状態確認 |
| 7 | GET | `/api/calendar/calendars` | Bearer | カレンダー一覧 |
| 7 | PUT | `/api/calendar/select` | Bearer | カレンダー選択 |
| 7 | DELETE | `/api/calendar/disconnect` | Bearer | 連携解除 |

## セットアップ

```bash
cd app

# 依存関係インストール
npm install

# Prismaクライアント生成
npx prisma generate

# DBマイグレーション
npx prisma migrate dev

# 開発サーバー起動
npm run start:dev
```

## デプロイ

```bash
# ビルド＆デプロイ（Lambda + API Gateway）
sam build && sam deploy

# 静的ファイルアップロード（S3 + CloudFrontキャッシュ無効化）
aws s3 sync static/ s3://covalt-staticsitebucket-h30ycubraluf/ --delete
aws cloudfront create-invalidation --distribution-id E51S7M9SMQKZ0 --paths "/*"
```

## 環境変数

```env
DATABASE_URL="postgresql://user:password@host:5432/covalt?schema=public"
PORT=3000
ENCRYPTION_KEY="64文字の16進数（AES-256用）"
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://api-url/api/calendar/callback
CUSTOMER_DATA_BUCKET=covalt-customerdatabucket-xxx
```

## DI（依存性注入）パターン

各ユニットはNestJSモジュールでDI設定を行う。リポジトリ・ゲートウェイは文字列トークンで注入:

```typescript
// モジュールでの登録例
providers: [
  { provide: 'OwnerAccountRepository', useClass: PrismaOwnerAccountRepository },
  { provide: 'SlotGateway', useClass: DirectSlotGateway },
]

// サービスでの注入例
constructor(
  @Inject('OwnerAccountRepository') private readonly repo: OwnerAccountRepository,
)
```

Unit4（予約）はDirect Gatewayパターンでユニット間通信を行う（HTTP経由ではなくプロセス内直接呼び出し）。
