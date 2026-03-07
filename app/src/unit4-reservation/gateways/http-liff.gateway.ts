import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LiffGateway, LiffVerifyResult } from '../domain/LiffGateway';

@Injectable()
export class HttpLiffGateway implements LiffGateway {
  private readonly logger = new Logger(HttpLiffGateway.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'INTERNAL_API_BASE_URL',
      'http://localhost:3000',
    );
  }

  async verifyLiffToken(accessToken: string): Promise<LiffVerifyResult> {
    const url = `${this.baseUrl}/api/line/liff/verify`;
    this.logger.debug(`POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `LiffGateway.verifyLiffToken failed: ${response.status} ${body}`,
      );
    }

    return (await response.json()) as LiffVerifyResult;
  }
}
