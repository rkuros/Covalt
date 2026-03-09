/**
 * 値オブジェクト: AccountStatus
 * アカウントの有効/無効状態を型安全に表現する。
 */
export class AccountStatus {
  static readonly ACTIVE = new AccountStatus('ACTIVE');
  static readonly DISABLED = new AccountStatus('DISABLED');

  readonly value: 'ACTIVE' | 'DISABLED';

  private constructor(value: 'ACTIVE' | 'DISABLED') {
    this.value = value;
  }

  static create(value: string): AccountStatus {
    if (value === 'ACTIVE') return AccountStatus.ACTIVE;
    if (value === 'DISABLED') return AccountStatus.DISABLED;
    throw new Error(`不正なアカウントステータスです: ${value}`);
  }

  isActive(): boolean {
    return this.value === 'ACTIVE';
  }

  equals(other: AccountStatus): boolean {
    return this.value === other.value;
  }
}
