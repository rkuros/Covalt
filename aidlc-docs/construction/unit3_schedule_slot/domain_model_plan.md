# Unit 3 ドメインモデル設計計画

## 参照ドキュメント

- `aidlc-docs/inception/units/unit3_schedule_slot/spec.md`
- `aidlc-docs/inception/units/pacts/integration_definition.md`
- `aidlc-docs/inception/units/pacts/unit4-unit3-slots.pact.json`
- `aidlc-docs/inception/units/cross_cutting_security.md`
- `aidlc-docs/inception/units/context_map.md`

---

## 設計ステップ

### Phase 1: エンティティの定義

- [x] **Step 1: エンティティ一覧の定義** (`docs/entities.md`)
  - 仕様から抽出した候補エンティティを列挙し、各エンティティの責務・属性・識別子を定義する
  - 候補:
    - 営業時間（曜日ごとの営業開始時間・終了時間）
    - 休業日（特定日付の休業設定）
    - 空きスロット（予約可能な時間枠）

  [Question] 営業時間の設定は「オーナー」単位で管理する想定か？つまり、1オーナー = 1店舗であり、店舗ごとに営業時間が異なるケースは考慮不要か？PACT の `ownerId` パラメータから、オーナー単位でスロットを管理する構造と読み取れるが、「店舗」という概念を別途エンティティとして切り出す必要があるか確認したい。
  [Answer]

  [Question] 空きスロットのエンティティにおいて、`status` フィールドは PACT 上 `available` / `booked` の 2 値だが、他のステータス（例: `blocked`（オーナーによる手動ブロック）、`expired`（過去日時のスロット））を考慮する必要があるか？
  [Answer]

  [Question] PACT にある `reservationId` はスロットの属性として保持するのか、それとも Unit 4 側のみが管理するものか？スロットが `booked` のとき `reservationId` を保持する設計が PACT から読み取れるが、これは Unit 3 のドメインモデルの一部として正式に含めるべきか確認したい。
  [Answer]

### Phase 2: 値オブジェクトの定義

- [x] **Step 2: 値オブジェクト一覧の定義** (`docs/value_objects.md`)
  - エンティティから抽出される値オブジェクトを列挙し、各値オブジェクトの不変条件・バリデーションルールを定義する
  - 候補:
    - 時間帯（TimeRange: 開始時間 + 終了時間）
    - 曜日（DayOfWeek）
    - スロットステータス（SlotStatus: available / booked）
    - 所要時間（Duration: 分単位）
    - オーナーID（OwnerId）
    - スロットID（SlotId）

  [Question] `startTime` / `endTime` は PACT 上 `HH:mm` 形式（時刻のみ）で定義されているが、内部的にも時刻のみで管理するのか、それともタイムゾーン付きの日時（DateTime）として管理するのか？タイムゾーンの扱い方針を確認したい。
  [Answer]

  [Question] 所要時間（`durationMinutes`）に最小値・最大値の制約はあるか？例えば、最小 15 分、最大 480 分（8時間）など。
  [Answer]

### Phase 3: 集約の定義

- [x] **Step 3: 集約の設計** (`docs/aggregates.md`)
  - 集約ルートとその境界を定義する
  - トランザクション整合性の境界を明確化する
  - 候補:
    - オーナースケジュール集約（営業時間 + 休業日を束ねる集約）
    - スロット集約（個別の空きスロットを管理する集約）

  [Question] 営業時間と休業日は同一の集約に含めるべきか、別々の集約にすべきか？営業時間の変更と休業日の設定は独立した操作として扱えるが、スロット生成時には両方を参照する必要がある。トランザクション境界をどう設定するかの判断材料が必要。
  [Answer]

  [Question] スロットの集約ルートはどの粒度にすべきか？候補として (A) 個別スロットが集約ルート、(B) 日付単位でスロットを束ねた「日次スロットリスト」が集約ルート、の 2 案がある。PACT では日付単位で照会しているため (B) も考えられるが、予約確保・解放は個別スロット単位で行うため (A) が自然にも見える。どちらが適切か判断材料が必要。
  [Answer]

  [Question] PACT の予約確保（reserve）で `409 SLOT_ALREADY_BOOKED` が定義されている。この排他制御は、cross_cutting_security.md の「予約の二重登録が発生しないよう、排他制御が実装されている」に対応するが、楽観的ロック（バージョン番号）と悲観的ロック（DB ロック）のどちらを想定すべきか？集約設計に影響するため確認したい。
  [Answer]

### Phase 4: ドメインサービスの定義

- [x] **Step 4: ドメインサービスの設計** (`docs/domain_services.md`)
  - 単一のエンティティ/集約に収まらないビジネスロジックをドメインサービスとして定義する
  - 候補:
    - スロット生成サービス（営業時間 + 所要時間からスロットを自動生成するロジック）
    - スロット可用性チェックサービス（休業日・既存予約との整合性を検証するロジック）

  [Question] 「営業時間 x 所要時間からスロットをどう生成するか」のビジネスルールについて: スロットは営業時間の変更時に自動的にバッチ生成されるのか、それとも照会時にオンデマンドで計算されるのか？あるいは、US-O08 にある「手動で作成」のみが正規のフローで、営業時間からの自動生成は補助的な機能なのか？この点がドメインサービスの責務を大きく左右する。
  [Answer]

  [Question] スロット生成の際、重複チェックのルールはどうなるか？例えば、10:00-11:00 のスロットが既にある状態で 10:30-11:30 のスロットを作成できるか？スロット同士の重複を許可するかどうかの方針を確認したい。
  [Answer]

  [Question] 休業日に設定しようとした日に既に予約がある場合（US-O07 のアクセプタンスクライテリア: 「警告が表示される」）、警告後にオーナーが確定した場合の挙動はどうなるか？(A) 既存予約は維持しつつ新規予約のみブロック、(B) 既存予約もキャンセルされる、(C) 休業日設定自体が拒否される、のいずれか？
  [Answer]

### Phase 5: ドメインイベントの定義

- [x] **Step 5: ドメインイベントの設計** (`docs/domain_events.md`)
  - Unit 3 から発行すべきドメインイベントを定義する
  - integration_definition.md の非同期イベント一覧を参照し、Unit 3 が Provider となるイベントを特定する

  [Question] integration_definition.md のイベント一覧には Unit 3 が Provider となるイベントが明示的に定義されていない（Unit 4 が発行する `reservation.*` イベントのみ）。しかし、以下のケースで Unit 3 からイベントを発行する必要があるか確認したい:
  - 営業時間が変更された場合（他ユニットへの通知が必要か？）
  - 休業日が設定された場合（Unit 4 が既存予約に対してアクションを取る必要があるか？）
  - スロットのステータスが変化した場合（reserve/release は同期 API で完結するが、イベントも必要か？）
  [Answer]

### Phase 6: 関連図とモデル全体の整合性確認

- [x] **Step 6: ドメインモデル関連図** (`docs/domain_model_diagram.md`)
  - 全エンティティ・値オブジェクト・集約・ドメインサービス・ドメインイベントの関連を図示する（Mermaid）
  - Unit 4 との境界（OHS/PL パターン）を明示する
  - Unit 1 との依存（認証トークン検証）を明示する

- [x] **Step 7: PACT 契約との整合性検証** (`docs/pact_alignment.md`)
  - PACT で定義されたリクエスト/レスポンスの各フィールドがドメインモデルのどのエンティティ・値オブジェクトにマッピングされるか確認する
  - 以下の PACT インタラクションとの対応:
    - `GET /api/slots/available` → スロット照会
    - `PUT /api/slots/{slotId}/reserve` → スロット予約確保
    - `PUT /api/slots/{slotId}/release` → スロット解放

- [x] **Step 8: 横断的関心事の適用方針** (`docs/cross_cutting_concerns.md`)
  - cross_cutting_security.md の要件を Unit 3 のドメインモデルにどう反映するか整理する
  - 対象:
    - オーナーは自分のデータのみアクセス可能（マルチテナント分離）
    - 排他制御（スロットの二重予約防止）
    - HTTPS 通信

---

## 各ステップの出力先

| ステップ | 出力ファイル |
|---------|------------|
| Step 1 | `docs/entities.md` |
| Step 2 | `docs/value_objects.md` |
| Step 3 | `docs/aggregates.md` |
| Step 4 | `docs/domain_services.md` |
| Step 5 | `docs/domain_events.md` |
| Step 6 | `docs/domain_model_diagram.md` |
| Step 7 | `docs/pact_alignment.md` |
| Step 8 | `docs/cross_cutting_concerns.md` |

---

## 備考

- 上記の [Question] に対する回答をすべて得た後に、各 Step の docs ファイルを作成する。
- アーキテクチャコンポーネント（API 層、インフラ層など）の設計はこの計画のスコープ外とする。
- コード生成はこの計画のスコープ外とする。
