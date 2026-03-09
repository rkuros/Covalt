import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthenticationService } from '../domain/AuthenticationService';
import {
  TokenVerificationService,
  AuthVerificationError,
} from '../domain/TokenVerificationService';
import { PasswordResetService } from '../domain/PasswordResetService';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly tokenVerificationService: TokenVerificationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /**
   * POST /api/auth/verify
   * Bearer トークンを受け取り、セッション検証を行う (PACT 契約準拠)。
   */
  @Post('verify')
  @HttpCode(200)
  async verify(@Headers('authorization') authorization: string) {
    const token = this.extractBearerToken(authorization);
    if (!token) {
      throw new HttpException(
        { error: 'UNAUTHORIZED', message: '認証トークンが無効です' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const result = await this.tokenVerificationService.verify(token);
      return result;
    } catch (error) {
      if (error instanceof AuthVerificationError) {
        if (error.errorCode === 'ACCOUNT_DISABLED') {
          throw new HttpException(
            {
              error: 'ACCOUNT_DISABLED',
              message: 'アカウントが無効化されています',
            },
            HttpStatus.FORBIDDEN,
          );
        }
        throw new HttpException(
          { error: 'UNAUTHORIZED', message: '認証トークンが無効です' },
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw new HttpException(
        { error: 'UNAUTHORIZED', message: '認証トークンが無効です' },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * POST /api/auth/login
   * email + password でログインし、セッショントークンを返す。
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new HttpException(
        {
          error: 'VALIDATION_ERROR',
          message: 'email and password are required',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const session = await this.authenticationService.login(
        body.email,
        body.password,
      );
      return {
        token: session.token.value,
        expiresAt: session.expiresAt.toISOString(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '認証に失敗しました';

      if (message === 'アカウントが無効化されています') {
        throw new HttpException(
          { error: 'ACCOUNT_DISABLED', message },
          HttpStatus.FORBIDDEN,
        );
      }

      throw new HttpException(
        { error: 'UNAUTHORIZED', message },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * POST /api/auth/logout
   * セッションを無効化する。
   */
  @Post('logout')
  @HttpCode(200)
  async logout(@Headers('authorization') authorization: string) {
    const token = this.extractBearerToken(authorization);
    if (!token) {
      throw new HttpException(
        { error: 'UNAUTHORIZED', message: '認証トークンが無効です' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.authenticationService.logout(token);
    return { message: 'ログアウトしました' };
  }

  /**
   * POST /api/auth/password-reset/request
   * パスワードリセットトークンを発行し、メール送信する。
   */
  @Post('password-reset/request')
  @HttpCode(200)
  async requestPasswordReset(@Body() body: { email: string }) {
    await this.passwordResetService.requestReset(body.email);
    return { message: 'パスワードリセットメールを送信しました' };
  }

  /**
   * POST /api/auth/password-reset/confirm
   * リセットトークン + 新パスワードでパスワードを変更する。
   */
  @Post('password-reset/confirm')
  @HttpCode(200)
  async confirmPasswordReset(
    @Body() body: { token: string; newPassword: string },
  ) {
    try {
      await this.passwordResetService.resetPassword(
        body.token,
        body.newPassword,
      );
      return { message: 'パスワードが変更されました' };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'パスワードリセットに失敗しました';
      throw new HttpException(
        { error: 'BAD_REQUEST', message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private extractBearerToken(authorization: string | undefined): string | null {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null;
    }
    return authorization.slice(7);
  }
}
