import { Injectable, Logger } from '@nestjs/common';
import { EmailGateway } from '../domain/EmailGateway';

@Injectable()
export class ConsoleEmailGateway implements EmailGateway {
  private readonly logger = new Logger(ConsoleEmailGateway.name);

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    this.logger.log(
      `[EmailGateway] パスワードリセットメール送信: email=${email}, resetToken=${resetToken}`,
    );
  }

  async sendAccountSetupEmail(
    email: string,
    setupToken: string,
  ): Promise<void> {
    this.logger.log(
      `[EmailGateway] アカウント初期設定メール送信: email=${email}, setupToken=${setupToken}`,
    );
  }
}
