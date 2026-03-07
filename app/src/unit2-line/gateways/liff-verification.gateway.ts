import { Injectable } from '@nestjs/common';
import {
  LiffVerificationGateway,
  LiffVerificationResult,
} from '../domain/LiffVerificationGateway';
import { InvalidLiffTokenError } from '../domain/DomainErrors';

/**
 * LIFF アクセストークン検証 Gateway の仮実装。
 * 本番では LINE Platform の Verify API を呼び出す。現時点では console.log で代替する。
 */
@Injectable()
export class LiffVerificationGatewayImpl implements LiffVerificationGateway {
  async verify(accessToken: string): Promise<LiffVerificationResult> {
    console.log('[LIFF Verification] verify called', {
      accessToken: accessToken.substring(0, 8) + '...',
    });

    if (!accessToken || accessToken === 'invalid') {
      throw new InvalidLiffTokenError();
    }

    return {
      lineUserId: `U${'0'.repeat(32)}`,
      displayName: 'LIFF_Test_User',
    };
  }
}
