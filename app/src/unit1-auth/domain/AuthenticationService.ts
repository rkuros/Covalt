import { EmailAddress } from './EmailAddress';
import { AuthToken } from './AuthToken';
import { Session } from './Session';
import { OwnerAccountRepository } from './OwnerAccountRepository';
import { SessionRepository } from './SessionRepository';

/**
 * ドメインサービス: AuthenticationService
 * メールアドレス + パスワードによるログイン認証、セッション発行、ログアウト処理を行う。
 */
export class AuthenticationService {
  constructor(
    private readonly ownerAccountRepository: OwnerAccountRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  /**
   * ログイン認証を行い、成功時にセッションを発行する (BR-01, BR-02, BR-03)。
   */
  async login(email: string, password: string): Promise<Session> {
    const emailAddress = EmailAddress.create(email);
    const account = await this.ownerAccountRepository.findByEmail(emailAddress);

    if (!account) {
      console.log(`ログイン失敗: アカウントが見つかりません email=${email}`);
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    if (!account.isActive()) {
      console.log(
        `ログイン失敗: アカウントが無効化されています ownerId=${account.ownerId}`,
      );
      throw new Error('アカウントが無効化されています');
    }

    if (!account.verifyPassword(password)) {
      console.log(`ログイン失敗: パスワード不一致 ownerId=${account.ownerId}`);
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    const session = Session.create(account.ownerId);
    await this.sessionRepository.save(session);

    console.log(
      `ログイン成功: ownerId=${account.ownerId} sessionId=${session.sessionId}`,
    );
    return session;
  }

  /**
   * ログアウト処理を行い、セッションを無効化する (BR-04)。
   */
  async logout(tokenValue: string): Promise<void> {
    const token = AuthToken.create(tokenValue);
    const session = await this.sessionRepository.findByToken(token);

    if (!session) {
      console.log('ログアウト: セッションが見つかりません');
      return;
    }

    await this.sessionRepository.deleteByToken(token);
    console.log(`ログアウト成功: sessionId=${session.sessionId}`);
  }
}
