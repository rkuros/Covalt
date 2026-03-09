import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';
import { GoogleCalendarIntegrationRepository } from './GoogleCalendarIntegrationRepository';

/**
 * インメモリ実装: GoogleCalendarIntegrationRepository
 *
 * テスト・開発用のインメモリリポジトリ。
 */
export class InMemoryGoogleCalendarIntegrationRepository implements GoogleCalendarIntegrationRepository {
  private readonly store = new Map<string, GoogleCalendarIntegration>();

  async findById(id: string): Promise<GoogleCalendarIntegration | null> {
    return this.store.get(id) ?? null;
  }

  async findByOwnerId(
    ownerId: string,
  ): Promise<GoogleCalendarIntegration | null> {
    for (const integration of this.store.values()) {
      if (integration.ownerId === ownerId) {
        return integration;
      }
    }
    return null;
  }

  async save(integration: GoogleCalendarIntegration): Promise<void> {
    this.store.set(integration.id, integration);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
