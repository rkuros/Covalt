/**
 * 受信者種別。
 * customer: 顧客、owner: オーナー
 */
export const RecipientType = {
  Customer: 'customer',
  Owner: 'owner',
} as const;

export type RecipientType = (typeof RecipientType)[keyof typeof RecipientType];
