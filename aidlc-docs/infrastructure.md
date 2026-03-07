# Covalt インフラ構成ドキュメント

## アーキテクチャ概要

```
[クライアント]
    │
    ▼
API Gateway HTTP API ($default stage)
    │
    ▼
Lambda (NestJS 11 + Express)  ──TCP/SSL──▶  Neon PostgreSQL (ap-southeast-1)
    │
EventBridge Scheduler (毎時)
    │
    ▼
Lambda (リマインダー cron)     ──TCP/SSL──▶  Neon PostgreSQL
```

## コスト構成

| コンポーネント | サービス | 月額目安 |
|---|---|---|
| API | API Gateway HTTP API | $0 (100万req/月 無料枠) |
| Compute | Lambda x2 | $0 (100万req/月 無料枠) |
| DB | Neon PostgreSQL Free Tier | $0 (0.5GiB, auto-suspend) |
| Cron | EventBridge Scheduler | $0 |
| **合計** | | **$0/月** (当面) |

### Neon Free Tier 上限

- ストレージ: 0.5 GiB
- Compute: 191.9 時間/月 (共有 0.25 vCPU)
- 自動サスペンド: 5分無操作で停止
- プロジェクト: 1
- ブランチ: 10

### Free Tier 超過見込み

- 予約1件 = 約1KB (関連テーブル含む)
- 50万件程度で 0.5GiB に到達
- リクエスト少量なら **数年間 Free Tier 内で運用可能**
- 超過時: Launch プラン $19/月 (10GiB, 300h)

## データベース設計判断

### Neon を選定した理由

1. **コード変更が最小**: Prisma + PostgreSQL のまま接続文字列を変えるだけ
2. **月額 $0**: Free Tier で当面運用可能
3. **RDS 移行が容易**: 同じ PostgreSQL なので `pg_dump/pg_restore` + 接続文字列変更のみ
4. **DynamoDB 案を棄却**: 17テーブルのリレーショナル設計を書き直す工数に見合わない
5. **S3 案を棄却**: トランザクション/クエリが不可能で予約システムに不向き

### Neon は AWS 外の SaaS

- Neon社が AWS インフラ上で運用するマネージドサービス
- ユーザーの AWS アカウントには何もデプロイされない (EC2 課金なし)
- Lambda → Neon へは通常の TCP/SSL 接続

### Branch 設計

| Branch | 用途 | 状態 |
|---|---|---|
| production (Default) | 本番 (Lambda から接続) | 作成済み |
| dev | 開発・テスト用 | 必要時に作成 |

- **現時点では production 1本で運用**
- ローカル開発は Docker PostgreSQL を使用
- Branch は git のように Copy-on-Write でコピー可能 (追加容量ゼロ)
- 本番データでテストしたい場合に dev branch を作成

### Database 設計

- Database 名: `neondb` (デフォルト)
- Schema: `public` (Prisma デフォルト)
- テーブル数: 17 (Prisma migrate で管理)
- 単一アプリなので DB/Schema 分割は不要

### Connection Pooling

| 用途 | Pooling | URL 種別 |
|---|---|---|
| Lambda (本番アプリ) | **ON** | `...-pooler.ap-southeast-1.aws.neon.tech...` |
| Prisma migrate | **OFF** | `...ap-southeast-1.aws.neon.tech...` (直接接続) |

- Lambda は毎回新しい接続を張るため pooler 経由が必須
- マイグレーションは直接接続が必要 (Advisory Lock を使用するため)

### PostgreSQL バージョン

- **PostgreSQL 17** を選択
- Prisma 7 / @prisma/adapter-pg と互換性あり

### リージョン

- **ap-southeast-1 (Singapore)**
- 東京リージョンが Neon 未提供のため最寄りを選択
- Lambda (ap-northeast-1 想定) との間のレイテンシ: 約50-70ms
- 低トラフィックシステムなので実用上問題なし

## RDS への移行パス

Neon から AWS RDS に移行する場合:

```bash
# 1. データ移行
pg_dump "${NEON_URL}" --format=custom --no-owner > covalt.dump
pg_restore --no-owner -d "${RDS_URL}" covalt.dump

# 2. 接続文字列変更 (sam deploy のパラメータを更新)
sam deploy --parameter-overrides DatabaseUrl="${RDS_URL}" ...

# 3. アプリコード変更: なし
```

追加対応:
- Lambda に VpcConfig を追加 (RDS は VPC 内)
- RDS 最小構成: db.t4g.micro で約 $13/月

## セキュリティ

### PII 暗号化

- AES-256-GCM で顧客名・表示名を暗号化してDB保存
- `ENCRYPTION_KEY` 環境変数 (64文字 hex = 32バイト)
- 暗号化対象: `customerName`, `displayName`

### 認証

- セッショントークン方式 (Bearer Token)
- パスワード: SHA-256 ハッシュ (本番では bcrypt に要置換)
- 内部サービス間通信: `X-Internal-Key` ヘッダー

### 環境変数 (本番)

| 変数名 | 説明 | 設定方法 |
|---|---|---|
| DATABASE_URL | Neon 接続文字列 (pooler) | SAM パラメータ |
| ENCRYPTION_KEY | AES-256 暗号化キー | SAM パラメータ |
| LINE_API_BASE_URL | LINE API URL | template.yaml にハードコード |
| INTERNAL_SERVICE_KEY | 内部通信キー | デフォルト値あり、本番では変更推奨 |

## デプロイ

### SAM テンプレート構成

```
template.yaml
├── ApiFunction        (Lambda - NestJS API handler)
├── ReminderFunction   (Lambda - EventBridge cron handler)
├── HttpApi            (API Gateway HTTP API)
└── Parameters
    ├── DatabaseUrl    (NoEcho)
    └── EncryptionKey  (NoEcho)
```

### デプロイ手順

```bash
# ビルド & デプロイ
sam build && sam deploy \
  --parameter-overrides \
    DatabaseUrl="postgresql://..." \
    EncryptionKey="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# Neon にマイグレーション適用 (直接接続 URL を使用)
DATABASE_URL="postgresql://...直接接続..." npx prisma migrate deploy
```

## 技術スタック

| レイヤー | 技術 |
|---|---|
| Runtime | Node.js 22 |
| Framework | NestJS 11 |
| ORM | Prisma 7 (prisma-client-js + adapter-pg) |
| DB | PostgreSQL 17 (Neon) |
| API | API Gateway HTTP API |
| Compute | Lambda |
| Cron | EventBridge Scheduler |
| IaC | AWS SAM |

---

*最終更新: 2026-03-07*
