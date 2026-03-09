import { Injectable } from '@nestjs/common';
import { LiffGateway, LiffVerifyResult } from '../domain/LiffGateway';
import { LiffTokenVerificationService } from '../../unit2-line/domain/LiffTokenVerificationService';
import { LiffAccessToken } from '../../unit2-line/domain/LiffAccessToken';

@Injectable()
export class DirectLiffGateway implements LiffGateway {
  constructor(
    private readonly liffVerificationService: LiffTokenVerificationService,
  ) {}

  async verifyLiffToken(accessToken: string): Promise<LiffVerifyResult> {
    const token = LiffAccessToken.create(accessToken);
    const result = await this.liffVerificationService.verify(token);
    return {
      lineUserId: result.lineUserId,
      displayName: result.displayName,
    };
  }
}
