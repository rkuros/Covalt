/**
 * 送信エラー種別。
 */
export const SendErrorType = {
  UserBlocked: "USER_BLOCKED",
  NetworkError: "NETWORK_ERROR",
  Unknown: "UNKNOWN",
  Skipped: "SKIPPED",
} as const;

export type SendErrorType = (typeof SendErrorType)[keyof typeof SendErrorType];

/**
 * 送信結果を表す不変オブジェクト。
 * 成功時は messageId を、失敗時はエラー種別を保持する。
 */
export class SendResult {
  readonly success: boolean;
  readonly messageId: string | null;
  readonly errorType: SendErrorType | null;
  readonly errorMessage: string | null;

  private constructor(
    success: boolean,
    messageId: string | null,
    errorType: SendErrorType | null,
    errorMessage: string | null
  ) {
    this.success = success;
    this.messageId = messageId;
    this.errorType = errorType;
    this.errorMessage = errorMessage;
  }

  /** 送信成功 */
  static ok(messageId: string): SendResult {
    return Object.freeze(new SendResult(true, messageId, null, null));
  }

  /** 送信失敗 */
  static fail(errorType: SendErrorType, errorMessage?: string): SendResult {
    return Object.freeze(
      new SendResult(false, null, errorType, errorMessage ?? null)
    );
  }

  /** ブロック済みユーザーによるエラーか判定 (BR-7: リトライ対象外) */
  get isUserBlocked(): boolean {
    return this.errorType === SendErrorType.UserBlocked;
  }

  /** リトライ可能なエラーか判定 (BR-8) */
  get isRetryable(): boolean {
    return !this.success && !this.isUserBlocked;
  }
}
