import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';

/**
 * リポジトリインターフェース: GoogleCalendarIntegrationRepository
 *
 * GoogleCalendarIntegration エンティティの永続化を担う。
 */
export interface GoogleCalendarIntegrationRepository {
  /**
   * ID で連携設定を取得する。
   */
  findById(id: string): Promise<GoogleCalendarIntegration | null>;

  /**
   * オーナー ID で連携設定を取得する。
   */
  findByOwnerId(ownerId: string): Promise<GoogleCalendarIntegration | null>;

  /**
   * 連携設定を保存（新規作成・更新）する。
   */
  save(integration: GoogleCalendarIntegration): Promise<void>;

  /**
   * 連携設定を削除する。
   */
  delete(id: string): Promise<void>;
}
