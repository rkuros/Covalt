import { CalendarId } from './CalendarId';
import { OAuthToken } from './OAuthToken';

/**
 * 連携状態を表す型。
 * - active: 連携が有効で同期が動作する
 * - inactive: 連携が無効（初期状態・解除済み）
 * - requires_reauth: トークン無効化により再認証が必要
 */
export type IntegrationStatus = 'active' | 'inactive' | 'requires_reauth';

/**
 * エンティティ: GoogleCalendarIntegration
 *
 * オーナーごとの Google カレンダー連携設定を管理する。
 * OAuth 認証情報・対象カレンダー ID・連携状態（有効/無効）を保持する。
 */
export class GoogleCalendarIntegration {
  readonly id: string;
  readonly ownerId: string;
  private _oauthToken: OAuthToken | null;
  private _calendarId: CalendarId | null;
  private _status: IntegrationStatus;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    ownerId: string,
    oauthToken: OAuthToken | null,
    calendarId: CalendarId | null,
    status: IntegrationStatus,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.ownerId = ownerId;
    this._oauthToken = oauthToken;
    this._calendarId = calendarId;
    this._status = status;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get oauthToken(): OAuthToken | null {
    return this._oauthToken;
  }

  get calendarId(): CalendarId | null {
    return this._calendarId;
  }

  get status(): IntegrationStatus {
    return this._status;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * ファクトリメソッド: 新しい連携設定を生成する（初期状態は inactive）。
   */
  static create(ownerId: string): GoogleCalendarIntegration {
    if (!ownerId) {
      throw new Error('ownerId は必須です');
    }
    const now = new Date();
    return new GoogleCalendarIntegration(
      crypto.randomUUID(),
      ownerId,
      null,
      null,
      'inactive',
      now,
      now,
    );
  }

  /**
   * 永続化データから復元するファクトリメソッド。
   */
  static reconstruct(
    id: string,
    ownerId: string,
    oauthToken: OAuthToken | null,
    calendarId: CalendarId | null,
    status: IntegrationStatus,
    createdAt: Date,
    updatedAt: Date,
  ): GoogleCalendarIntegration {
    return new GoogleCalendarIntegration(id, ownerId, oauthToken, calendarId, status, createdAt, updatedAt);
  }

  /**
   * 連携が有効（同期可能）かどうかを判定する。
   * BR-2.5: 連携が無効のオーナーに対するイベントは処理をスキップする。
   */
  isActive(): boolean {
    return this._status === 'active' && this._oauthToken !== null && this._calendarId !== null;
  }

  /**
   * BR-1.1: OAuth 認証完了時にトークンを設定する。
   */
  setOAuthToken(token: OAuthToken): void {
    this._oauthToken = token;
    this._updatedAt = new Date();
  }

  /**
   * BR-1.2: 連携先カレンダーを選択し、連携を有効化する。
   */
  selectCalendar(calendarId: CalendarId): void {
    if (!this._oauthToken) {
      throw new Error('OAuth 認証が完了していないためカレンダーを選択できません');
    }
    this._calendarId = calendarId;
    this._status = 'active';
    this._updatedAt = new Date();
  }

  /**
   * BR-1.3: 連携を解除する。OAuthToken を無効化・削除する。
   */
  deactivate(): void {
    this._oauthToken = null;
    this._calendarId = null;
    this._status = 'inactive';
    this._updatedAt = new Date();
  }

  /**
   * リフレッシュトークン無効化時に再認証状態へ遷移させる。
   */
  markRequiresReauth(): void {
    this._status = 'requires_reauth';
    this._updatedAt = new Date();
  }

  /**
   * アクセストークンをリフレッシュした結果で更新する。
   */
  updateOAuthToken(newToken: OAuthToken): void {
    this._oauthToken = newToken;
    this._updatedAt = new Date();
  }
}
