/**
 * ChangeType - ReservationHistory に記録される変更の種別を表す列挙型の値オブジェクト
 *
 * - modified:  予約日時の変更
 * - cancelled: 予約のキャンセル
 * - completed: 予約の完了
 */
export const ChangeType = {
  Modified: 'modified',
  Cancelled: 'cancelled',
  Completed: 'completed',
} as const;

export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType];
