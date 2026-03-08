import { Injectable } from '@nestjs/common';
import {
  LiffVerificationGateway,
  LiffVerificationResult,
} from '../domain/LiffVerificationGateway';
import { InvalidLiffTokenError } from '../domain/DomainErrors';

/**
 * LIFF アクセストークン検証 Gateway 実装。
 * LINE Platform の Verify API + Profile API を呼び出す。
 */
@Injectable()
export class LiffVerificationGatewayImpl implements LiffVerificationGateway {
  async verify(accessToken: string): Promise<LiffVerificationResult> {
    // 1. Verify the access token
    const verifyResponse = await fetch(
      `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
    );

    if (!verifyResponse.ok) {
      throw new InvalidLiffTokenError();
    }

    const verifyData = (await verifyResponse.json()) as {
      scope: string;
      client_id: string;
      expires_in: number;
    };

    if (verifyData.expires_in <= 0) {
      throw new InvalidLiffTokenError('LIFFアクセストークンの有効期限が切れています');
    }

    // 2. Get user profile using the access token
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      throw new InvalidLiffTokenError('LINEプロフィールの取得に失敗しました');
    }

    const profile = (await profileResponse.json()) as {
      userId: string;
      displayName: string;
    };

    return {
      lineUserId: profile.userId,
      displayName: profile.displayName,
    };
  }
}
