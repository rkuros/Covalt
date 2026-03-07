import { EmailAddress } from "./EmailAddress";
import { HashedPassword } from "./HashedPassword";
import { OwnerAccount } from "./OwnerAccount";
import { PasswordResetToken } from "./PasswordResetToken";
import { OwnerAccountRepository } from "./OwnerAccountRepository";
import { PasswordResetTokenRepository } from "./PasswordResetTokenRepository";
import { EmailGateway } from "./EmailGateway";

/**
 * ドメインサービス: AccountProvisioningService
 * システム管理者による新規オーナーアカウントの作成、初期設定メールの送信起動を行う (BR-09, BR-10, BR-11)。
 */
export class AccountProvisioningService {
  constructor(
    private readonly ownerAccountRepository: OwnerAccountRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly emailGateway: EmailGateway,
  ) {}

  /**
   * 新規オーナーアカウントを作成する (BR-09, BR-10)。
   * 仮パスワードでアカウントを作成し、初期設定用メールを送信する。
   */
  async provision(email: string): Promise<OwnerAccount> {
    const emailAddress = EmailAddress.create(email);

    const existing = await this.ownerAccountRepository.findByEmail(emailAddress);
    if (existing) {
      throw new Error("このメールアドレスは既に登録されています");
    }

    // 仮パスワード（初期設定メール経由で変更前提）
    const temporaryPassword = HashedPassword.create("temporary-password-" + Date.now());
    const account = OwnerAccount.create(emailAddress, temporaryPassword);

    await this.ownerAccountRepository.save(account);

    // 初期設定用トークンを発行してメール送信 (BR-10, BR-11)
    const setupToken = PasswordResetToken.create(account.ownerId);
    await this.passwordResetTokenRepository.save(setupToken);

    await this.emailGateway.sendAccountSetupEmail(
      emailAddress.value,
      setupToken.token.value,
    );

    console.log(`オーナーアカウント作成: ownerId=${account.ownerId} email=${email}`);
    return account;
  }
}
