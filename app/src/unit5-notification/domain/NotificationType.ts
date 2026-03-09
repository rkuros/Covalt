/**
 * 通知種別の列挙。
 * confirmation: 予約確定、modification: 予約変更、cancellation: 予約キャンセル、reminder: リマインダー
 */
export const NotificationType = {
  Confirmation: 'confirmation',
  Modification: 'modification',
  Cancellation: 'cancellation',
  Reminder: 'reminder',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];
