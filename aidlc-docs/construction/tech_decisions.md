# 技術スタック決定

## 言語・フレームワーク

| 項目 | 選定 |
|------|------|
| 言語 | TypeScript (ES2022, strict mode) |
| ランタイム | Node.js |
| Web フレームワーク | NestJS |
| テストフレームワーク | Vitest |
| パッケージマネージャ | npm |
| LINE SDK | @line/bot-sdk |

## ディレクトリ構造（ユニット単位）

```
construction/<unit_name>/
├── src/                    ← ドメインモデル実装（フラット構成）
│   ├── <ValueObject>.ts
│   ├── <Entity>.ts
│   ├── <Aggregate>.ts
│   ├── <DomainService>.ts
│   ├── <DomainEvent>.ts
│   ├── <Repository>.ts     ← インターフェース
│   ├── <Gateway>.ts         ← インターフェース
│   └── InMemory<Repo>.ts   ← インメモリ実装
├── tests/                  ← テスト（フラット構成）
│   ├── <ValueObject>.test.ts
│   ├── <Entity>.test.ts
│   ├── <Aggregate>.test.ts
│   ├── <DomainService>.test.ts
│   └── ...
├── docs/                   ← ドメインモデル文書（作成済み）
├── domain_model_plan.md
└── domain_test_plan.md
```

## 共通方針

- クラスベースで DDD パターンを表現
- 値オブジェクトは不変（readonly プロパティ + ファクトリメソッド）
- リポジトリはインメモリ実装を仮置き
- Gateway はインターフェースのみ定義（実装は Integration フェーズ）
- ログは console（標準）を使用
- ID 生成は `crypto.randomUUID()`
