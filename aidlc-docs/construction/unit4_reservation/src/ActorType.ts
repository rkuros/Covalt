/**
 * ActorType - 予約操作を実行したアクターの種別を表す列挙型の値オブジェクト
 *
 * - customer: 顧客（LIFF アプリ経由）
 * - owner:    オーナー（Web 管理画面経由）
 */
export const ActorType = {
  Customer: 'customer',
  Owner: 'owner',
} as const;

export type ActorType = (typeof ActorType)[keyof typeof ActorType];
