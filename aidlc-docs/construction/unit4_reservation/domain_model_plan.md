# Unit 4 予約管理 - ドメインモデル設計計画

## 概要

Unit 4（予約管理）の11ユーザーストーリー（顧客側6 + オーナー側5）を実現するためのドメインモデルを設計する。
本計画では、設計するコンポーネントの一覧と作業ステップを定義する。
各コンポーネントは `docs/` フォルダ内に個別の md ファイルとして作成する。

---

## 作成するドキュメント一覧

| # | ファイル名 | 内容 |
|---|-----------|------|
| 1 | `docs/entities.md` | エンティティの定義 |
| 2 | `docs/value_objects.md` | 値オブジェクトの定義 |
| 3 | `docs/aggregates.md` | 集約と集約ルートの定義 |
| 4 | `docs/domain_services.md` | ドメインサービスの定義 |
| 5 | `docs/domain_events.md` | ドメインイベントの定義 |
| 6 | `docs/repository_interfaces.md` | リポジトリインターフェースの定義 |

---

## 作業ステップ

### Step 1: エンティティの洗い出しと定義

- [x] 1-1. Reservation（予約）エンティティの属性を定義する
  - 仕様から読み取れる属性候補: reservationId, ownerId, customerId, slotId, dateTime, status, createdAt
  - Unit 5 向けイベント PACT に含まれるフィールド: customerName, lineUserId, ownerLineUserId, previousDateTime, modifiedBy, cancelledBy
  - Unit 7 向けイベント PACT に含まれるフィールド: durationMinutes

  [Question] Reservation エンティティに `customerName`, `lineUserId`, `ownerLineUserId`, `displayName` を保持すべきか、それとも Unit 6（顧客情報管理）への問い合わせで都度取得すべきか？イベント発行時にこれらの情報が必要だが、保持する場合はデータの二重管理になり、都度取得する場合はイベント発行時にUnit 6 APIへの依存が発生する。
  [Answer]

  [Question] `durationMinutes`（施術時間）は Reservation エンティティの属性として保持すべきか？Unit 3 のスロット API レスポンスには `durationMinutes` が含まれており、Unit 7 向けイベントにも `durationMinutes` が必要だが、予約自体の属性なのか、スロットから導出される値なのかを判断する必要がある。
  [Answer]

  [Question] オーナーによる手動予約作成時（US-O03）、「新規顧客情報を入力して予約を作成できる」とあるが、新規顧客の作成は Unit 6 の責務か？Unit 4 から Unit 6 の顧客作成 API を呼ぶ必要があるか？（現在の PACT には顧客作成 API の契約が存在しない）
  [Answer]

- [x] 1-2. Reservation 以外にエンティティが必要かを検討する

  [Question] 予約変更履歴（US-O04「変更前後の日時が変更履歴として記録される」）を管理するための ReservationHistory や ReservationChangeLog のようなエンティティを別途定義すべきか？それとも Reservation エンティティの内部構造として扱うべきか？
  [Answer]

### Step 2: 値オブジェクトの洗い出しと定義

- [x] 2-1. 予約ステータス（ReservationStatus）の値を定義する
  - 仕様から読み取れるステータス候補: 確定、キャンセル済み、完了
  - US-C08: 「確定・キャンセル済み等」
  - US-O01: 「確定・キャンセル済み・完了」でフィルタリング

  [Question] 予約ステータスの完全な一覧はどうなるか？以下の候補が考えられるが、正確な状態一覧を確認したい。
  - `confirmed`（確定）: 予約作成直後の状態
  - `cancelled`（キャンセル済み）: 顧客またはオーナーがキャンセルした状態
  - `completed`（完了）: 予約日時を過ぎてサービス提供が完了した状態
  - `modified` は独立したステータスとするか？それとも `confirmed` のまま日時のみ変更されるのか？
  [Answer]

  [Question] 予約ステータスが `confirmed` → `completed` に遷移するトリガーは何か？オーナーが手動で完了にするのか、予約日時を過ぎたら自動的に完了になるのか？仕様に明示的な記述がない。
  [Answer]

- [x] 2-2. ReservationId（予約ID）値オブジェクトを定義する
  - US-C05: 「システムが一意の予約IDを発行する」

  [Question] 予約IDのフォーマットに要件はあるか？PACT では `rsv-001` のような形式が使われているが、実際のID生成ルール（UUID、プレフィックス付き連番など）はどうすべきか？
  [Answer]

- [x] 2-3. その他の値オブジェクトの候補を定義する
  - SlotId: Unit 3 のスロットへの参照（PACT で `slot-001` 形式）
  - CustomerId: Unit 6 の顧客への参照（PACT で `cust-001` 形式）
  - OwnerId: Unit 1 のオーナーへの参照（PACT で `owner-001` 形式）
  - ReservationDateTime: 予約日時（タイムゾーン付き、PACT で `2024-01-15T10:00:00+09:00` 形式）
  - ActorType: 操作実行者の種別（PACT の `modifiedBy`, `cancelledBy` に対応。`customer` | `owner`）

  [Question] LineUserId（`U` + 32桁hex）や OwnerLineUserId は Unit 4 のドメインモデル内で値オブジェクトとして定義すべきか？これらは Unit 2/Unit 6 の概念であり、Unit 4 では外部コンテキストの参照値として扱うべきか？
  [Answer]

### Step 3: 集約と集約ルートの定義

- [x] 3-1. Reservation 集約の境界を定義する
  - 集約ルート: Reservation エンティティ
  - 集約に含まれる要素の範囲を決定する

  [Question] Reservation 集約の境界はどこまでか？以下の2つの方針が考えられる。
  - (A) Reservation エンティティのみを集約ルートとし、変更履歴も Reservation 集約内に含める（小さな集約）
  - (B) Reservation エンティティと ReservationHistory を別集約とする（変更履歴が増大する場合のスケーラビリティ考慮）
  [Answer]

- [x] 3-2. 集約の不変条件（ビジネスルール）を列挙する
  - 二重予約防止: 同一スロットに対する重複予約の禁止（Unit 3 のスロット確保 API を利用）
  - 過去日時制約: 過去の予約は変更・キャンセル不可
  - ステータス遷移制約: 許可された状態遷移のみ実行可能

  [Question] 二重予約防止の不変条件は Reservation 集約内で完結させるべきか？それとも Unit 3 の `PUT /api/slots/{slotId}/reserve` API（409 SLOT_ALREADY_BOOKED で競合検知）に委譲する形が正しいか？コンテキストマップでは Unit 3 が Upstream で空きスロット管理を担当しているため、排他制御の主体がどちらにあるかを明確にしたい。
  [Answer]

### Step 4: ドメインサービスの定義

- [x] 4-1. 予約作成サービスの責務を定義する
  - 顧客操作（LIFF経由）とオーナー操作（Web管理画面経由）の2つの入口がある
  - 顧客操作時: Unit 2 LIFF検証 → Unit 6 顧客検索（LINE ユーザーID） → Unit 3 スロット確保 → 予約作成 → イベント発行
  - オーナー操作時: Unit 1 認証検証 → Unit 6 顧客検索/選択 → Unit 3 スロット確保 → 予約作成 → イベント発行

  [Question] 顧客操作とオーナー操作で予約作成のドメインサービスを分けるべきか？それとも1つのサービスに統合し、ActorType（customer/owner）で分岐させるべきか？
  [Answer]

- [x] 4-2. 予約変更サービスの責務を定義する
  - 旧スロット解放（Unit 3 release API）→ 新スロット確保（Unit 3 reserve API）→ 予約更新 → イベント発行
  - 顧客操作時: 自分の予約のみ変更可能
  - オーナー操作時: すべての予約を変更可能、変更履歴を記録

  [Question] 予約変更時に旧スロット解放と新スロット確保の間で失敗した場合の補償トランザクション（ロールバック）はどのように扱うべきか？これはドメインモデルの責務かアプリケーション層の責務か？
  [Answer]

- [x] 4-3. 予約キャンセルサービスの責務を定義する
  - Unit 3 スロット解放 → 予約ステータス更新 → イベント発行
  - キャンセル後のスロットは「予約可能」状態に復帰

- [x] 4-4. 空き状況照会サービスの必要性を検討する

  [Question] 空き状況の確認（US-C04）はドメインサービスとして定義すべきか？Unit 3 の `GET /api/slots/available` API を直接呼び出すだけであれば、ドメインサービスではなくアプリケーション層のユースケースとして実装すべきか？Unit 4 側で休業日判定やスロットの表示加工などのドメインロジックが必要かどうかで判断が変わる。
  [Answer]

- [x] 4-5. 予約一覧・履歴照会に関するドメインサービスの必要性を検討する

  [Question] 予約一覧（US-C08, US-O01）や予約履歴（US-C09）、予約詳細（US-O02）は単純な読み取り操作であるため、ドメインサービスではなくリポジトリの読み取りメソッド + アプリケーション層で実現すべきか？それともフィルタリングロジック（ステータス別、日別/週別/月別表示）をドメインサービスとして定義すべきか？
  [Answer]

### Step 5: ドメインイベントの定義

- [x] 5-1. ReservationCreated イベントのペイロードを定義する
  - Unit 5 が必要とするフィールド: eventType, reservationId, ownerId, customerId, customerName, lineUserId, ownerLineUserId, slotId, dateTime, timestamp
  - Unit 7 が必要とするフィールド: eventType, reservationId, ownerId, customerName, slotId, dateTime, durationMinutes, timestamp

  [Question] Unit 5 と Unit 7 で必要なフィールドが異なる（Unit 5 は lineUserId/ownerLineUserId/customerId を必要とし、Unit 7 は durationMinutes を必要とする）。イベントのペイロードは両方の Consumer が必要とするフィールドの和集合（スーパーセット）として1つのイベントを定義すべきか？それとも Consumer ごとに別のイベントを発行すべきか？
  [Answer]

- [x] 5-2. ReservationModified イベントのペイロードを定義する
  - 共通フィールド: eventType, reservationId, ownerId, customerName, slotId, dateTime, previousDateTime, timestamp
  - Unit 5 追加: customerId, lineUserId, ownerLineUserId, modifiedBy
  - Unit 7 追加: durationMinutes

- [x] 5-3. ReservationCancelled イベントのペイロードを定義する
  - 共通フィールド: eventType, reservationId, ownerId, customerName, slotId, dateTime, timestamp
  - Unit 5 追加: customerId, lineUserId, ownerLineUserId, cancelledBy

- [x] 5-4. イベント発行のタイミングと保証レベルを定義する

  [Question] ドメインイベントの発行は「少なくとも1回（at-least-once）」保証か「正確に1回（exactly-once）」保証か？integration_definition.md では「イベントの配信基盤（メッセージブローカー）の選定は Elaboration フェーズで決定する」とあるが、ドメインモデル設計時点でイベント発行の保証レベルを前提として決める必要があるか？
  [Answer]

### Step 6: リポジトリインターフェースの定義

- [x] 6-1. ReservationRepository インターフェースのメソッドを定義する
  - 保存系: save（作成/更新）
  - 照会系: findById, findByCustomerId, findByOwnerId
  - 一覧系: 顧客の予約一覧（今後の予約 / 過去の履歴）、オーナーの予約一覧（日別/週別/月別、ステータスフィルタ）

  [Question] リポジトリの検索メソッドの粒度について: オーナー向けの予約一覧（US-O01）は日別/週別/月別の表示切り替えとステータスフィルタリングが必要だが、これらのフィルタ条件はリポジトリインターフェースのメソッドシグネチャにどの程度反映すべきか？
  - (A) 汎用的な検索条件オブジェクト（Criteria/Specification パターン）を引数にする
  - (B) 個別の検索メソッド（findByOwnerIdAndDateRange, findByOwnerIdAndStatus など）を定義する
  [Answer]

- [x] 6-2. 外部サービスとの連携インターフェース（ACL / Gateway）を定義する

  [Question] 外部ユニット（Unit 1, 2, 3, 6）への API 呼び出しをドメインモデルのリポジトリインターフェースとして定義すべきか？それとも以下のように別のインターフェース名（Gateway, Port, Client など）で分離すべきか？
  - SlotService / SlotGateway: Unit 3 の空きスロット照会・確保・解放
  - CustomerService / CustomerGateway: Unit 6 の顧客情報取得・検索
  - AuthService / AuthGateway: Unit 1 の認証トークン検証
  - LiffService / LiffGateway: Unit 2 の LIFF トークン検証
  - EventPublisher: Unit 5, Unit 7 向けドメインイベント発行
  [Answer]

### Step 7: 全体レビューと整合性確認

- [x] 7-1. 全11ユーザーストーリーのカバレッジを確認する
  - 各ストーリーのアクセプタンスクライテリアがドメインモデルのどのコンポーネントで実現されるかをマッピングする

- [x] 7-2. PACT 契約との整合性を確認する
  - Consumer PACT（Unit 3 slots, Unit 6 customer, Unit 1 auth, Unit 2 LIFF）の利用箇所
  - Provider PACT（Unit 5, Unit 7 向けイベント）のペイロードとドメインイベント定義の一致

- [x] 7-3. 横断的関心事（cross_cutting_security.md）への対応を確認する
  - US-S06: 個人情報の暗号化保存 → Reservation エンティティ内の個人情報フィールドの取り扱い
  - US-S07: 二重予約防止の排他制御 → 集約の不変条件とUnit 3 スロット確保APIの関係

- [x] 7-4. コンテキストマップ（context_map.md）との整合性を確認する
  - Unit 3 → Unit 4: OHS/PL（空きスロット照会API）の利用方法
  - Unit 6 ↔ Unit 4: C/S（顧客情報参照）の利用方法
  - Unit 4 → Unit 5, Unit 7: Domain Event（予約イベント発行）の定義

---

## 未解決の質問一覧（Quick Reference）

| # | Step | 質問要約 | 回答状況 |
|---|------|---------|---------|
| Q1 | 1-1 | 顧客名・LINE ID を Reservation に保持するか、都度取得か | 未回答 |
| Q2 | 1-1 | durationMinutes は Reservation の属性か、スロットからの導出値か | 未回答 |
| Q3 | 1-1 | 手動予約時の新規顧客作成は Unit 6 の責務か（PACT に契約がない） | 未回答 |
| Q4 | 1-2 | 変更履歴を別エンティティにするか、Reservation 内部に含めるか | 未回答 |
| Q5 | 2-1 | 予約ステータスの完全な一覧（modified は独立ステータスか） | 未回答 |
| Q6 | 2-1 | confirmed → completed への遷移トリガー（手動 or 自動） | 未回答 |
| Q7 | 2-2 | 予約IDのフォーマット要件（UUID, プレフィックス付き連番等） | 未回答 |
| Q8 | 2-3 | LineUserId 等を Unit 4 内で値オブジェクト化すべきか | 未回答 |
| Q9 | 3-1 | Reservation 集約の境界（変更履歴を含めるか分離するか） | 未回答 |
| Q10 | 3-2 | 二重予約防止の排他制御の主体（Unit 4 集約内 or Unit 3 API 委譲） | 未回答 |
| Q11 | 4-1 | 予約作成サービスを顧客/オーナーで分離するか統合するか | 未回答 |
| Q12 | 4-2 | スロット解放→確保間の失敗時の補償トランザクションの責務 | 未回答 |
| Q13 | 4-4 | 空き状況照会をドメインサービスとするかアプリケーション層とするか | 未回答 |
| Q14 | 4-5 | 一覧・履歴照会をドメインサービスとするかリポジトリ+アプリ層とするか | 未回答 |
| Q15 | 5-1 | イベントペイロードを Consumer の和集合にするか個別にするか | 未回答 |
| Q16 | 5-4 | イベント発行の配信保証レベル（at-least-once / exactly-once） | 未回答 |
| Q17 | 6-1 | リポジトリ検索メソッドの粒度（Criteria パターン or 個別メソッド） | 未回答 |
| Q18 | 6-2 | 外部サービス連携のインターフェース命名（Repository / Gateway / Port） | 未回答 |
