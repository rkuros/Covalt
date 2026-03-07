import { LiffAccessToken } from "./LiffAccessToken";
import { LiffVerificationGateway, LiffVerificationResult } from "./LiffVerificationGateway";
import { InvalidLiffTokenError } from "./DomainErrors";

/**
 * LIFF アクセストークンを LINE Platform に問い合わせて検証し、
 * 対応する lineUserId と displayName を返却するドメインサービス。
 * Pact: A2 (Unit 4 -> Unit 2)
 */
export class LiffTokenVerificationService {
  constructor(
    private readonly liffVerificationGateway: LiffVerificationGateway,
  ) {}

  async verify(accessToken: LiffAccessToken): Promise<LiffVerificationResult> {
    try {
      return await this.liffVerificationGateway.verify(accessToken.value);
    } catch (error) {
      if (error instanceof InvalidLiffTokenError) {
        throw error;
      }
      throw new InvalidLiffTokenError();
    }
  }
}
