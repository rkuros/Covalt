# Covalt - LINE予約システム設計ドキュメント

LINE公式アカウントを活用した予約管理システムの設計ドキュメント。

## フェーズ

| フェーズ | 状態 | 内容 |
|---------|------|------|
| Inception | 完了 | ユーザーストーリー策定、ユニット分割、連携定義 |
| Elaboration | 未着手 | 技術スタック選定、アーキテクチャ設計、DB設計 |
| Construction | 未着手 | 実装 |

## ディレクトリ構成

```
aidlc-docs/
├── README.md                        ← このファイル
└── inception/
    ├── user_stories_final.md        ← 全35件のユーザーストーリー（確定版）
    ├── research/                    ← 作業過程の中間成果物
    │   ├── epics.md
    │   ├── design_plan.md
    │   ├── user_stories_plan.md
    │   ├── user_stories_customer.md
    │   ├── user_stories_owner.md
    │   ├── user_stories_system.md
    │   ├── user_stories_review.md
    │   ├── units_plan.md
    │   ├── line_integration_comparison.md
    │   └── mock.html
    └── units/                       ← ユニット設計（並列作業用）
        ├── README.md                ← ユニット作業ガイド（最初に読む）
        ├── context_map.md           ← コンテキストマップ
        ├── cross_cutting_security.md
        ├── pacts/                   ← ユニット間連携契約
        ├── unit1_auth_account/
        ├── unit2_line_integration/
        ├── unit3_schedule_slot/
        ├── unit4_reservation/
        ├── unit5_notification/
        ├── unit6_customer_management/
        └── unit7_google_calendar/
```

## 次のエージェントへ

**units/README.md** を最初に読んでください。各ユニットの概要、依存関係、並列作業の進め方が記載されています。
