import { OwnerAccount } from './OwnerAccount';
import { OwnerAccountRepository } from './OwnerAccountRepository';
import { SessionRepository } from './SessionRepository';

/**
 * ドメインサービス: AccountManagementService
 * オーナーアカウント一覧の取得、有効/無効の切り替えを行う (BR-12, BR-13, BR-14)。
 */
export class AccountManagementService {
  constructor(
    private readonly ownerAccountRepository: OwnerAccountRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  /**
   * オーナーアカウント一覧を取得する (BR-12)。
   */
  async listAccounts(): Promise<OwnerAccount[]> {
    return this.ownerAccountRepository.findAll();
  }

  /**
   * アカウントを有効化する (BR-13)。
   */
  async activateAccount(ownerId: string): Promise<void> {
    const account = await this.ownerAccountRepository.findById(ownerId);
    if (!account) {
      throw new Error('アカウントが見つかりません');
    }

    account.activate();
    await this.ownerAccountRepository.save(account);

    console.log(`アカウント有効化: ownerId=${ownerId}`);
  }

  /**
   * アカウントを無効化する (BR-13, BR-14)。
   * 無効化時、そのアカウントの既存セッションをすべて削除する。
   */
  async disableAccount(ownerId: string): Promise<void> {
    const account = await this.ownerAccountRepository.findById(ownerId);
    if (!account) {
      throw new Error('アカウントが見つかりません');
    }

    account.disable();
    await this.ownerAccountRepository.save(account);

    // 無効化されたアカウントのセッションをすべて削除 (BR-14)
    await this.sessionRepository.deleteByOwnerId(ownerId);

    console.log(`アカウント無効化: ownerId=${ownerId}`);
  }
}
