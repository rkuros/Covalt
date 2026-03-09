import { AuthToken } from './AuthToken';
import { SessionRepository } from './SessionRepository';
import { OwnerAccountRepository } from './OwnerAccountRepository';

/**
 * 認証検証レスポンスの型定義（PACT 契約準拠）。
 */
export interface VerificationResult {
  ownerId: string;
  email: string;
  role: 'owner' | 'admin';
}

/**
 * 認証検証エラーの型定義。
 */
export class AuthVerificationError extends Error {
  constructor(
    public readonly errorCode: 'UNAUTHORIZED' | 'ACCOUNT_DISABLED',
    message: string,
  ) {
    super(message);
    this.name = 'AuthVerificationError';
  }
}

/**
 * ドメインサービス: TokenVerificationService
 * Bearer トークンを受け取り、セッションの有効性とアカウント状態を検証して認証情報を返す。
 * 他ユニットからの認証検証リクエスト (POST /api/auth/verify) の中核ロジック。
 *
 * PACT 契約:
 * - 200: { ownerId, email, role }
 * - 401: { error: "UNAUTHORIZED", message: "認証トークンが無効です" }
 * - 403: { error: "ACCOUNT_DISABLED", message: "アカウントが無効化されています" }
 */
export class TokenVerificationService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly ownerAccountRepository: OwnerAccountRepository,
  ) {}

  /**
   * Bearer トークンを検証し、認証情報を返す。
   * PACT 契約の 3 シナリオに対応する。
   */
  async verify(tokenValue: string): Promise<VerificationResult> {
    const token = AuthToken.create(tokenValue);
    const session = await this.sessionRepository.findByToken(token);

    // シナリオ: 無効なトークン → 401
    if (!session || !session.isValid()) {
      console.log(`トークン検証失敗: セッションが見つからないか期限切れ`);
      throw new AuthVerificationError('UNAUTHORIZED', '認証トークンが無効です');
    }

    const account = await this.ownerAccountRepository.findById(session.ownerId);

    if (!account) {
      console.log(
        `トークン検証失敗: アカウントが見つかりません ownerId=${session.ownerId}`,
      );
      throw new AuthVerificationError('UNAUTHORIZED', '認証トークンが無効です');
    }

    // シナリオ: アカウント無効化 → 403 (BR-14)
    if (!account.isActive()) {
      console.log(
        `トークン検証失敗: アカウント無効化 ownerId=${account.ownerId}`,
      );
      throw new AuthVerificationError(
        'ACCOUNT_DISABLED',
        'アカウントが無効化されています',
      );
    }

    // シナリオ: 認証成功 → 200
    console.log(`トークン検証成功: ownerId=${account.ownerId}`);
    return {
      ownerId: account.ownerId,
      email: account.email.value,
      role: account.role.value,
    };
  }
}
