# Unit 6: 顧客情報管理 -- ドメインテスト計画

## 前提事項

[Question] 使用するプログラミング言語とテストフレームワークは何ですか？
[Answer]

[Question] テストのディレクトリ構造はどのようにしますか？（例: `tests/unit/`, `tests/integration/` など）
[Answer]

---

## Step 1: 値オブジェクトのテスト

### 1-1. CustomerId

- [ ] **正常系**: 有効な文字列（例: `cust-001`）で CustomerId を生成できる
- [ ] **異常系**: 空文字列で CustomerId を生成しようとするとエラーになる
- [ ] **異常系**: null / undefined で CustomerId を生成しようとするとエラーになる

### 1-2. OwnerId

- [ ] **正常系**: 有効な文字列（例: `owner-001`）で OwnerId を生成できる
- [ ] **異常系**: 空文字列で OwnerId を生成しようとするとエラーになる
- [ ] **異常系**: null / undefined で OwnerId を生成しようとするとエラーになる

### 1-3. LineUserId

- [ ] **正常系**: `U` + 32桁の16進文字列（例: `U1234567890abcdef1234567890abcdef`）で LineUserId を生成できる
- [ ] **正常系**: null を許容する（nullable）
- [ ] **異常系**: `U` で始まらない文字列で生成しようとするとエラーになる
- [ ] **異常系**: `U` + 32桁未満の16進文字列で生成しようとするとエラーになる
- [ ] **異常系**: `U` + 32桁を超える16進文字列で生成しようとするとエラーになる
- [ ] **異常系**: `U` + 16進文字以外の文字を含む文字列で生成しようとするとエラーになる
- [ ] **境界値**: `U` + ちょうど32桁の16進文字列（下限・上限が同一）で生成できる
- [ ] **境界値**: `U` + 31桁の16進文字列で生成しようとするとエラーになる
- [ ] **境界値**: `U` + 33桁の16進文字列で生成しようとするとエラーになる

### 1-4. DisplayName

- [ ] **正常系**: 有効な文字列で DisplayName を生成できる
- [ ] **正常系**: null を許容する（nullable）
- [ ] **異常系**: 空文字列で DisplayName を生成しようとするとエラーになる

[Question] DisplayName に文字数上限のバリデーションはありますか？
[Answer]

### 1-5. CustomerName

- [ ] **正常系**: 有効な文字列（例: `田中太郎`）で CustomerName を生成できる
- [ ] **異常系**: 空文字列で CustomerName を生成しようとするとエラーになる
- [ ] **異常系**: null / undefined で CustomerName を生成しようとするとエラーになる

[Question] CustomerName に文字数上限のバリデーションはありますか？
[Answer]

---

## Step 2: Customer エンティティのテスト

### 2-1. 生成

- [ ] **正常系**: 全フィールド（customerId, ownerId, customerName, displayName, lineUserId, isLineLinked, registeredAt）を指定して Customer を生成できる
- [ ] **正常系**: LINE 連携なしの顧客を生成できる（displayName = null, lineUserId = null, isLineLinked = false）
- [ ] **正常系**: LINE 連携ありの顧客を生成できる（displayName, lineUserId が設定済み、isLineLinked = true）
- [ ] **異常系**: 必須フィールド（customerId, ownerId, customerName）が欠損している場合エラーになる

### 2-2. LINE 連携状態の整合性

- [ ] **正常系**: lineUserId が設定されている場合、isLineLinked が true である
- [ ] **正常系**: lineUserId が null の場合、isLineLinked が false である
- [ ] **異常系**: lineUserId が設定されているのに isLineLinked が false の状態は許容されない（整合性違反）

[Question] lineUserId と isLineLinked の整合性は、エンティティ生成時にバリデーションとして自動的に強制するのか、それとも呼び出し側が正しく設定する前提ですか？
[Answer]

### 2-3. 顧客名の編集（BR-6）

- [ ] **正常系**: customerName を新しい値に更新できる
- [ ] **異常系**: customerName を空文字列に更新しようとするとエラーになる

### 2-4. 等価性・識別

- [ ] **正常系**: 同じ customerId を持つ 2 つの Customer は等価と判定される
- [ ] **正常系**: 異なる customerId を持つ 2 つの Customer は等価でないと判定される

---

## Step 3: CustomerCommandService のテスト

### 3-1. 顧客の手動作成（BR-7 / POST /api/customers）

- [ ] **正常系**: ownerId と customerName を指定して顧客を手動作成できる
- [ ] **正常系**: 手動作成した顧客は isLineLinked = false、displayName = null、lineUserId = null で登録される
- [ ] **正常系**: 作成された顧客に customerId が自動採番される
- [ ] **正常系**: registeredAt に作成日時が設定される
- [ ] **異常系**: ownerId が未指定の場合エラーになる
- [ ] **異常系**: customerName が未指定の場合エラーになる
- [ ] **異常系**: customerName が空文字列の場合エラーになる

### 3-2. 顧客情報の編集（BR-6）

- [ ] **正常系**: 既存顧客の customerName を更新できる
- [ ] **異常系**: 存在しない customerId を指定した場合エラーになる
- [ ] **異常系**: 更新後の customerName が空文字列の場合エラーになる

---

## Step 4: CustomerAutoRegistrationHandler のテスト（line.friend_added イベント / BR-8 / BR-9）

### 4-1. イベントペイロードの検証

- [ ] **正常系**: 有効な `line.friend_added` イベントペイロード（eventType, ownerId, lineUserId, displayName, timestamp）を受理できる
- [ ] **異常系**: eventType が `line.friend_added` 以外の場合、処理を拒否またはスキップする
- [ ] **異常系**: lineUserId が `^U[0-9a-f]{32}$` の形式に合致しない場合エラーになる
- [ ] **異常系**: 必須フィールド（ownerId, lineUserId, displayName, timestamp）が欠損している場合エラーになる
- [ ] **異常系**: timestamp が ISO 8601 形式でない場合エラーになる

### 4-2. 新規顧客の自動登録（BR-8）

- [ ] **正常系**: ownerId + lineUserId の組み合わせで既存顧客が見つからない場合、新規 Customer が作成される
- [ ] **正常系**: 自動登録された顧客の customerName には displayName の値が初期値として設定される
- [ ] **正常系**: 自動登録された顧客の isLineLinked は true に設定される
- [ ] **正常系**: 自動登録された顧客の lineUserId にイベントの lineUserId が設定される

### 4-3. 冪等性の担保（BR-9）

- [ ] **正常系**: ownerId + lineUserId の組み合わせで既存顧客が見つかる場合、新規登録は行われない（冪等性）
- [ ] **正常系**: 同一イベントが 2 回連続で処理されても、顧客が 1 件のみ存在する
- [ ] **正常系**: 既存顧客が見つかった場合、既存顧客の情報（customerName 等）は上書きされない
- [ ] **境界値**: 同一 lineUserId でも ownerId が異なる場合は別顧客として登録される

[Question] 冪等性を担保する場合、既存顧客が見つかったときの戻り値やレスポンスはどうなりますか？（既存顧客を返す / void / エラーなし等）
[Answer]

### 4-4. リトライ耐性（横断的関心事: 可用性）

- [ ] **正常系**: 永続化処理が一時的に失敗した場合、リトライ後に正常に顧客が登録される
- [ ] **異常系**: リトライ上限に達した場合、適切なエラーハンドリングが行われる

[Question] リトライの回数や間隔のポリシーは決まっていますか？
[Answer]

---

## Step 5: CustomerQueryService のテスト

### 5-1. 顧客 ID による単一取得（A6: GET /api/customers/{customerId}）

- [ ] **正常系**: 存在する customerId を指定して顧客情報を取得できる
- [ ] **正常系**: レスポンスに全フィールド（customerId, ownerId, customerName, displayName, lineUserId, isLineLinked, registeredAt）が含まれる
- [ ] **正常系**: LINE 連携なしの顧客の場合、displayName = null、lineUserId = null、isLineLinked = false が返される
- [ ] **異常系**: 存在しない customerId を指定した場合、404（CUSTOMER_NOT_FOUND）が返される

### 5-2. LINE ユーザー ID による検索（A7: GET /api/customers/by-line-user）

- [ ] **正常系**: 存在する ownerId + lineUserId の組み合わせで顧客情報を取得できる
- [ ] **正常系**: レスポンスに全フィールドが含まれる
- [ ] **異常系**: 存在しない ownerId + lineUserId の組み合わせで 404 が返される
- [ ] **異常系**: ownerId が未指定の場合エラーになる
- [ ] **異常系**: lineUserId が未指定の場合エラーになる

### 5-3. 顧客名の部分一致検索（A8: GET /api/customers/search / BR-2）

- [ ] **正常系**: 部分一致するキーワード（例: `田中`）で検索し、該当する顧客のリストが返される
- [ ] **正常系**: レスポンスに customers 配列（各要素は customerId, customerName, isLineLinked）と total が含まれる
- [ ] **正常系**: 検索結果が複数件ある場合、すべて返される
- [ ] **正常系**: 検索結果が 0 件の場合、空の配列と total = 0 が返される
- [ ] **境界値**: 検索キーワードが 1 文字の場合でも部分一致検索が動作する

[Question] 検索クエリ `q` が空文字列の場合の仕様はどうなっていますか？（全件返却 / エラー / 空結果）
[Answer]

### 5-4. テナント分離（横断的関心事: 個人情報保護）

- [ ] **正常系**: 各検索 API で ownerId によるスコープ制限が適用され、自オーナーの顧客のみ返される
- [ ] **異常系**: GET /api/customers/{customerId} で他オーナーの顧客 ID を指定した場合、404 が返される（情報が漏洩しない）
- [ ] **異常系**: GET /api/customers/by-line-user で他オーナーの lineUserId を指定した場合、404 が返される
- [ ] **異常系**: GET /api/customers/search で他オーナーの ownerId を指定しても、自オーナーの顧客のみ返される（認証済みオーナーのスコープに制限される）

[Question] GET /api/customers/{customerId} のテナント分離はどのように実現しますか？（パスに customerId のみ含まれるため、ownerId をどこから取得するか -- 認証トークンから抽出する想定か）
[Answer]

---

## Step 6: PACT 整合性テスト（Provider Verification）

### 6-1. unit4-unit6-customer.pact.json -- Unit 4 (Consumer) vs Unit 6 (Provider)

- [ ] **Interaction 1**: 「顧客IDで顧客情報を取得する」-- Provider State `顧客 cust-001 が存在する` の状態で GET /api/customers/cust-001 を呼び出し、200 レスポンスが PACT で定義されたマッチングルール（型一致、registeredAt の ISO 8601 正規表現）に合致する
- [ ] **Interaction 2**: 「存在しない顧客IDで 404 が返る」-- Provider State `顧客 cust-999 は存在しない` の状態で GET /api/customers/cust-999 を呼び出し、404 レスポンス（error: CUSTOMER_NOT_FOUND）が返される
- [ ] **Interaction 3**: 「LINE ユーザーIDで顧客を検索する」-- Provider State `LINE ユーザー U1234567890abcdef が顧客登録済みである` の状態で GET /api/customers/by-line-user?ownerId=owner-001&lineUserId=U1234567890abcdef を呼び出し、200 レスポンスが返される
- [ ] **Interaction 4**: 「手動予約時に新規顧客を作成する」-- Provider State `オーナー owner-001 が存在する` の状態で POST /api/customers を呼び出し、201 レスポンスが PACT で定義されたマッチングルール（customerId の型一致、registeredAt の ISO 8601 正規表現）に合致する
- [ ] **Interaction 5**: 「顧客名で検索する（手動予約時の顧客選択）」-- Provider State `オーナー owner-001 に複数の顧客が存在する` の状態で GET /api/customers/search?ownerId=owner-001&q=田中 を呼び出し、200 レスポンスが PACT で定義されたマッチングルール（customers 配列の型一致 min: 0、total の整数一致）に合致する

### 6-2. unit6-unit2-line-webhook-events.pact.json -- Unit 6 (Consumer) vs Unit 2 (Provider)

- [ ] **Message 1**: 「LINE 友だち追加イベント - 顧客自動登録に使用」-- Unit 6 のメッセージハンドラ（CustomerAutoRegistrationHandler）が、PACT で定義されたペイロード形式のメッセージを正常に処理できる
- [ ] **Message 1 マッチングルール検証**: ペイロードの各フィールドが PACT マッチングルールに合致する（eventType: 正規表現 `^line\.friend_added$`、lineUserId: 正規表現 `^U[0-9a-f]{32}$`、timestamp: ISO 8601 正規表現、ownerId: 型一致、displayName: 型一致）

---

## Step 7: ビジネスルール網羅性の確認

以下のビジネスルールが上記ステップでカバーされていることの確認。

| BR | ルール | カバーするステップ |
|----|--------|-------------------|
| BR-1 | 顧客一覧は Web 管理画面で表示可能 | Step 5-3（検索 API の動作を通じて確認） |
| BR-2 | 顧客名による部分一致検索 | Step 5-3 |
| BR-3 | LINE 連携済みかどうかの判定・表示 | Step 2-2, Step 5-1, Step 5-3 |
| BR-4 | 顧客詳細画面の表示項目 | Step 5-1 |
| BR-5 | 予約履歴の表示（Unit 4 への問い合わせ） | 対象外（Unit 4 側の責務） |
| BR-6 | 顧客名の編集・保存 | Step 2-3, Step 3-2 |
| BR-7 | 手動での新規顧客登録 | Step 3-1 |
| BR-8 | LINE 友だち追加時の自動登録 | Step 4-2 |
| BR-9 | 同一 ownerId + lineUserId の重複登録防止（冪等性） | Step 4-3 |

[Question] BR-5（顧客の予約履歴表示）は Unit 4 への問い合わせが必要とされていますが、Unit 6 のドメインテストの範囲ではモックを用いた結合テストとしてカバーすべきですか、それとも Unit 4 との統合テストとして別途計画しますか？
[Answer]
