import { EmailAddress } from "./EmailAddress";
import { HashedPassword } from "./HashedPassword";
import { AuthToken } from "./AuthToken";
import { PasswordResetToken } from "./PasswordResetToken";
import { OwnerAccountRepository } from "./OwnerAccountRepository";
import { PasswordResetTokenRepository } from "./PasswordResetTokenRepository";
import { EmailGateway } from "./EmailGateway";

/**
 * ドメインサービス: PasswordResetService
 * パスワードリセットトークンの生成・検証、新パスワードの設定を行う。
 * リセットメール送信を起動する (BR-06, BR-07, BR-08)。
 */
export class PasswordResetService {
  constructor(
    private readonly ownerAccountRepository: OwnerAccountRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly emailGateway: EmailGateway,
  ) {}

  /**
   * パスワードリセットを要求する (BR-06, BR-07)。
   * 登録済みメールアドレスに対してリセットトークンを生成し、メールを送信する。
   */
  async requestReset(email: string): Promise<void> {
    const emailAddress = EmailAddress.create(email);
    const account = await this.ownerAccountRepository.findByEmail(emailAddress);

    if (!account) {
      // セキュリティ上、アカウントが存在しない場合でもエラーを返さない
      console.log(`パスワードリセット要求: アカウントが見つかりません email=${email}`);
      return;
    }

    const resetToken = PasswordResetToken.create(account.ownerId);
    await this.passwordResetTokenRepository.save(resetToken);

    await this.emailGateway.sendPasswordResetEmail(
      account.email.value,
      resetToken.token.value,
    );

    console.log(`パスワードリセットトークン発行: ownerId=${account.ownerId}`);
  }

  /**
   * リセットトークンを使って新しいパスワードを設定する (BR-07, BR-08)。
   */
  async resetPassword(tokenValue: string, newPassword: string): Promise<void> {
    const token = AuthToken.create(tokenValue);
    const resetToken = await this.passwordResetTokenRepository.findByToken(token);

    if (!resetToken) {
      throw new Error("リセットトークンが見つかりません");
    }

    if (!resetToken.isValid()) {
      throw new Error("リセットトークンが無効または期限切れです");
    }

    const account = await this.ownerAccountRepository.findById(resetToken.ownerId);
    if (!account) {
      throw new Error("アカウントが見つかりません");
    }

    const newPasswordHash = HashedPassword.create(newPassword);
    account.changePassword(newPasswordHash);

    resetToken.markAsUsed();

    await this.ownerAccountRepository.save(account);
    await this.passwordResetTokenRepository.save(resetToken);

    console.log(`パスワードリセット完了: ownerId=${account.ownerId}`);
  }
}
