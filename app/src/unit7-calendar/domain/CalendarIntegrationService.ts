import { CalendarId } from './CalendarId';
import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';
import { GoogleCalendarIntegrationRepository } from './GoogleCalendarIntegrationRepository';
import {
  GoogleCalendarApiClient,
  CalendarListEntry,
} from './GoogleCalendarApiClient';
import { GoogleOAuthService } from './GoogleOAuthService';

/**
 * サービス: CalendarIntegrationService
 *
 * 連携設定のライフサイクル管理を担う。
 * 連携開始（OAuth認証）・カレンダー選択・連携解除を提供する。
 */
export class CalendarIntegrationService {
  constructor(
    private readonly integrationRepository: GoogleCalendarIntegrationRepository,
    private readonly oauthService: GoogleOAuthService,
    private readonly calendarApiClient: GoogleCalendarApiClient,
  ) {}

  /**
   * BR-1.1: OAuth 認証を開始するための認可 URL を生成する。
   * まだ連携設定がないオーナーには新規エンティティを作成する。
   */
  async startOAuthFlow(
    ownerId: string,
  ): Promise<{ authorizationUrl: string; integrationId: string }> {
    let integration = await this.integrationRepository.findByOwnerId(ownerId);
    if (!integration) {
      integration = GoogleCalendarIntegration.create(ownerId);
      await this.integrationRepository.save(integration);
    }

    const authorizationUrl = this.oauthService.buildAuthorizationUrl(
      integration.id,
    );
    return { authorizationUrl, integrationId: integration.id };
  }

  /**
   * OAuth 認可コード受信後、トークンを取得して連携設定に保存する。
   */
  async completeOAuthFlow(
    integrationId: string,
    authorizationCode: string,
  ): Promise<void> {
    const integration =
      await this.integrationRepository.findById(integrationId);
    if (!integration) {
      throw new Error(`連携設定が見つかりません: ${integrationId}`);
    }

    const token =
      await this.oauthService.exchangeAuthorizationCode(authorizationCode);
    integration.setOAuthToken(token);
    await this.integrationRepository.save(integration);
  }

  /**
   * BR-1.2: オーナーが利用可能なカレンダー一覧を取得する。
   */
  async listCalendars(ownerId: string): Promise<CalendarListEntry[]> {
    const integration = await this.getIntegrationWithValidToken(ownerId);
    return this.calendarApiClient.listCalendars(
      integration.oauthToken!.accessToken,
    );
  }

  /**
   * BR-1.2: 連携先カレンダーを選択して連携を有効化する。
   */
  async selectCalendar(
    ownerId: string,
    calendarIdValue: string,
  ): Promise<void> {
    const integration = await this.getIntegrationWithValidToken(ownerId);
    const calendarId = CalendarId.create(calendarIdValue);
    integration.selectCalendar(calendarId);
    await this.integrationRepository.save(integration);
  }

  /**
   * BR-1.3: 連携を解除する。OAuth トークンを無効化・削除する。
   */
  async deactivateIntegration(ownerId: string): Promise<void> {
    const integration = await this.integrationRepository.findByOwnerId(ownerId);
    if (!integration) {
      throw new Error(`オーナー ${ownerId} の連携設定が見つかりません`);
    }

    integration.deactivate();
    await this.integrationRepository.save(integration);
  }

  /**
   * オーナーの連携設定を取得し、トークンが期限切れの場合はリフレッシュする。
   */
  private async getIntegrationWithValidToken(
    ownerId: string,
  ): Promise<GoogleCalendarIntegration> {
    const integration = await this.integrationRepository.findByOwnerId(ownerId);
    if (!integration) {
      throw new Error(`オーナー ${ownerId} の連携設定が見つかりません`);
    }
    if (!integration.oauthToken) {
      throw new Error('OAuth 認証が完了していません');
    }

    if (integration.oauthToken.needsRefresh()) {
      try {
        const refreshedToken = await this.oauthService.refreshToken(
          integration.oauthToken,
        );
        integration.updateOAuthToken(refreshedToken);
        await this.integrationRepository.save(integration);
      } catch {
        integration.markRequiresReauth();
        await this.integrationRepository.save(integration);
        throw new Error(
          'トークンのリフレッシュに失敗しました。再認証が必要です。',
        );
      }
    }

    return integration;
  }
}
