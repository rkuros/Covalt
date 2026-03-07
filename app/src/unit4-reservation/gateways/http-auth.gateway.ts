import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGateway, AuthResult } from '../domain/AuthGateway';

@Injectable()
export class HttpAuthGateway implements AuthGateway {
  private readonly logger = new Logger(HttpAuthGateway.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'INTERNAL_API_BASE_URL',
      'http://localhost:3000',
    );
  }

  async verifyToken(token: string): Promise<AuthResult> {
    const url = `${this.baseUrl}/api/auth/verify`;
    this.logger.debug(`POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `AuthGateway.verifyToken failed: ${response.status} ${body}`,
      );
    }

    return (await response.json()) as AuthResult;
  }
}
