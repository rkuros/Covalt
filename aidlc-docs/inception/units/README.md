# Units of Work - 作業ガイド

## 読む順序

1. **この README** - 全体像を把握
2. **context_map.md** - ユニット間の依存関係を把握
3. **cross_cutting_security.md** - 全ユニット共通の非機能要件
4. **pacts/integration_definition.md** - ユニット間連携の一覧と PACT 契約
5. **自分の担当ユニットの spec.md** - ユニット固有の仕様

## ユニット一覧

| Dir | コンテキスト | 概要 | 優先度の高い US |
|-----|------------|------|----------------|
| `unit1_auth_account/` | 認証・アカウント管理 | オーナー認証、アカウント CRUD | US-S01, US-S03 (Must) |
| `unit2_line_integration/` | LINE 連携基盤 | LIFF, Rich Menu, Webhook, Messaging API | US-C01, US-C02, US-C03, US-S05 (Must) |
| `unit3_schedule_slot/` | スケジュール・空き枠管理 | 営業時間、休業日、スロット管理 | US-O06, US-O08 (Must) |
| `unit4_reservation/` | 予約管理 | 予約ライフサイクル全体（顧客側 + オーナー側） | US-C04, US-C05, US-O01, US-O02 (Must) |
| `unit5_notification/` | 通知 | LINE 通知（確定/変更/キャンセル/リマインダー） | US-C10, US-O12 (Must) |
| `unit6_customer_management/` | 顧客情報管理 | 顧客一覧、詳細、LINE 自動登録 | US-O09〜O11 (Could) |
| `unit7_google_calendar/` | Google カレンダー連携 | OAuth、カレンダー自動同期 | US-O14, US-O15 (Could) |

## ユニット間の依存関係

```
Unit 1 (認証) ──API──► Unit 3, 4, 6, 7  （認証トークン検証）
Unit 2 (LINE) ──API──► Unit 4            （LIFF 検証）
Unit 2 (LINE) ──API──► Unit 5            （メッセージ送信）
Unit 2 (LINE) ─Event─► Unit 6            （友だち追加 → 顧客登録）
Unit 3 (枠)   ──API──► Unit 4            （空き枠照会 / 確保 / 解放）
Unit 6 (顧客) ──API──► Unit 4            （顧客情報参照）
Unit 4 (予約) ─Event─► Unit 5            （予約イベント → 通知）
Unit 4 (予約) ─Event─► Unit 7            （予約イベント → カレンダー同期）
```

詳細は **context_map.md**（Mermaid 図 + 統合パターン解説）を参照。

## 並列作業の進め方

### 各ユニットのディレクトリ構成

```
unit{N}_{name}/
├── spec.md              ← Inception で定義済み（ユーザーストーリー + AC）
└── （以降、各エージェントが追加）
    ├── api.md           ← ユニット内部の API 設計
    ├── schema.md        ← DB スキーマ / エンティティ設計
    ├── ...              ← その他の成果物
    └── src/             ← 実装コード（Construction フェーズ）
```

### 作業前に必ず読むファイル

| ファイル | 目的 |
|---------|------|
| 担当ユニットの `spec.md` | 自ユニットの要件 |
| `cross_cutting_security.md` | 全ユニット共通の非機能要件 |
| `pacts/integration_definition.md` | 連携先のエンドポイントとイベント一覧 |

### Provider ユニット → 関連 PACT を確認

自ユニットが **Provider**（API を提供する側）の場合、Consumer が期待する契約を確認してから実装する。

| Provider | 確認すべき PACT |
|----------|----------------|
| Unit 1 | `unit4-unit1-auth.pact.json` |
| Unit 2 | `unit4-unit2-liff.pact.json`, `unit5-unit2-messaging.pact.json`, `unit6-unit2-line-webhook-events.pact.json` |
| Unit 3 | `unit4-unit3-slots.pact.json` |
| Unit 4 | `unit5-unit4-reservation-events.pact.json`, `unit7-unit4-reservation-events.pact.json` |
| Unit 6 | `unit4-unit6-customer.pact.json` |

Unit 5, Unit 7 は Consumer のみ（Provider としての PACT なし）。

### Consumer ユニット → Provider の PACT でスタブを作成

自ユニットが **Consumer**（API を呼び出す側）の場合、PACT の response/contents を使ってスタブ/モックを作成し、Provider の完成を待たずに開発を進める。
