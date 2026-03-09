/**
 * ReservationStatus - 予約のライフサイクルにおける状態を表す列挙型の値オブジェクト
 *
 * - confirmed: 確定（予約作成後の初期状態、変更後もこのステータスを維持）
 * - cancelled: キャンセル済み（終端状態）
 * - completed: 完了（終端状態）
 */
export const ReservationStatus = {
  Confirmed: 'confirmed',
  Cancelled: 'cancelled',
  Completed: 'completed',
} as const;

export type ReservationStatus =
  (typeof ReservationStatus)[keyof typeof ReservationStatus];

/** confirmed からの遷移のみ許可。cancelled / completed は終端状態。 */
const ALLOWED_TRANSITIONS: Record<
  ReservationStatus,
  readonly ReservationStatus[]
> = {
  [ReservationStatus.Confirmed]: [
    ReservationStatus.Cancelled,
    ReservationStatus.Completed,
  ],
  [ReservationStatus.Cancelled]: [],
  [ReservationStatus.Completed]: [],
};

export function canTransition(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: ReservationStatus): boolean {
  return (
    status === ReservationStatus.Cancelled ||
    status === ReservationStatus.Completed
  );
}
